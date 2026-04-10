import { Pool } from 'pg';

/**
 * Chainable query builder that compiles to raw SQL.
 * Drop-in replacement for database's QueryBuilder pattern.
 *
 * Usage:
 *   const result = await db.table('users')
 *     .select('id, name, email')
 *     .where('is_active', '=', true)
 *     .orderBy('created_at', 'desc')
 *     .limit(10)
 *     .execute();
 */
export class QueryBuilder {
  private _table: string;
  private _pool: Pool;
  private _selectColumns: string = '*';
  private _whereClauses: string[] = [];
  private _whereValues: any[] = [];
  private _orderByClause: string = '';
  private _limitClause: string = '';
  private _offsetClause: string = '';
  private _operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private _insertData: Record<string, any> | null = null;
  private _updateData: Record<string, any> | null = null;
  private _returning: string = '';

  constructor(pool: Pool, tableName: string) {
    this._pool = pool;
    this._table = tableName;
  }

  select(columns: string): this {
    this._selectColumns = columns;
    this._operation = 'select';
    return this;
  }

  where(column: string, operator: string, value: any): this {
    this._whereValues.push(value);
    this._whereClauses.push(`"${column}" ${operator} $${this._whereValues.length}`);
    return this;
  }

  whereIn(column: string, values: any[]): this {
    const placeholders = values.map((_, i) => `$${this._whereValues.length + i + 1}`);
    this._whereValues.push(...values);
    this._whereClauses.push(`"${column}" IN (${placeholders.join(', ')})`);
    return this;
  }

  whereNotIn(column: string, values: any[]): this {
    const placeholders = values.map((_, i) => `$${this._whereValues.length + i + 1}`);
    this._whereValues.push(...values);
    this._whereClauses.push(`"${column}" NOT IN (${placeholders.join(', ')})`);
    return this;
  }

  isNull(column: string): this {
    this._whereClauses.push(`"${column}" IS NULL`);
    return this;
  }

  // Alias used by callers
  whereNull(column: string): this {
    return this.isNull(column);
  }

  whereNotNull(column: string): this {
    return this.isNotNull(column);
  }

  isNotNull(column: string): this {
    this._whereClauses.push(`"${column}" IS NOT NULL`);
    return this;
  }

  like(column: string, pattern: string): this {
    this._whereValues.push(pattern);
    this._whereClauses.push(`"${column}" ILIKE $${this._whereValues.length}`);
    return this;
  }

  // Alias for case-insensitive like
  ilike(column: string, pattern: string): this {
    return this.like(column, pattern);
  }

  // Get all results (alias for execute)
  async get(): Promise<{ data: any[]; count: number }> {
    return this.execute();
  }

  // Get first result
  async first(): Promise<any | null> {
    this.limit(1);
    const result = await this.execute();
    return result.data[0] || null;
  }

  orderBy(column: string, direction: string = 'asc'): this {
    this._orderByClause = ` ORDER BY "${column}" ${direction.toUpperCase()}`;
    return this;
  }

  limit(n: number): this {
    this._whereValues.push(n);
    this._limitClause = ` LIMIT $${this._whereValues.length}`;
    return this;
  }

  offset(n: number): this {
    this._whereValues.push(n);
    this._offsetClause = ` OFFSET $${this._whereValues.length}`;
    return this;
  }

  insert(data: Record<string, any>): this {
    this._operation = 'insert';
    this._insertData = data;
    return this;
  }

  update(data: Record<string, any>): this {
    this._operation = 'update';
    this._updateData = data;
    return this;
  }

  delete(): this {
    this._operation = 'delete';
    return this;
  }

  returning(columns: string): this {
    this._returning = columns;
    return this;
  }

  private buildWhereClause(): string {
    if (this._whereClauses.length === 0) return '';
    return ` WHERE ${this._whereClauses.join(' AND ')}`;
  }

  private buildSQL(): { sql: string; params: any[] } {
    const whereStr = this.buildWhereClause();

    switch (this._operation) {
      case 'select': {
        const sql = `SELECT ${this._selectColumns} FROM "${this._table}"${whereStr}${this._orderByClause}${this._limitClause}${this._offsetClause}`;
        return { sql, params: this._whereValues };
      }

      case 'insert': {
        const data = this._insertData!;
        const keys = Object.keys(data).filter((k) => data[k] !== undefined);
        const values = keys.map((k) => data[k]);
        const placeholders = keys.map((_, i) => `$${i + 1}`);
        const columns = keys.map((k) => `"${k}"`);
        const ret = this._returning ? ` RETURNING ${this._returning}` : ' RETURNING *';
        const sql = `INSERT INTO "${this._table}" (${columns.join(', ')}) VALUES (${placeholders.join(', ')})${ret}`;
        return { sql, params: values };
      }

      case 'update': {
        const data = this._updateData!;
        const keys = Object.keys(data).filter((k) => data[k] !== undefined);
        // Reindex: update SET params come first, then WHERE params
        const setValues = keys.map((k) => data[k]);
        const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);

        // Re-index where values
        const reindexedWhere = this._whereClauses.map((clause) => {
          return clause.replace(/\$(\d+)/g, (_, num) => `$${parseInt(num) + keys.length}`);
        });

        const whereReindexed = reindexedWhere.length > 0 ? ` WHERE ${reindexedWhere.join(' AND ')}` : '';
        const ret = this._returning ? ` RETURNING ${this._returning}` : ' RETURNING *';
        const sql = `UPDATE "${this._table}" SET ${setClauses.join(', ')}${whereReindexed}${ret}`;
        return { sql, params: [...setValues, ...this._whereValues] };
      }

      case 'delete': {
        const ret = this._returning ? ` RETURNING ${this._returning}` : '';
        const sql = `DELETE FROM "${this._table}"${whereStr}${ret}`;
        return { sql, params: this._whereValues };
      }

      default:
        throw new Error(`Unknown operation: ${this._operation}`);
    }
  }

  async execute(): Promise<{ data: any[]; count: number }> {
    const { sql, params } = this.buildSQL();
    const result = await this._pool.query(sql, params);
    return {
      data: result.rows,
      count: result.rowCount || 0,
    };
  }

  // Alias for execute
  async then(resolve: (value: { data: any[]; count: number }) => any, reject?: (reason: any) => any) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (error) {
      if (reject) reject(error);
      else throw error;
    }
  }
}
