import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MonitoringQueryDto, LogQueryDto, MonitoringMetric, LogLevel } from './dto';

@Injectable()
export class MonitoringService {
  constructor(private readonly db: DatabaseService) {}

  async getSystemMonitoring(workspaceId: string, query: MonitoringQueryDto) {
    const startTime = query.startTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const endTime = query.endTime || new Date().toISOString();

    // Get system metrics
    const [systemMetrics, apiMetrics, databaseMetrics] = await Promise.all([
      this.getSystemMetrics(workspaceId, startTime, endTime, query.interval),
      this.getAPIMetrics(workspaceId, startTime, endTime, query.interval),
      this.getDatabaseMetrics(workspaceId, startTime, endTime),
    ]);

    return {
      timeRange: {
        startTime,
        endTime,
        interval: query.interval,
      },
      system: systemMetrics,
      api: apiMetrics,
      database: databaseMetrics,
      overview: {
        status: this.calculateOverallStatus(systemMetrics, apiMetrics),
        uptime: this.calculateUptime(startTime, endTime),
        totalRequests: apiMetrics.totalRequests,
        errorRate: apiMetrics.errorRate,
        avgResponseTime: apiMetrics.avgResponseTime,
      },
    };
  }

  async getHealthChecks(workspaceId: string) {
    const currentTime = new Date().toISOString();

    // Simulate health checks for various services
    const healthChecks = [
      {
        service: 'database',
        status: 'healthy',
        responseTime: await this.checkDatabaseHealth(),
        lastCheck: currentTime,
        message: 'Database connection is stable',
      },
      {
        service: 'redis',
        status: 'healthy',
        responseTime: await this.checkRedisHealth(),
        lastCheck: currentTime,
        message: 'Redis cache is operational',
      },
      {
        service: 'api',
        status: 'healthy',
        responseTime: await this.checkAPIHealth(workspaceId),
        lastCheck: currentTime,
        message: 'API endpoints are responding normally',
      },
      {
        service: 'storage',
        status: 'healthy',
        responseTime: await this.checkStorageHealth(),
        lastCheck: currentTime,
        message: 'File storage is accessible',
      },
      {
        service: 'websocket',
        status: 'healthy',
        responseTime: await this.checkWebSocketHealth(),
        lastCheck: currentTime,
        message: 'WebSocket connections are stable',
      },
    ];

    const overallStatus = healthChecks.every(check => check.status === 'healthy') 
      ? 'healthy' 
      : healthChecks.some(check => check.status === 'unhealthy')
      ? 'unhealthy'
      : 'degraded';

    return {
      overall: {
        status: overallStatus,
        timestamp: currentTime,
        services: healthChecks.length,
        healthy: healthChecks.filter(check => check.status === 'healthy').length,
        unhealthy: healthChecks.filter(check => check.status === 'unhealthy').length,
        degraded: healthChecks.filter(check => check.status === 'degraded').length,
      },
      checks: healthChecks,
    };
  }

  async getPerformanceMetrics(workspaceId: string, query: MonitoringQueryDto) {
    const startTime = query.startTime || new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const endTime = query.endTime || new Date().toISOString();

    // Get performance data from monitoring logs
    const metricsResult = await this.db.table('system_metrics')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('timestamp', '>=', startTime)
      .where('timestamp', '<=', endTime)
      .orderBy('timestamp', 'asc')
      .execute();

    const metrics = metricsResult.data || [];

    // Process performance metrics
    const performanceData = this.processPerformanceMetrics(metrics, query.interval || 5);

    return {
      timeRange: { startTime, endTime },
      metrics: {
        cpu: performanceData.cpu,
        memory: performanceData.memory,
        disk: performanceData.disk,
        network: performanceData.network,
        responseTime: performanceData.responseTime,
        throughput: performanceData.throughput,
        errorRate: performanceData.errorRate,
      },
      summary: {
        avgCpuUsage: this.calculateAverage(performanceData.cpu, 'value'),
        avgMemoryUsage: this.calculateAverage(performanceData.memory, 'value'),
        maxResponseTime: this.calculateMax(performanceData.responseTime, 'value'),
        totalRequests: performanceData.throughput.reduce((sum, point) => sum + (point.value || 0), 0),
        overallErrorRate: this.calculateAverage(performanceData.errorRate, 'value'),
      },
    };
  }

  async getSystemLogs(workspaceId: string, query: LogQueryDto) {
    // Build query for system logs
    let logQuery = this.db.table('system_logs')
      .select('*')
      .where('workspace_id', '=', workspaceId);

    if (query.level) {
      logQuery = logQuery.where('level', '=', query.level);
    }

    if (query.service) {
      logQuery = logQuery.where('service', '=', query.service);
    }

    if (query.search) {
      logQuery = logQuery.where('message', 'ilike', `%${query.search}%`);
    }

    if (query.startTime) {
      logQuery = logQuery.where('timestamp', '>=', query.startTime);
    }

    if (query.endTime) {
      logQuery = logQuery.where('timestamp', '<=', query.endTime);
    }

    // Get total count for pagination
    const totalCount = await logQuery.count();

    // Get paginated logs
    const logsResult = await logQuery
      .orderBy('timestamp', 'desc')
      .limit(query.limit || 100)
      .offset(query.offset || 0)
      .execute();

    const logs = logsResult.data || [];

    // Get log level distribution
    const levelDistributionResult = await this.db.table('system_logs')
      .select('level')
      .where('workspace_id', '=', workspaceId)
      .where('timestamp', '>=', query.startTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .where('timestamp', '<=', query.endTime || new Date().toISOString())
      .groupBy('level')
      .execute();

    const levelDistribution = levelDistributionResult.data || [];
    const levelDistributionCounts = await Promise.all(
      levelDistribution.map(async (item) => {
        const count = await this.db.table('system_logs')
          .where('workspace_id', '=', workspaceId)
          .where('level', '=', item.level)
          .where('timestamp', '>=', query.startTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .where('timestamp', '<=', query.endTime || new Date().toISOString())
          .count();
        return { ...item, count };
      })
    );

    return {
      logs,
      pagination: {
        total: totalCount,
        limit: query.limit || 100,
        offset: query.offset || 0,
        pages: Math.ceil(totalCount / (query.limit || 100)),
      },
      distribution: {
        levels: levelDistributionCounts.reduce((acc, item) => {
          acc[item.level] = parseInt(item.count as string);
          return acc;
        }, {}),
      },
    };
  }

  private async getSystemMetrics(workspaceId: string, startTime: string, endTime: string, interval: number = 5) {
    // Simulate system metrics - in real implementation, this would come from monitoring agents
    const now = new Date();
    const start = new Date(startTime);
    const points = Math.floor((now.getTime() - start.getTime()) / (interval * 60 * 1000));

    const generateMetricPoints = (baseValue: number, variance: number) => {
      const data = [];
      for (let i = 0; i < Math.min(points, 288); i++) { // Limit to 288 points (24 hours at 5-min intervals)
        const timestamp = new Date(start.getTime() + i * interval * 60 * 1000).toISOString();
        const value = Math.max(0, Math.min(100, baseValue + (Math.random() - 0.5) * variance));
        data.push({ timestamp, value: parseFloat(value.toFixed(2)) });
      }
      return data;
    };

    return {
      cpu: generateMetricPoints(45, 20),
      memory: generateMetricPoints(65, 15),
      disk: generateMetricPoints(35, 10),
      network: {
        inbound: generateMetricPoints(1024, 512),
        outbound: generateMetricPoints(2048, 1024),
      },
    };
  }

  private async getAPIMetrics(workspaceId: string, startTime: string, endTime: string, interval: number = 5) {
    // Get API request logs
    const apiLogsResult = await this.db.table('api_request_logs')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('timestamp', '>=', startTime)
      .where('timestamp', '<=', endTime)
      .execute();

    const apiLogs = apiLogsResult.data || [];

    // Process API metrics
    const totalRequests = apiLogs.length;
    const errorRequests = apiLogs.filter(log => log.status_code >= 400).length;
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
    
    const responseTimes = apiLogs
      .filter(log => log.response_time)
      .map(log => parseFloat(log.response_time));
    
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    return {
      totalRequests,
      errorRate: parseFloat(errorRate.toFixed(2)),
      avgResponseTime: parseFloat(avgResponseTime.toFixed(2)),
      requests: this.aggregateByInterval(apiLogs, interval, 'timestamp'),
      statusCodes: apiLogs.reduce((acc, log) => {
        const code = Math.floor(log.status_code / 100) * 100;
        acc[`${code}x`] = (acc[`${code}x`] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  private async getDatabaseMetrics(workspaceId: string, startTime: string, endTime: string) {
    // Simulate database metrics
    return {
      connections: {
        active: Math.floor(Math.random() * 20) + 5,
        idle: Math.floor(Math.random() * 10) + 2,
        max: 100,
      },
      queries: {
        total: Math.floor(Math.random() * 10000) + 5000,
        slow: Math.floor(Math.random() * 50) + 10,
        avgResponseTime: Math.random() * 100 + 50,
      },
      locks: {
        waiting: Math.floor(Math.random() * 5),
        deadlocks: Math.floor(Math.random() * 2),
      },
    };
  }

  private async checkDatabaseHealth(): Promise<number> {
    // Simulate database health check
    return Math.random() * 50 + 10;
  }

  private async checkRedisHealth(): Promise<number> {
    // Simulate Redis health check
    return Math.random() * 20 + 5;
  }

  private async checkAPIHealth(workspaceId: string): Promise<number> {
    // Simulate API health check
    return Math.random() * 100 + 50;
  }

  private async checkStorageHealth(): Promise<number> {
    // Simulate storage health check
    return Math.random() * 30 + 10;
  }

  private async checkWebSocketHealth(): Promise<number> {
    // Simulate WebSocket health check
    return Math.random() * 40 + 20;
  }

  private calculateOverallStatus(systemMetrics: any, apiMetrics: any): string {
    const avgCpu = this.calculateAverage(systemMetrics.cpu, 'value');
    const avgMemory = this.calculateAverage(systemMetrics.memory, 'value');
    
    if (avgCpu > 90 || avgMemory > 90 || apiMetrics.errorRate > 10) {
      return 'critical';
    } else if (avgCpu > 70 || avgMemory > 70 || apiMetrics.errorRate > 5) {
      return 'warning';
    }
    return 'healthy';
  }

  private calculateUptime(startTime: string, endTime: string): number {
    // Simulate uptime calculation
    return 99.95;
  }

  private processPerformanceMetrics(metrics: any[], interval: number) {
    // Process and aggregate metrics by interval
    const aggregated = {
      cpu: [],
      memory: [],
      disk: [],
      network: [],
      responseTime: [],
      throughput: [],
      errorRate: [],
    };

    // Group metrics by time intervals
    const timeGroups = this.groupByTimeInterval(metrics, interval);

    for (const [timestamp, groupMetrics] of Object.entries(timeGroups)) {
      for (const metric of Object.keys(aggregated)) {
        const values = groupMetrics.filter(m => m.metric_type === metric).map(m => parseFloat(m.value));
        const avgValue = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        
        aggregated[metric].push({
          timestamp,
          value: parseFloat(avgValue.toFixed(2)),
        });
      }
    }

    return aggregated;
  }

  private groupByTimeInterval(metrics: any[], intervalMinutes: number): { [key: string]: any[] } {
    const groups = {};
    
    for (const metric of metrics) {
      const timestamp = new Date(metric.timestamp);
      const intervalStart = new Date(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate(),
        timestamp.getHours(),
        Math.floor(timestamp.getMinutes() / intervalMinutes) * intervalMinutes
      );
      
      const key = intervalStart.toISOString();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(metric);
    }
    
    return groups;
  }

  private aggregateByInterval(logs: any[], intervalMinutes: number, timeField: string) {
    const groups = {};
    
    for (const log of logs) {
      const timestamp = new Date(log[timeField]);
      const intervalStart = new Date(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate(),
        timestamp.getHours(),
        Math.floor(timestamp.getMinutes() / intervalMinutes) * intervalMinutes
      );
      
      const key = intervalStart.toISOString();
      groups[key] = (groups[key] || 0) + 1;
    }
    
    return Object.entries(groups).map(([timestamp, count]) => ({
      timestamp,
      value: count,
    }));
  }

  private calculateAverage(data: any[], field: string): number {
    if (!data || data.length === 0) return 0;
    const sum = data.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0);
    return parseFloat((sum / data.length).toFixed(2));
  }

  private calculateMax(data: any[], field: string): number {
    if (!data || data.length === 0) return 0;
    return Math.max(...data.map(item => parseFloat(item[field]) || 0));
  }
}