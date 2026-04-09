/**
 * Research & Analysis Project Templates
 * Pre-built templates for market research, user research, and data analysis projects
 */

export const RESEARCH_TEMPLATES = [
  // ==================== 1. USER RESEARCH ====================
  {
    name: 'User Research Study',
    slug: 'user-research-study',
    description:
      'Comprehensive user research project from planning to insights delivery. Includes interviews, surveys, and usability testing.',
    category: 'research',
    icon: 'Users',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'recruiting', name: 'Recruiting', order: 1, color: '#3B82F6' },
      { id: 'conducting', name: 'Conducting', order: 2, color: '#F59E0B' },
      { id: 'analysis', name: 'Analysis', order: 3, color: '#8B5CF6' },
      { id: 'reporting', name: 'Reporting', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Research Method',
        type: 'multiselect',
        description: 'Methods to use',
        options: ['Interviews', 'Surveys', 'Usability Testing', 'Diary Study', 'Focus Groups', 'Card Sorting'],
        isRequired: true,
      },
      {
        name: 'Participant Count',
        type: 'number',
        description: 'Target number of participants',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Research Planning',
          description: 'Define research scope and approach',
          tasks: [
            {
              title: 'Define research objectives',
              description:
                'Clearly articulate what you want to learn.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'objectives'],
              subtasks: [
                { title: 'Identify business questions' },
                { title: 'Define research questions' },
                { title: 'Set success criteria' },
              ],
            },
            {
              title: 'Choose research methods',
              description:
                'Select appropriate research methodologies.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'methodology'],
            },
            {
              title: 'Create research plan',
              description:
                'Document detailed research plan and timeline.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['planning', 'documentation'],
            },
            {
              title: 'Define participant criteria',
              description:
                'Create screener and selection criteria.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['planning', 'recruiting'],
            },
            {
              title: 'Create discussion guide',
              description:
                'Develop interview or test script.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['planning', 'guide'],
            },
          ],
        },
        {
          name: 'Participant Recruiting',
          description: 'Find and schedule participants',
          tasks: [
            {
              title: 'Create screener survey',
              description:
                'Build screening questionnaire.',
              assigneeRole: 'member',
              dueOffset: 8,
              priority: 'high',
              labels: ['recruiting', 'screener'],
            },
            {
              title: 'Source participants',
              description:
                'Recruit through panels, customers, or outreach.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['recruiting', 'sourcing'],
            },
            {
              title: 'Screen and select',
              description:
                'Review screener responses and select participants.',
              assigneeRole: 'member',
              dueOffset: 18,
              priority: 'high',
              labels: ['recruiting', 'selection'],
            },
            {
              title: 'Schedule sessions',
              description:
                'Book sessions with selected participants.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['recruiting', 'scheduling'],
            },
            {
              title: 'Send confirmations',
              description:
                'Send session details and reminders.',
              assigneeRole: 'member',
              dueOffset: 22,
              priority: 'medium',
              labels: ['recruiting', 'communication'],
            },
          ],
        },
        {
          name: 'Conducting Research',
          description: 'Run research sessions',
          tasks: [
            {
              title: 'Pilot session',
              description:
                'Run pilot to test guide and setup.',
              assigneeRole: 'lead',
              dueOffset: 24,
              priority: 'high',
              labels: ['research', 'pilot'],
            },
            {
              title: 'Refine based on pilot',
              description:
                'Adjust approach based on pilot learnings.',
              assigneeRole: 'lead',
              dueOffset: 25,
              priority: 'high',
              labels: ['research', 'iteration'],
            },
            {
              title: 'Conduct research sessions',
              description:
                'Run interviews/tests with all participants.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'high',
              labels: ['research', 'sessions'],
            },
            {
              title: 'Take session notes',
              description:
                'Document observations during each session.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'high',
              labels: ['research', 'notes'],
            },
            {
              title: 'Send thank you and incentives',
              description:
                'Thank participants and send compensation.',
              assigneeRole: 'member',
              dueOffset: 36,
              priority: 'medium',
              labels: ['research', 'follow-up'],
            },
          ],
        },
        {
          name: 'Analysis',
          description: 'Analyze research data',
          tasks: [
            {
              title: 'Organize data',
              description:
                'Compile all notes, recordings, and artifacts.',
              assigneeRole: 'member',
              dueOffset: 38,
              priority: 'high',
              labels: ['analysis', 'organization'],
            },
            {
              title: 'Code and tag data',
              description:
                'Apply thematic coding to qualitative data.',
              assigneeRole: 'member',
              dueOffset: 42,
              priority: 'high',
              labels: ['analysis', 'coding'],
            },
            {
              title: 'Identify patterns',
              description:
                'Find themes, patterns, and insights.',
              assigneeRole: 'member',
              dueOffset: 45,
              priority: 'high',
              labels: ['analysis', 'patterns'],
            },
            {
              title: 'Affinity mapping',
              description:
                'Group insights using affinity diagram.',
              assigneeRole: 'member',
              dueOffset: 47,
              priority: 'medium',
              labels: ['analysis', 'synthesis'],
            },
            {
              title: 'Develop key insights',
              description:
                'Synthesize into actionable insights.',
              assigneeRole: 'lead',
              dueOffset: 50,
              priority: 'high',
              labels: ['analysis', 'insights'],
            },
          ],
        },
        {
          name: 'Reporting',
          description: 'Share findings',
          tasks: [
            {
              title: 'Create findings deck',
              description:
                'Build presentation with key findings.',
              assigneeRole: 'member',
              dueOffset: 55,
              priority: 'high',
              labels: ['reporting', 'presentation'],
            },
            {
              title: 'Write detailed report',
              description:
                'Document full research report.',
              assigneeRole: 'member',
              dueOffset: 58,
              priority: 'high',
              labels: ['reporting', 'documentation'],
            },
            {
              title: 'Create artifacts',
              description:
                'Build personas, journey maps, or other deliverables.',
              assigneeRole: 'member',
              dueOffset: 60,
              priority: 'medium',
              labels: ['reporting', 'artifacts'],
            },
            {
              title: 'Present to stakeholders',
              description:
                'Share findings with team and stakeholders.',
              assigneeRole: 'lead',
              dueOffset: 63,
              priority: 'high',
              labels: ['reporting', 'presentation'],
            },
            {
              title: 'Archive research',
              description:
                'Store research in repository for future reference.',
              assigneeRole: 'member',
              dueOffset: 65,
              priority: 'medium',
              labels: ['reporting', 'archive'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'recruiting', 'conducting', 'analysis', 'reporting'],
      },
    },
    settings: {
      participantTracking: true,
      incentiveManagement: true,
    },
  },

  // ==================== 2. MARKET RESEARCH ====================
  {
    name: 'Market Research',
    slug: 'market-research',
    description:
      'Comprehensive market research project template. Analyze market size, competition, and opportunities.',
    category: 'research',
    icon: 'TrendingUp',
    color: '#3B82F6',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'scoping', name: 'Scoping', order: 0, color: '#6B7280' },
      { id: 'research', name: 'Research', order: 1, color: '#3B82F6' },
      { id: 'analysis', name: 'Analysis', order: 2, color: '#F59E0B' },
      { id: 'insights', name: 'Insights', order: 3, color: '#8B5CF6' },
      { id: 'delivered', name: 'Delivered', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Industry',
        type: 'text',
        description: 'Industry or market being researched',
        isRequired: true,
      },
      {
        name: 'Geography',
        type: 'select',
        description: 'Geographic scope',
        options: ['Global', 'North America', 'Europe', 'APAC', 'Regional', 'Local'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Project Scoping',
          description: 'Define research scope',
          tasks: [
            {
              title: 'Define research questions',
              description:
                'Identify key questions to answer.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['scoping', 'planning'],
            },
            {
              title: 'Identify data sources',
              description:
                'Map primary and secondary data sources.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['scoping', 'sources'],
            },
            {
              title: 'Create research plan',
              description:
                'Document methodology and timeline.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['scoping', 'planning'],
            },
          ],
        },
        {
          name: 'Market Analysis',
          description: 'Research market dynamics',
          tasks: [
            {
              title: 'Market sizing',
              description:
                'Calculate TAM, SAM, SOM.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['research', 'sizing'],
              subtasks: [
                { title: 'Calculate Total Addressable Market' },
                { title: 'Calculate Serviceable Addressable Market' },
                { title: 'Calculate Serviceable Obtainable Market' },
              ],
            },
            {
              title: 'Industry trends analysis',
              description:
                'Research current and emerging trends.',
              assigneeRole: 'member',
              dueOffset: 15,
              priority: 'high',
              labels: ['research', 'trends'],
            },
            {
              title: 'Growth drivers and barriers',
              description:
                'Identify factors affecting market growth.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'high',
              labels: ['research', 'analysis'],
            },
            {
              title: 'Regulatory landscape',
              description:
                'Review relevant regulations and compliance.',
              assigneeRole: 'member',
              dueOffset: 18,
              priority: 'medium',
              labels: ['research', 'regulatory'],
            },
          ],
        },
        {
          name: 'Competitive Analysis',
          description: 'Analyze competition',
          tasks: [
            {
              title: 'Identify competitors',
              description:
                'Map direct and indirect competitors.',
              assigneeRole: 'member',
              dueOffset: 20,
              priority: 'high',
              labels: ['competitive', 'mapping'],
            },
            {
              title: 'Competitor profiling',
              description:
                'Deep dive into key competitors.',
              assigneeRole: 'member',
              dueOffset: 25,
              priority: 'high',
              labels: ['competitive', 'profiling'],
              subtasks: [
                { title: 'Business model analysis' },
                { title: 'Product/service comparison' },
                { title: 'Pricing analysis' },
                { title: 'Marketing strategy review' },
              ],
            },
            {
              title: 'Competitive positioning map',
              description:
                'Create visual positioning analysis.',
              assigneeRole: 'member',
              dueOffset: 27,
              priority: 'high',
              labels: ['competitive', 'positioning'],
            },
            {
              title: 'SWOT analysis',
              description:
                'Analyze strengths, weaknesses, opportunities, threats.',
              assigneeRole: 'lead',
              dueOffset: 28,
              priority: 'high',
              labels: ['competitive', 'swot'],
            },
          ],
        },
        {
          name: 'Customer Analysis',
          description: 'Understand target customers',
          tasks: [
            {
              title: 'Customer segmentation',
              description:
                'Define and profile customer segments.',
              assigneeRole: 'member',
              dueOffset: 30,
              priority: 'high',
              labels: ['customer', 'segmentation'],
            },
            {
              title: 'Buyer persona development',
              description:
                'Create detailed buyer personas.',
              assigneeRole: 'member',
              dueOffset: 33,
              priority: 'high',
              labels: ['customer', 'personas'],
            },
            {
              title: 'Customer needs analysis',
              description:
                'Identify key pain points and needs.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'high',
              labels: ['customer', 'needs'],
            },
          ],
        },
        {
          name: 'Synthesis & Reporting',
          description: 'Synthesize and deliver',
          tasks: [
            {
              title: 'Synthesize findings',
              description:
                'Combine all research into coherent insights.',
              assigneeRole: 'lead',
              dueOffset: 40,
              priority: 'high',
              labels: ['synthesis', 'insights'],
            },
            {
              title: 'Develop recommendations',
              description:
                'Create strategic recommendations.',
              assigneeRole: 'lead',
              dueOffset: 43,
              priority: 'high',
              labels: ['synthesis', 'recommendations'],
            },
            {
              title: 'Create report',
              description:
                'Write comprehensive market research report.',
              assigneeRole: 'member',
              dueOffset: 48,
              priority: 'high',
              labels: ['reporting', 'documentation'],
            },
            {
              title: 'Create executive summary',
              description:
                'Write concise executive summary.',
              assigneeRole: 'lead',
              dueOffset: 50,
              priority: 'high',
              labels: ['reporting', 'summary'],
            },
            {
              title: 'Present findings',
              description:
                'Present to stakeholders.',
              assigneeRole: 'lead',
              dueOffset: 52,
              priority: 'high',
              labels: ['reporting', 'presentation'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['scoping', 'research', 'analysis', 'insights', 'delivered'],
      },
    },
    settings: {
      dataVisualization: true,
      citationRequired: true,
    },
  },

  // ==================== 3. A/B TEST ====================
  {
    name: 'A/B Test',
    slug: 'ab-test',
    description:
      'Run rigorous A/B tests from hypothesis to statistical analysis. Perfect for product experiments.',
    category: 'research',
    icon: 'FlaskConical',
    color: '#10B981',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'hypothesis', name: 'Hypothesis', order: 0, color: '#6B7280' },
      { id: 'design', name: 'Design', order: 1, color: '#3B82F6' },
      { id: 'running', name: 'Running', order: 2, color: '#F59E0B' },
      { id: 'analysis', name: 'Analysis', order: 3, color: '#8B5CF6' },
      { id: 'decided', name: 'Decided', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Test Type',
        type: 'select',
        description: 'Type of test',
        options: ['A/B', 'A/B/n', 'Multivariate', 'Holdout'],
        isRequired: true,
      },
      {
        name: 'Primary Metric',
        type: 'text',
        description: 'Main success metric',
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Hypothesis Development',
          description: 'Define what you are testing',
          tasks: [
            {
              title: 'Define problem statement',
              description:
                'Clearly state what problem you are solving.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['hypothesis', 'planning'],
            },
            {
              title: 'Form hypothesis',
              description:
                'Write testable hypothesis statement.',
              assigneeRole: 'lead',
              dueOffset: 2,
              priority: 'high',
              labels: ['hypothesis', 'documentation'],
            },
            {
              title: 'Define success metrics',
              description:
                'Identify primary and guardrail metrics.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['hypothesis', 'metrics'],
            },
          ],
        },
        {
          name: 'Test Design',
          description: 'Design the experiment',
          tasks: [
            {
              title: 'Design variants',
              description:
                'Create control and treatment variants.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['design', 'variants'],
            },
            {
              title: 'Calculate sample size',
              description:
                'Determine required sample size for significance.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['design', 'statistics'],
            },
            {
              title: 'Define targeting',
              description:
                'Specify which users will be included.',
              assigneeRole: 'lead',
              dueOffset: 6,
              priority: 'high',
              labels: ['design', 'targeting'],
            },
            {
              title: 'Set up tracking',
              description:
                'Implement event tracking for metrics.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['design', 'tracking'],
            },
            {
              title: 'QA test setup',
              description:
                'Verify variants and tracking work correctly.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['design', 'qa'],
            },
          ],
        },
        {
          name: 'Running Test',
          description: 'Execute the experiment',
          tasks: [
            {
              title: 'Launch experiment',
              description:
                'Start the A/B test.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['execution', 'launch'],
            },
            {
              title: 'Monitor for issues',
              description:
                'Check for bugs or data issues.',
              assigneeRole: 'member',
              dueOffset: 15,
              priority: 'high',
              labels: ['execution', 'monitoring'],
            },
            {
              title: 'Check early metrics',
              description:
                'Verify data is flowing correctly.',
              assigneeRole: 'member',
              dueOffset: 16,
              priority: 'high',
              labels: ['execution', 'validation'],
            },
            {
              title: 'Weekly status check',
              description:
                'Review test progress and any concerns.',
              assigneeRole: 'lead',
              dueOffset: 21,
              priority: 'medium',
              labels: ['execution', 'monitoring'],
            },
          ],
        },
        {
          name: 'Analysis',
          description: 'Analyze results',
          tasks: [
            {
              title: 'Pull test results',
              description:
                'Export data at end of test period.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'high',
              labels: ['analysis', 'data'],
            },
            {
              title: 'Statistical analysis',
              description:
                'Run significance tests and analysis.',
              assigneeRole: 'member',
              dueOffset: 38,
              priority: 'high',
              labels: ['analysis', 'statistics'],
              subtasks: [
                { title: 'Calculate statistical significance' },
                { title: 'Check confidence intervals' },
                { title: 'Review guardrail metrics' },
              ],
            },
            {
              title: 'Segment analysis',
              description:
                'Analyze results by user segments.',
              assigneeRole: 'member',
              dueOffset: 40,
              priority: 'medium',
              labels: ['analysis', 'segmentation'],
            },
            {
              title: 'Document findings',
              description:
                'Write up analysis and conclusions.',
              assigneeRole: 'member',
              dueOffset: 42,
              priority: 'high',
              labels: ['analysis', 'documentation'],
            },
          ],
        },
        {
          name: 'Decision',
          description: 'Make decision and implement',
          tasks: [
            {
              title: 'Review with stakeholders',
              description:
                'Present results to decision makers.',
              assigneeRole: 'lead',
              dueOffset: 44,
              priority: 'high',
              labels: ['decision', 'review'],
            },
            {
              title: 'Make ship decision',
              description:
                'Decide whether to ship, iterate, or kill.',
              assigneeRole: 'lead',
              dueOffset: 45,
              priority: 'high',
              labels: ['decision', 'conclusion'],
            },
            {
              title: 'Implement decision',
              description:
                'Roll out winner or plan next steps.',
              assigneeRole: 'member',
              dueOffset: 50,
              priority: 'high',
              labels: ['decision', 'implementation'],
            },
            {
              title: 'Archive experiment',
              description:
                'Document learnings for future reference.',
              assigneeRole: 'member',
              dueOffset: 52,
              priority: 'medium',
              labels: ['decision', 'archive'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['hypothesis', 'design', 'running', 'analysis', 'decided'],
      },
    },
    settings: {
      statisticalRigor: true,
      experimentTracking: true,
    },
  },

  // ==================== 4. DATA ANALYSIS PROJECT ====================
  {
    name: 'Data Analysis Project',
    slug: 'data-analysis-project',
    description:
      'Structured data analysis project from question definition to actionable insights and visualization.',
    category: 'research',
    icon: 'BarChart2',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'framing', name: 'Framing', order: 0, color: '#6B7280' },
      { id: 'collection', name: 'Collection', order: 1, color: '#3B82F6' },
      { id: 'analysis', name: 'Analysis', order: 2, color: '#F59E0B' },
      { id: 'visualization', name: 'Visualization', order: 3, color: '#8B5CF6' },
      { id: 'delivery', name: 'Delivery', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Data Source',
        type: 'multiselect',
        description: 'Where data comes from',
        options: ['Database', 'API', 'CSV/Excel', 'Survey', 'Web Scraping', 'External'],
        isRequired: false,
      },
      {
        name: 'Analysis Type',
        type: 'select',
        description: 'Type of analysis',
        options: ['Descriptive', 'Diagnostic', 'Predictive', 'Prescriptive'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Problem Framing',
          description: 'Define the analysis question',
          tasks: [
            {
              title: 'Define business question',
              description:
                'Clearly state what decision this analysis supports.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['framing', 'planning'],
            },
            {
              title: 'Identify data requirements',
              description:
                'List what data is needed.',
              assigneeRole: 'member',
              dueOffset: 2,
              priority: 'high',
              labels: ['framing', 'requirements'],
            },
            {
              title: 'Define success criteria',
              description:
                'How will we know analysis is complete and useful?',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['framing', 'criteria'],
            },
          ],
        },
        {
          name: 'Data Collection',
          description: 'Gather and prepare data',
          tasks: [
            {
              title: 'Identify data sources',
              description:
                'Map where required data lives.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['collection', 'sources'],
            },
            {
              title: 'Extract data',
              description:
                'Pull data from identified sources.',
              assigneeRole: 'member',
              dueOffset: 8,
              priority: 'high',
              labels: ['collection', 'extraction'],
            },
            {
              title: 'Data cleaning',
              description:
                'Clean and prepare data for analysis.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['collection', 'cleaning'],
              subtasks: [
                { title: 'Handle missing values' },
                { title: 'Remove duplicates' },
                { title: 'Fix data types' },
                { title: 'Handle outliers' },
              ],
            },
            {
              title: 'Data validation',
              description:
                'Verify data quality and accuracy.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['collection', 'validation'],
            },
          ],
        },
        {
          name: 'Analysis',
          description: 'Analyze the data',
          tasks: [
            {
              title: 'Exploratory analysis',
              description:
                'Initial exploration and pattern finding.',
              assigneeRole: 'member',
              dueOffset: 18,
              priority: 'high',
              labels: ['analysis', 'exploration'],
            },
            {
              title: 'Core analysis',
              description:
                'Perform main analysis to answer questions.',
              assigneeRole: 'member',
              dueOffset: 25,
              priority: 'high',
              labels: ['analysis', 'core'],
            },
            {
              title: 'Statistical testing',
              description:
                'Run statistical tests if needed.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'medium',
              labels: ['analysis', 'statistics'],
            },
            {
              title: 'Validate findings',
              description:
                'Cross-check and validate results.',
              assigneeRole: 'member',
              dueOffset: 30,
              priority: 'high',
              labels: ['analysis', 'validation'],
            },
          ],
        },
        {
          name: 'Visualization & Reporting',
          description: 'Visualize and document',
          tasks: [
            {
              title: 'Create visualizations',
              description:
                'Build charts and graphs.',
              assigneeRole: 'member',
              dueOffset: 33,
              priority: 'high',
              labels: ['visualization', 'charts'],
            },
            {
              title: 'Build dashboard',
              description:
                'Create interactive dashboard if needed.',
              assigneeRole: 'member',
              dueOffset: 38,
              priority: 'medium',
              labels: ['visualization', 'dashboard'],
            },
            {
              title: 'Write analysis report',
              description:
                'Document methodology, findings, and recommendations.',
              assigneeRole: 'member',
              dueOffset: 40,
              priority: 'high',
              labels: ['reporting', 'documentation'],
            },
            {
              title: 'Create presentation',
              description:
                'Build presentation for stakeholders.',
              assigneeRole: 'member',
              dueOffset: 42,
              priority: 'high',
              labels: ['reporting', 'presentation'],
            },
          ],
        },
        {
          name: 'Delivery',
          description: 'Share and hand off',
          tasks: [
            {
              title: 'Present to stakeholders',
              description:
                'Present findings and recommendations.',
              assigneeRole: 'lead',
              dueOffset: 45,
              priority: 'high',
              labels: ['delivery', 'presentation'],
            },
            {
              title: 'Answer questions',
              description:
                'Address stakeholder questions.',
              assigneeRole: 'lead',
              dueOffset: 46,
              priority: 'high',
              labels: ['delivery', 'support'],
            },
            {
              title: 'Hand off deliverables',
              description:
                'Deliver reports, dashboards, and data.',
              assigneeRole: 'member',
              dueOffset: 48,
              priority: 'high',
              labels: ['delivery', 'handoff'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['framing', 'collection', 'analysis', 'visualization', 'delivery'],
      },
    },
    settings: {
      dataGovernance: true,
      reproducibility: true,
    },
  },

  // ==================== 5. COMPETITIVE ANALYSIS ====================
  {
    name: 'Competitive Analysis',
    slug: 'competitive-analysis',
    description:
      'In-depth competitive analysis project. Understand your competitive landscape and find strategic opportunities.',
    category: 'research',
    icon: 'Search',
    color: '#EC4899',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'research', name: 'Research', order: 1, color: '#3B82F6' },
      { id: 'analysis', name: 'Analysis', order: 2, color: '#F59E0B' },
      { id: 'strategy', name: 'Strategy', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Focus Area',
        type: 'select',
        description: 'Primary focus of analysis',
        options: ['Product', 'Pricing', 'Marketing', 'Sales', 'Full Business'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Scope and plan the analysis',
          tasks: [
            {
              title: 'Define analysis objectives',
              description:
                'What decisions will this analysis inform?',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'objectives'],
            },
            {
              title: 'Identify competitors',
              description:
                'List direct and indirect competitors.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'competitors'],
            },
            {
              title: 'Define comparison criteria',
              description:
                'Decide what dimensions to compare.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['planning', 'criteria'],
            },
          ],
        },
        {
          name: 'Research',
          description: 'Gather competitive intelligence',
          tasks: [
            {
              title: 'Website and product analysis',
              description:
                'Deep dive into competitor products.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['research', 'product'],
            },
            {
              title: 'Pricing research',
              description:
                'Analyze competitor pricing models.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['research', 'pricing'],
            },
            {
              title: 'Marketing analysis',
              description:
                'Study competitor marketing strategies.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['research', 'marketing'],
            },
            {
              title: 'Review competitor content',
              description:
                'Analyze blogs, social, and thought leadership.',
              assigneeRole: 'member',
              dueOffset: 16,
              priority: 'medium',
              labels: ['research', 'content'],
            },
            {
              title: 'Customer reviews analysis',
              description:
                'Review what customers say about competitors.',
              assigneeRole: 'member',
              dueOffset: 18,
              priority: 'high',
              labels: ['research', 'reviews'],
            },
          ],
        },
        {
          name: 'Analysis',
          description: 'Analyze and compare',
          tasks: [
            {
              title: 'Feature comparison matrix',
              description:
                'Create detailed feature comparison.',
              assigneeRole: 'member',
              dueOffset: 22,
              priority: 'high',
              labels: ['analysis', 'features'],
            },
            {
              title: 'Pricing comparison',
              description:
                'Build pricing comparison table.',
              assigneeRole: 'member',
              dueOffset: 24,
              priority: 'high',
              labels: ['analysis', 'pricing'],
            },
            {
              title: 'Positioning map',
              description:
                'Create competitive positioning diagram.',
              assigneeRole: 'member',
              dueOffset: 26,
              priority: 'high',
              labels: ['analysis', 'positioning'],
            },
            {
              title: 'Strengths and weaknesses',
              description:
                'Document competitor strengths and gaps.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['analysis', 'swot'],
            },
          ],
        },
        {
          name: 'Strategy Development',
          description: 'Develop strategic recommendations',
          tasks: [
            {
              title: 'Identify opportunities',
              description:
                'Find gaps and opportunities in market.',
              assigneeRole: 'lead',
              dueOffset: 32,
              priority: 'high',
              labels: ['strategy', 'opportunities'],
            },
            {
              title: 'Develop recommendations',
              description:
                'Create strategic recommendations.',
              assigneeRole: 'lead',
              dueOffset: 35,
              priority: 'high',
              labels: ['strategy', 'recommendations'],
            },
            {
              title: 'Create battle cards',
              description:
                'Build sales battle cards vs competitors.',
              assigneeRole: 'member',
              dueOffset: 38,
              priority: 'medium',
              labels: ['strategy', 'sales-enablement'],
            },
            {
              title: 'Final report',
              description:
                'Compile comprehensive competitive analysis report.',
              assigneeRole: 'member',
              dueOffset: 42,
              priority: 'high',
              labels: ['strategy', 'reporting'],
            },
            {
              title: 'Present findings',
              description:
                'Share analysis with stakeholders.',
              assigneeRole: 'lead',
              dueOffset: 45,
              priority: 'high',
              labels: ['strategy', 'presentation'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'research', 'analysis', 'strategy', 'completed'],
      },
    },
    settings: {
      regularUpdates: true,
      salesEnablement: true,
    },
  },

  // ==================== 6. RESEARCH PROJECT PLANNING ====================
  {
    name: 'Research Project Planning',
    slug: 'research-project-planning',
    description:
      'Plan and organize a comprehensive research project from conception to execution with clear milestones and deliverables.',
    category: 'research',
    icon: 'ClipboardList',
    color: '#6366F1',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'ideation', name: 'Ideation', order: 0, color: '#6B7280' },
      { id: 'planning', name: 'Planning', order: 1, color: '#3B82F6' },
      { id: 'approval', name: 'Approval', order: 2, color: '#F59E0B' },
      { id: 'execution', name: 'Execution', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Research Domain',
        type: 'text',
        description: 'Primary research domain',
        isRequired: true,
      },
      {
        name: 'Timeline',
        type: 'select',
        description: 'Project duration',
        options: ['1-3 months', '3-6 months', '6-12 months', '1+ year'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Research Ideation',
          description: 'Develop and refine research ideas',
          tasks: [
            {
              title: 'Identify research gap',
              description: 'Review existing literature to find research opportunities.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['ideation', 'literature'],
            },
            {
              title: 'Define research questions',
              description: 'Formulate clear and testable research questions.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['ideation', 'questions'],
            },
            {
              title: 'Assess feasibility',
              description: 'Evaluate resources, timeline, and constraints.',
              assigneeRole: 'lead',
              dueOffset: 7,
              priority: 'high',
              labels: ['ideation', 'feasibility'],
            },
            {
              title: 'Develop initial hypothesis',
              description: 'Create preliminary hypotheses to test.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'medium',
              labels: ['ideation', 'hypothesis'],
            },
          ],
        },
        {
          name: 'Project Planning',
          description: 'Create detailed project plan',
          tasks: [
            {
              title: 'Define methodology',
              description: 'Select appropriate research methods.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['planning', 'methodology'],
            },
            {
              title: 'Create project timeline',
              description: 'Develop detailed schedule with milestones.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'high',
              labels: ['planning', 'timeline'],
            },
            {
              title: 'Identify resource needs',
              description: 'List required personnel, equipment, and budget.',
              assigneeRole: 'member',
              dueOffset: 20,
              priority: 'high',
              labels: ['planning', 'resources'],
            },
            {
              title: 'Define deliverables',
              description: 'Specify expected outputs and milestones.',
              assigneeRole: 'lead',
              dueOffset: 22,
              priority: 'high',
              labels: ['planning', 'deliverables'],
            },
            {
              title: 'Risk assessment',
              description: 'Identify potential risks and mitigation strategies.',
              assigneeRole: 'member',
              dueOffset: 25,
              priority: 'medium',
              labels: ['planning', 'risk'],
            },
          ],
        },
        {
          name: 'Approval Process',
          description: 'Obtain necessary approvals',
          tasks: [
            {
              title: 'Prepare proposal document',
              description: 'Write comprehensive research proposal.',
              assigneeRole: 'lead',
              dueOffset: 30,
              priority: 'high',
              labels: ['approval', 'documentation'],
            },
            {
              title: 'Internal review',
              description: 'Get feedback from internal stakeholders.',
              assigneeRole: 'lead',
              dueOffset: 35,
              priority: 'high',
              labels: ['approval', 'review'],
            },
            {
              title: 'Submit for approval',
              description: 'Submit proposal to relevant committees.',
              assigneeRole: 'lead',
              dueOffset: 40,
              priority: 'high',
              labels: ['approval', 'submission'],
            },
            {
              title: 'Address feedback',
              description: 'Incorporate reviewer feedback and revisions.',
              assigneeRole: 'member',
              dueOffset: 50,
              priority: 'high',
              labels: ['approval', 'revision'],
            },
          ],
        },
        {
          name: 'Project Setup',
          description: 'Prepare for execution',
          tasks: [
            {
              title: 'Assemble team',
              description: 'Recruit and onboard team members.',
              assigneeRole: 'lead',
              dueOffset: 55,
              priority: 'high',
              labels: ['setup', 'team'],
            },
            {
              title: 'Secure resources',
              description: 'Obtain equipment, software, and materials.',
              assigneeRole: 'member',
              dueOffset: 60,
              priority: 'high',
              labels: ['setup', 'resources'],
            },
            {
              title: 'Set up tracking systems',
              description: 'Establish project management and data systems.',
              assigneeRole: 'member',
              dueOffset: 63,
              priority: 'medium',
              labels: ['setup', 'systems'],
            },
            {
              title: 'Kick off project',
              description: 'Launch project with team meeting.',
              assigneeRole: 'lead',
              dueOffset: 65,
              priority: 'high',
              labels: ['setup', 'kickoff'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['ideation', 'planning', 'approval', 'execution', 'completed'],
      },
    },
    settings: {
      milestoneTracking: true,
      approvalWorkflow: true,
    },
  },

  // ==================== 7. LITERATURE REVIEW ====================
  {
    name: 'Literature Review',
    slug: 'literature-review',
    description:
      'Systematic literature review project to synthesize existing research and identify knowledge gaps.',
    category: 'research',
    icon: 'BookOpen',
    color: '#14B8A6',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'scoping', name: 'Scoping', order: 0, color: '#6B7280' },
      { id: 'searching', name: 'Searching', order: 1, color: '#3B82F6' },
      { id: 'screening', name: 'Screening', order: 2, color: '#F59E0B' },
      { id: 'analysis', name: 'Analysis', order: 3, color: '#8B5CF6' },
      { id: 'writing', name: 'Writing', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Review Type',
        type: 'select',
        description: 'Type of literature review',
        options: ['Narrative', 'Systematic', 'Scoping', 'Meta-analysis', 'Rapid'],
        isRequired: true,
      },
      {
        name: 'Database Sources',
        type: 'multiselect',
        description: 'Databases to search',
        options: ['PubMed', 'Scopus', 'Web of Science', 'Google Scholar', 'IEEE', 'PsycINFO'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Review Scoping',
          description: 'Define review scope and protocol',
          tasks: [
            {
              title: 'Define review objectives',
              description: 'Clearly state the purpose of the review.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['scoping', 'objectives'],
            },
            {
              title: 'Formulate research questions',
              description: 'Develop PICO or similar framework questions.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['scoping', 'questions'],
            },
            {
              title: 'Define inclusion criteria',
              description: 'Specify criteria for including studies.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['scoping', 'criteria'],
            },
            {
              title: 'Create search protocol',
              description: 'Document systematic search strategy.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['scoping', 'protocol'],
            },
          ],
        },
        {
          name: 'Literature Search',
          description: 'Search and collect sources',
          tasks: [
            {
              title: 'Develop search strings',
              description: 'Create database-specific search queries.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['searching', 'queries'],
            },
            {
              title: 'Execute database searches',
              description: 'Run searches across all databases.',
              assigneeRole: 'member',
              dueOffset: 15,
              priority: 'high',
              labels: ['searching', 'execution'],
            },
            {
              title: 'Collect grey literature',
              description: 'Search for unpublished and non-academic sources.',
              assigneeRole: 'member',
              dueOffset: 18,
              priority: 'medium',
              labels: ['searching', 'grey-literature'],
            },
            {
              title: 'Remove duplicates',
              description: 'Deduplicate search results.',
              assigneeRole: 'member',
              dueOffset: 20,
              priority: 'high',
              labels: ['searching', 'deduplication'],
            },
          ],
        },
        {
          name: 'Screening',
          description: 'Screen and select studies',
          tasks: [
            {
              title: 'Title and abstract screening',
              description: 'Initial screening of all results.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['screening', 'initial'],
            },
            {
              title: 'Full-text review',
              description: 'Detailed review of shortlisted papers.',
              assigneeRole: 'member',
              dueOffset: 38,
              priority: 'high',
              labels: ['screening', 'full-text'],
            },
            {
              title: 'Quality assessment',
              description: 'Assess methodological quality of studies.',
              assigneeRole: 'member',
              dueOffset: 45,
              priority: 'high',
              labels: ['screening', 'quality'],
            },
            {
              title: 'Create PRISMA flowchart',
              description: 'Document screening process.',
              assigneeRole: 'member',
              dueOffset: 48,
              priority: 'medium',
              labels: ['screening', 'documentation'],
            },
          ],
        },
        {
          name: 'Analysis and Synthesis',
          description: 'Analyze and synthesize findings',
          tasks: [
            {
              title: 'Data extraction',
              description: 'Extract relevant data from included studies.',
              assigneeRole: 'member',
              dueOffset: 55,
              priority: 'high',
              labels: ['analysis', 'extraction'],
            },
            {
              title: 'Thematic analysis',
              description: 'Identify themes across studies.',
              assigneeRole: 'member',
              dueOffset: 62,
              priority: 'high',
              labels: ['analysis', 'themes'],
            },
            {
              title: 'Synthesize findings',
              description: 'Combine findings into coherent narrative.',
              assigneeRole: 'lead',
              dueOffset: 70,
              priority: 'high',
              labels: ['analysis', 'synthesis'],
            },
            {
              title: 'Identify gaps',
              description: 'Document gaps in existing literature.',
              assigneeRole: 'lead',
              dueOffset: 75,
              priority: 'high',
              labels: ['analysis', 'gaps'],
            },
          ],
        },
        {
          name: 'Writing',
          description: 'Write the review',
          tasks: [
            {
              title: 'Write introduction',
              description: 'Draft introduction and background.',
              assigneeRole: 'member',
              dueOffset: 80,
              priority: 'high',
              labels: ['writing', 'introduction'],
            },
            {
              title: 'Write methodology',
              description: 'Document search and screening methods.',
              assigneeRole: 'member',
              dueOffset: 83,
              priority: 'high',
              labels: ['writing', 'methodology'],
            },
            {
              title: 'Write results',
              description: 'Present synthesis of findings.',
              assigneeRole: 'member',
              dueOffset: 90,
              priority: 'high',
              labels: ['writing', 'results'],
            },
            {
              title: 'Write discussion',
              description: 'Discuss implications and limitations.',
              assigneeRole: 'lead',
              dueOffset: 95,
              priority: 'high',
              labels: ['writing', 'discussion'],
            },
            {
              title: 'Finalize and submit',
              description: 'Final editing and submission.',
              assigneeRole: 'lead',
              dueOffset: 100,
              priority: 'high',
              labels: ['writing', 'submission'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['scoping', 'searching', 'screening', 'analysis', 'writing'],
      },
    },
    settings: {
      citationManagement: true,
      prismaCompliance: true,
    },
  },

  // ==================== 8. SYSTEMATIC REVIEW ====================
  {
    name: 'Systematic Review',
    slug: 'systematic-review',
    description:
      'Rigorous systematic review following PRISMA guidelines with comprehensive search and quality assessment.',
    category: 'research',
    icon: 'ListChecks',
    color: '#0EA5E9',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'protocol', name: 'Protocol', order: 0, color: '#6B7280' },
      { id: 'search', name: 'Search', order: 1, color: '#3B82F6' },
      { id: 'selection', name: 'Selection', order: 2, color: '#F59E0B' },
      { id: 'extraction', name: 'Extraction', order: 3, color: '#8B5CF6' },
      { id: 'reporting', name: 'Reporting', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Registration',
        type: 'text',
        description: 'PROSPERO or other registration ID',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Protocol Development',
          description: 'Develop and register protocol',
          tasks: [
            {
              title: 'Define PICO framework',
              description: 'Specify population, intervention, comparison, outcome.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['protocol', 'pico'],
            },
            {
              title: 'Develop search strategy',
              description: 'Create comprehensive search strategy.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['protocol', 'search'],
            },
            {
              title: 'Define eligibility criteria',
              description: 'Specify inclusion and exclusion criteria.',
              assigneeRole: 'lead',
              dueOffset: 10,
              priority: 'high',
              labels: ['protocol', 'eligibility'],
            },
            {
              title: 'Register protocol',
              description: 'Submit to PROSPERO or similar registry.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['protocol', 'registration'],
            },
          ],
        },
        {
          name: 'Systematic Search',
          description: 'Execute comprehensive search',
          tasks: [
            {
              title: 'Search electronic databases',
              description: 'Execute searches in all planned databases.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['search', 'databases'],
            },
            {
              title: 'Hand search key journals',
              description: 'Manually search relevant journals.',
              assigneeRole: 'member',
              dueOffset: 25,
              priority: 'medium',
              labels: ['search', 'manual'],
            },
            {
              title: 'Contact experts',
              description: 'Reach out to field experts for additional studies.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'medium',
              labels: ['search', 'experts'],
            },
            {
              title: 'Document search results',
              description: 'Record all search results and dates.',
              assigneeRole: 'member',
              dueOffset: 30,
              priority: 'high',
              labels: ['search', 'documentation'],
            },
          ],
        },
        {
          name: 'Study Selection',
          description: 'Screen and select studies',
          tasks: [
            {
              title: 'Independent screening',
              description: 'Two reviewers independently screen titles.',
              assigneeRole: 'member',
              dueOffset: 40,
              priority: 'high',
              labels: ['selection', 'screening'],
            },
            {
              title: 'Resolve disagreements',
              description: 'Discuss and resolve screening conflicts.',
              assigneeRole: 'lead',
              dueOffset: 45,
              priority: 'high',
              labels: ['selection', 'consensus'],
            },
            {
              title: 'Full-text assessment',
              description: 'Assess full texts against eligibility.',
              assigneeRole: 'member',
              dueOffset: 55,
              priority: 'high',
              labels: ['selection', 'full-text'],
            },
            {
              title: 'Document exclusions',
              description: 'Record reasons for exclusion.',
              assigneeRole: 'member',
              dueOffset: 58,
              priority: 'high',
              labels: ['selection', 'documentation'],
            },
          ],
        },
        {
          name: 'Data Extraction',
          description: 'Extract and assess data',
          tasks: [
            {
              title: 'Develop extraction form',
              description: 'Create standardized data extraction form.',
              assigneeRole: 'lead',
              dueOffset: 60,
              priority: 'high',
              labels: ['extraction', 'form'],
            },
            {
              title: 'Extract study data',
              description: 'Extract data from all included studies.',
              assigneeRole: 'member',
              dueOffset: 75,
              priority: 'high',
              labels: ['extraction', 'data'],
            },
            {
              title: 'Risk of bias assessment',
              description: 'Assess methodological quality.',
              assigneeRole: 'member',
              dueOffset: 80,
              priority: 'high',
              labels: ['extraction', 'quality'],
            },
            {
              title: 'Verify extraction',
              description: 'Double-check extracted data.',
              assigneeRole: 'lead',
              dueOffset: 85,
              priority: 'high',
              labels: ['extraction', 'verification'],
            },
          ],
        },
        {
          name: 'Synthesis and Reporting',
          description: 'Synthesize and report findings',
          tasks: [
            {
              title: 'Narrative synthesis',
              description: 'Synthesize findings narratively.',
              assigneeRole: 'lead',
              dueOffset: 92,
              priority: 'high',
              labels: ['reporting', 'synthesis'],
            },
            {
              title: 'Create summary tables',
              description: 'Develop evidence summary tables.',
              assigneeRole: 'member',
              dueOffset: 95,
              priority: 'high',
              labels: ['reporting', 'tables'],
            },
            {
              title: 'Write PRISMA report',
              description: 'Complete report following PRISMA checklist.',
              assigneeRole: 'lead',
              dueOffset: 105,
              priority: 'high',
              labels: ['reporting', 'prisma'],
            },
            {
              title: 'Peer review and revise',
              description: 'Get feedback and revise.',
              assigneeRole: 'lead',
              dueOffset: 115,
              priority: 'high',
              labels: ['reporting', 'review'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['protocol', 'search', 'selection', 'extraction', 'reporting'],
      },
    },
    settings: {
      prismaCompliance: true,
      dualReview: true,
    },
  },

  // ==================== 9. META-ANALYSIS ====================
  {
    name: 'Meta-Analysis',
    slug: 'meta-analysis',
    description:
      'Statistical meta-analysis project combining quantitative results from multiple studies.',
    category: 'research',
    icon: 'Calculator',
    color: '#7C3AED',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'preparation', name: 'Preparation', order: 0, color: '#6B7280' },
      { id: 'data-collection', name: 'Data Collection', order: 1, color: '#3B82F6' },
      { id: 'analysis', name: 'Analysis', order: 2, color: '#F59E0B' },
      { id: 'interpretation', name: 'Interpretation', order: 3, color: '#8B5CF6' },
      { id: 'publication', name: 'Publication', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Effect Size Type',
        type: 'select',
        description: 'Type of effect size',
        options: ['Odds Ratio', 'Risk Ratio', 'Mean Difference', 'Standardized Mean Difference', 'Correlation'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Preparation',
          description: 'Prepare for meta-analysis',
          tasks: [
            {
              title: 'Define research question',
              description: 'Specify the meta-analytic question.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['preparation', 'question'],
            },
            {
              title: 'Select effect size measure',
              description: 'Choose appropriate effect size metric.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['preparation', 'effect-size'],
            },
            {
              title: 'Plan statistical approach',
              description: 'Decide on fixed vs random effects model.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['preparation', 'statistics'],
            },
            {
              title: 'Identify moderators',
              description: 'List potential moderating variables.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'medium',
              labels: ['preparation', 'moderators'],
            },
          ],
        },
        {
          name: 'Data Collection',
          description: 'Collect data from studies',
          tasks: [
            {
              title: 'Create coding form',
              description: 'Develop standardized coding sheet.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['data-collection', 'coding'],
            },
            {
              title: 'Extract effect sizes',
              description: 'Calculate or extract effect sizes from studies.',
              assigneeRole: 'member',
              dueOffset: 25,
              priority: 'high',
              labels: ['data-collection', 'extraction'],
            },
            {
              title: 'Extract moderator data',
              description: 'Code moderator variables.',
              assigneeRole: 'member',
              dueOffset: 30,
              priority: 'high',
              labels: ['data-collection', 'moderators'],
            },
            {
              title: 'Verify data accuracy',
              description: 'Double-check all extracted data.',
              assigneeRole: 'lead',
              dueOffset: 35,
              priority: 'high',
              labels: ['data-collection', 'verification'],
            },
          ],
        },
        {
          name: 'Statistical Analysis',
          description: 'Conduct meta-analytic calculations',
          tasks: [
            {
              title: 'Calculate overall effect',
              description: 'Compute pooled effect size.',
              assigneeRole: 'member',
              dueOffset: 40,
              priority: 'high',
              labels: ['analysis', 'pooled-effect'],
            },
            {
              title: 'Assess heterogeneity',
              description: 'Calculate I-squared and Q statistics.',
              assigneeRole: 'member',
              dueOffset: 43,
              priority: 'high',
              labels: ['analysis', 'heterogeneity'],
            },
            {
              title: 'Moderator analysis',
              description: 'Conduct subgroup and meta-regression analyses.',
              assigneeRole: 'member',
              dueOffset: 50,
              priority: 'high',
              labels: ['analysis', 'moderators'],
            },
            {
              title: 'Publication bias assessment',
              description: 'Conduct funnel plot and bias tests.',
              assigneeRole: 'member',
              dueOffset: 55,
              priority: 'high',
              labels: ['analysis', 'bias'],
            },
            {
              title: 'Sensitivity analysis',
              description: 'Test robustness of findings.',
              assigneeRole: 'member',
              dueOffset: 58,
              priority: 'medium',
              labels: ['analysis', 'sensitivity'],
            },
          ],
        },
        {
          name: 'Interpretation',
          description: 'Interpret and visualize results',
          tasks: [
            {
              title: 'Create forest plot',
              description: 'Generate forest plot visualization.',
              assigneeRole: 'member',
              dueOffset: 62,
              priority: 'high',
              labels: ['interpretation', 'visualization'],
            },
            {
              title: 'Create funnel plot',
              description: 'Generate publication bias visualization.',
              assigneeRole: 'member',
              dueOffset: 64,
              priority: 'high',
              labels: ['interpretation', 'visualization'],
            },
            {
              title: 'Interpret findings',
              description: 'Draw conclusions from analyses.',
              assigneeRole: 'lead',
              dueOffset: 68,
              priority: 'high',
              labels: ['interpretation', 'conclusions'],
            },
            {
              title: 'Assess certainty of evidence',
              description: 'Apply GRADE or similar framework.',
              assigneeRole: 'lead',
              dueOffset: 72,
              priority: 'high',
              labels: ['interpretation', 'grade'],
            },
          ],
        },
        {
          name: 'Publication',
          description: 'Prepare for publication',
          tasks: [
            {
              title: 'Write methods section',
              description: 'Document all statistical procedures.',
              assigneeRole: 'member',
              dueOffset: 78,
              priority: 'high',
              labels: ['publication', 'writing'],
            },
            {
              title: 'Write results section',
              description: 'Present all findings clearly.',
              assigneeRole: 'member',
              dueOffset: 85,
              priority: 'high',
              labels: ['publication', 'writing'],
            },
            {
              title: 'Prepare supplementary materials',
              description: 'Create data files and additional analyses.',
              assigneeRole: 'member',
              dueOffset: 90,
              priority: 'medium',
              labels: ['publication', 'supplementary'],
            },
            {
              title: 'Submit manuscript',
              description: 'Finalize and submit for publication.',
              assigneeRole: 'lead',
              dueOffset: 100,
              priority: 'high',
              labels: ['publication', 'submission'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['preparation', 'data-collection', 'analysis', 'interpretation', 'publication'],
      },
    },
    settings: {
      statisticalRigor: true,
      transparencyRequired: true,
    },
  },

  // ==================== 10. QUALITATIVE RESEARCH ====================
  {
    name: 'Qualitative Research',
    slug: 'qualitative-research',
    description:
      'Qualitative research project exploring experiences, meanings, and perspectives through interviews and observation.',
    category: 'research',
    icon: 'MessageSquare',
    color: '#EC4899',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'design', name: 'Design', order: 0, color: '#6B7280' },
      { id: 'fieldwork', name: 'Fieldwork', order: 1, color: '#3B82F6' },
      { id: 'analysis', name: 'Analysis', order: 2, color: '#F59E0B' },
      { id: 'interpretation', name: 'Interpretation', order: 3, color: '#8B5CF6' },
      { id: 'writing', name: 'Writing', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Methodology',
        type: 'select',
        description: 'Qualitative approach',
        options: ['Grounded Theory', 'Phenomenology', 'Ethnography', 'Narrative', 'Case Study', 'Thematic Analysis'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Research Design',
          description: 'Design qualitative study',
          tasks: [
            {
              title: 'Define research phenomenon',
              description: 'Clearly articulate what is being studied.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['design', 'phenomenon'],
            },
            {
              title: 'Select methodology',
              description: 'Choose appropriate qualitative approach.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['design', 'methodology'],
            },
            {
              title: 'Develop interview guide',
              description: 'Create semi-structured interview questions.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['design', 'instruments'],
            },
            {
              title: 'Plan sampling strategy',
              description: 'Define purposive sampling approach.',
              assigneeRole: 'lead',
              dueOffset: 12,
              priority: 'high',
              labels: ['design', 'sampling'],
            },
            {
              title: 'Obtain ethics approval',
              description: 'Submit IRB application.',
              assigneeRole: 'lead',
              dueOffset: 20,
              priority: 'high',
              labels: ['design', 'ethics'],
            },
          ],
        },
        {
          name: 'Fieldwork',
          description: 'Collect qualitative data',
          tasks: [
            {
              title: 'Recruit participants',
              description: 'Identify and recruit study participants.',
              assigneeRole: 'member',
              dueOffset: 30,
              priority: 'high',
              labels: ['fieldwork', 'recruitment'],
            },
            {
              title: 'Conduct interviews',
              description: 'Carry out all planned interviews.',
              assigneeRole: 'member',
              dueOffset: 50,
              priority: 'high',
              labels: ['fieldwork', 'interviews'],
            },
            {
              title: 'Write field notes',
              description: 'Document observations and reflections.',
              assigneeRole: 'member',
              dueOffset: 55,
              priority: 'high',
              labels: ['fieldwork', 'notes'],
            },
            {
              title: 'Transcribe data',
              description: 'Transcribe all interview recordings.',
              assigneeRole: 'member',
              dueOffset: 65,
              priority: 'high',
              labels: ['fieldwork', 'transcription'],
            },
          ],
        },
        {
          name: 'Data Analysis',
          description: 'Analyze qualitative data',
          tasks: [
            {
              title: 'Initial coding',
              description: 'Conduct open/initial coding of data.',
              assigneeRole: 'member',
              dueOffset: 75,
              priority: 'high',
              labels: ['analysis', 'coding'],
            },
            {
              title: 'Focused coding',
              description: 'Develop focused codes and categories.',
              assigneeRole: 'member',
              dueOffset: 85,
              priority: 'high',
              labels: ['analysis', 'coding'],
            },
            {
              title: 'Theme development',
              description: 'Identify and refine themes.',
              assigneeRole: 'lead',
              dueOffset: 95,
              priority: 'high',
              labels: ['analysis', 'themes'],
            },
            {
              title: 'Member checking',
              description: 'Validate findings with participants.',
              assigneeRole: 'member',
              dueOffset: 100,
              priority: 'medium',
              labels: ['analysis', 'validation'],
            },
          ],
        },
        {
          name: 'Interpretation',
          description: 'Interpret and theorize',
          tasks: [
            {
              title: 'Develop theoretical framework',
              description: 'Build explanatory framework from themes.',
              assigneeRole: 'lead',
              dueOffset: 108,
              priority: 'high',
              labels: ['interpretation', 'theory'],
            },
            {
              title: 'Compare with literature',
              description: 'Relate findings to existing research.',
              assigneeRole: 'member',
              dueOffset: 112,
              priority: 'high',
              labels: ['interpretation', 'literature'],
            },
            {
              title: 'Assess trustworthiness',
              description: 'Document credibility, transferability, dependability.',
              assigneeRole: 'lead',
              dueOffset: 116,
              priority: 'high',
              labels: ['interpretation', 'rigor'],
            },
          ],
        },
        {
          name: 'Writing',
          description: 'Write up findings',
          tasks: [
            {
              title: 'Write findings section',
              description: 'Present themes with supporting quotes.',
              assigneeRole: 'member',
              dueOffset: 125,
              priority: 'high',
              labels: ['writing', 'findings'],
            },
            {
              title: 'Write discussion',
              description: 'Discuss implications and contributions.',
              assigneeRole: 'lead',
              dueOffset: 132,
              priority: 'high',
              labels: ['writing', 'discussion'],
            },
            {
              title: 'Prepare reflexivity statement',
              description: 'Document researcher positionality.',
              assigneeRole: 'lead',
              dueOffset: 135,
              priority: 'medium',
              labels: ['writing', 'reflexivity'],
            },
            {
              title: 'Finalize manuscript',
              description: 'Complete and polish the manuscript.',
              assigneeRole: 'lead',
              dueOffset: 145,
              priority: 'high',
              labels: ['writing', 'finalization'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['design', 'fieldwork', 'analysis', 'interpretation', 'writing'],
      },
    },
    settings: {
      reflexivityRequired: true,
      auditTrail: true,
    },
  },

  // ==================== 11. QUANTITATIVE RESEARCH ====================
  {
    name: 'Quantitative Research',
    slug: 'quantitative-research',
    description:
      'Quantitative research project using statistical methods to test hypotheses and measure relationships.',
    category: 'research',
    icon: 'Hash',
    color: '#3B82F6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'design', name: 'Design', order: 0, color: '#6B7280' },
      { id: 'data-collection', name: 'Data Collection', order: 1, color: '#3B82F6' },
      { id: 'analysis', name: 'Analysis', order: 2, color: '#F59E0B' },
      { id: 'results', name: 'Results', order: 3, color: '#8B5CF6' },
      { id: 'publication', name: 'Publication', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Study Design',
        type: 'select',
        description: 'Type of quantitative design',
        options: ['Cross-sectional', 'Longitudinal', 'Experimental', 'Quasi-experimental', 'Correlational'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Study Design',
          description: 'Design quantitative study',
          tasks: [
            {
              title: 'Define hypotheses',
              description: 'State testable hypotheses.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['design', 'hypotheses'],
            },
            {
              title: 'Operationalize variables',
              description: 'Define how to measure each variable.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['design', 'variables'],
            },
            {
              title: 'Select instruments',
              description: 'Choose validated measurement tools.',
              assigneeRole: 'member',
              dueOffset: 8,
              priority: 'high',
              labels: ['design', 'instruments'],
            },
            {
              title: 'Calculate sample size',
              description: 'Conduct power analysis.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['design', 'power'],
            },
            {
              title: 'Plan sampling procedure',
              description: 'Define sampling method.',
              assigneeRole: 'lead',
              dueOffset: 12,
              priority: 'high',
              labels: ['design', 'sampling'],
            },
          ],
        },
        {
          name: 'Data Collection',
          description: 'Collect quantitative data',
          tasks: [
            {
              title: 'Pilot test instruments',
              description: 'Test survey or measures with small sample.',
              assigneeRole: 'member',
              dueOffset: 20,
              priority: 'high',
              labels: ['collection', 'pilot'],
            },
            {
              title: 'Recruit sample',
              description: 'Recruit required number of participants.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'high',
              labels: ['collection', 'recruitment'],
            },
            {
              title: 'Administer instruments',
              description: 'Collect data from all participants.',
              assigneeRole: 'member',
              dueOffset: 50,
              priority: 'high',
              labels: ['collection', 'administration'],
            },
            {
              title: 'Quality check data',
              description: 'Review data for completeness and errors.',
              assigneeRole: 'member',
              dueOffset: 55,
              priority: 'high',
              labels: ['collection', 'quality'],
            },
          ],
        },
        {
          name: 'Data Analysis',
          description: 'Analyze data statistically',
          tasks: [
            {
              title: 'Data cleaning',
              description: 'Clean and prepare dataset.',
              assigneeRole: 'member',
              dueOffset: 60,
              priority: 'high',
              labels: ['analysis', 'cleaning'],
            },
            {
              title: 'Descriptive statistics',
              description: 'Calculate descriptive statistics.',
              assigneeRole: 'member',
              dueOffset: 63,
              priority: 'high',
              labels: ['analysis', 'descriptive'],
            },
            {
              title: 'Check assumptions',
              description: 'Test statistical assumptions.',
              assigneeRole: 'member',
              dueOffset: 65,
              priority: 'high',
              labels: ['analysis', 'assumptions'],
            },
            {
              title: 'Hypothesis testing',
              description: 'Run planned statistical tests.',
              assigneeRole: 'member',
              dueOffset: 70,
              priority: 'high',
              labels: ['analysis', 'testing'],
            },
            {
              title: 'Additional analyses',
              description: 'Conduct exploratory analyses.',
              assigneeRole: 'member',
              dueOffset: 75,
              priority: 'medium',
              labels: ['analysis', 'exploratory'],
            },
          ],
        },
        {
          name: 'Results',
          description: 'Document and visualize results',
          tasks: [
            {
              title: 'Create tables',
              description: 'Build results tables.',
              assigneeRole: 'member',
              dueOffset: 80,
              priority: 'high',
              labels: ['results', 'tables'],
            },
            {
              title: 'Create figures',
              description: 'Design charts and graphs.',
              assigneeRole: 'member',
              dueOffset: 83,
              priority: 'high',
              labels: ['results', 'figures'],
            },
            {
              title: 'Write results narrative',
              description: 'Write up statistical results.',
              assigneeRole: 'member',
              dueOffset: 88,
              priority: 'high',
              labels: ['results', 'writing'],
            },
          ],
        },
        {
          name: 'Publication',
          description: 'Prepare for publication',
          tasks: [
            {
              title: 'Write full manuscript',
              description: 'Complete all sections of paper.',
              assigneeRole: 'lead',
              dueOffset: 100,
              priority: 'high',
              labels: ['publication', 'writing'],
            },
            {
              title: 'Internal review',
              description: 'Get feedback from co-authors.',
              assigneeRole: 'lead',
              dueOffset: 108,
              priority: 'high',
              labels: ['publication', 'review'],
            },
            {
              title: 'Prepare supplementary',
              description: 'Create supplementary materials and data.',
              assigneeRole: 'member',
              dueOffset: 112,
              priority: 'medium',
              labels: ['publication', 'supplementary'],
            },
            {
              title: 'Submit manuscript',
              description: 'Submit to target journal.',
              assigneeRole: 'lead',
              dueOffset: 120,
              priority: 'high',
              labels: ['publication', 'submission'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['design', 'data-collection', 'analysis', 'results', 'publication'],
      },
    },
    settings: {
      preregistration: true,
      dataSharing: true,
    },
  },

  // ==================== 12. MIXED METHODS RESEARCH ====================
  {
    name: 'Mixed Methods Research',
    slug: 'mixed-methods-research',
    description:
      'Mixed methods research combining quantitative and qualitative approaches for comprehensive understanding.',
    category: 'research',
    icon: 'Layers',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'design', name: 'Design', order: 0, color: '#6B7280' },
      { id: 'quantitative', name: 'Quantitative', order: 1, color: '#3B82F6' },
      { id: 'qualitative', name: 'Qualitative', order: 2, color: '#F59E0B' },
      { id: 'integration', name: 'Integration', order: 3, color: '#8B5CF6' },
      { id: 'reporting', name: 'Reporting', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Design Type',
        type: 'select',
        description: 'Mixed methods design',
        options: ['Convergent', 'Explanatory Sequential', 'Exploratory Sequential', 'Embedded', 'Transformative'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Study Design',
          description: 'Design mixed methods study',
          tasks: [
            {
              title: 'Define research purpose',
              description: 'Articulate why mixed methods is needed.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['design', 'purpose'],
            },
            {
              title: 'Select mixed methods design',
              description: 'Choose appropriate design type.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['design', 'methodology'],
            },
            {
              title: 'Plan integration strategy',
              description: 'Define how strands will be integrated.',
              assigneeRole: 'lead',
              dueOffset: 8,
              priority: 'high',
              labels: ['design', 'integration'],
            },
            {
              title: 'Design quantitative strand',
              description: 'Plan quantitative component.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['design', 'quantitative'],
            },
            {
              title: 'Design qualitative strand',
              description: 'Plan qualitative component.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['design', 'qualitative'],
            },
          ],
        },
        {
          name: 'Quantitative Phase',
          description: 'Conduct quantitative research',
          tasks: [
            {
              title: 'Collect quantitative data',
              description: 'Administer surveys or collect measurements.',
              assigneeRole: 'member',
              dueOffset: 30,
              priority: 'high',
              labels: ['quantitative', 'collection'],
            },
            {
              title: 'Analyze quantitative data',
              description: 'Run statistical analyses.',
              assigneeRole: 'member',
              dueOffset: 40,
              priority: 'high',
              labels: ['quantitative', 'analysis'],
            },
            {
              title: 'Summarize quantitative findings',
              description: 'Document quantitative results.',
              assigneeRole: 'member',
              dueOffset: 45,
              priority: 'high',
              labels: ['quantitative', 'summary'],
            },
          ],
        },
        {
          name: 'Qualitative Phase',
          description: 'Conduct qualitative research',
          tasks: [
            {
              title: 'Collect qualitative data',
              description: 'Conduct interviews or observations.',
              assigneeRole: 'member',
              dueOffset: 55,
              priority: 'high',
              labels: ['qualitative', 'collection'],
            },
            {
              title: 'Analyze qualitative data',
              description: 'Code and analyze qualitative data.',
              assigneeRole: 'member',
              dueOffset: 70,
              priority: 'high',
              labels: ['qualitative', 'analysis'],
            },
            {
              title: 'Summarize qualitative findings',
              description: 'Document themes and findings.',
              assigneeRole: 'member',
              dueOffset: 78,
              priority: 'high',
              labels: ['qualitative', 'summary'],
            },
          ],
        },
        {
          name: 'Integration',
          description: 'Integrate findings',
          tasks: [
            {
              title: 'Create joint display',
              description: 'Build visual integration of findings.',
              assigneeRole: 'member',
              dueOffset: 85,
              priority: 'high',
              labels: ['integration', 'display'],
            },
            {
              title: 'Compare and contrast',
              description: 'Analyze convergence and divergence.',
              assigneeRole: 'lead',
              dueOffset: 90,
              priority: 'high',
              labels: ['integration', 'comparison'],
            },
            {
              title: 'Develop meta-inferences',
              description: 'Draw integrated conclusions.',
              assigneeRole: 'lead',
              dueOffset: 95,
              priority: 'high',
              labels: ['integration', 'inferences'],
            },
          ],
        },
        {
          name: 'Reporting',
          description: 'Report integrated findings',
          tasks: [
            {
              title: 'Write integrated methods',
              description: 'Document mixed methods procedures.',
              assigneeRole: 'member',
              dueOffset: 102,
              priority: 'high',
              labels: ['reporting', 'methods'],
            },
            {
              title: 'Write integrated results',
              description: 'Present integrated findings.',
              assigneeRole: 'member',
              dueOffset: 110,
              priority: 'high',
              labels: ['reporting', 'results'],
            },
            {
              title: 'Discuss integration',
              description: 'Interpret combined findings.',
              assigneeRole: 'lead',
              dueOffset: 118,
              priority: 'high',
              labels: ['reporting', 'discussion'],
            },
            {
              title: 'Finalize manuscript',
              description: 'Complete and submit paper.',
              assigneeRole: 'lead',
              dueOffset: 125,
              priority: 'high',
              labels: ['reporting', 'submission'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['design', 'quantitative', 'qualitative', 'integration', 'reporting'],
      },
    },
    settings: {
      integrationRequired: true,
      dualExpertise: true,
    },
  },

  // ==================== 13. SURVEY RESEARCH ====================
  {
    name: 'Survey Research',
    slug: 'survey-research',
    description:
      'Survey research project from questionnaire design to data collection and analysis.',
    category: 'research',
    icon: 'ClipboardCheck',
    color: '#06B6D4',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'design', name: 'Design', order: 0, color: '#6B7280' },
      { id: 'testing', name: 'Testing', order: 1, color: '#3B82F6' },
      { id: 'deployment', name: 'Deployment', order: 2, color: '#F59E0B' },
      { id: 'analysis', name: 'Analysis', order: 3, color: '#8B5CF6' },
      { id: 'reporting', name: 'Reporting', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Survey Mode',
        type: 'select',
        description: 'Survey administration method',
        options: ['Online', 'Paper', 'Phone', 'In-person', 'Mixed'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Survey Design',
          description: 'Design the survey',
          tasks: [
            {
              title: 'Define research objectives',
              description: 'Clarify what the survey will measure.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['design', 'objectives'],
            },
            {
              title: 'Develop question items',
              description: 'Write survey questions.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['design', 'questions'],
            },
            {
              title: 'Design response scales',
              description: 'Create appropriate response options.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['design', 'scales'],
            },
            {
              title: 'Structure questionnaire',
              description: 'Organize question flow and logic.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['design', 'structure'],
            },
          ],
        },
        {
          name: 'Survey Testing',
          description: 'Test and refine survey',
          tasks: [
            {
              title: 'Expert review',
              description: 'Have experts review questions.',
              assigneeRole: 'lead',
              dueOffset: 15,
              priority: 'high',
              labels: ['testing', 'review'],
            },
            {
              title: 'Cognitive interviews',
              description: 'Test question understanding.',
              assigneeRole: 'member',
              dueOffset: 20,
              priority: 'high',
              labels: ['testing', 'cognitive'],
            },
            {
              title: 'Pilot survey',
              description: 'Run pilot with sample respondents.',
              assigneeRole: 'member',
              dueOffset: 25,
              priority: 'high',
              labels: ['testing', 'pilot'],
            },
            {
              title: 'Revise based on testing',
              description: 'Refine questions based on feedback.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['testing', 'revision'],
            },
          ],
        },
        {
          name: 'Deployment',
          description: 'Deploy and collect responses',
          tasks: [
            {
              title: 'Set up survey platform',
              description: 'Configure survey in chosen platform.',
              assigneeRole: 'member',
              dueOffset: 32,
              priority: 'high',
              labels: ['deployment', 'setup'],
            },
            {
              title: 'Recruit respondents',
              description: 'Invite target population.',
              assigneeRole: 'member',
              dueOffset: 40,
              priority: 'high',
              labels: ['deployment', 'recruitment'],
            },
            {
              title: 'Monitor responses',
              description: 'Track response rate and quality.',
              assigneeRole: 'member',
              dueOffset: 50,
              priority: 'high',
              labels: ['deployment', 'monitoring'],
            },
            {
              title: 'Send reminders',
              description: 'Follow up with non-respondents.',
              assigneeRole: 'member',
              dueOffset: 45,
              priority: 'medium',
              labels: ['deployment', 'reminders'],
            },
            {
              title: 'Close survey',
              description: 'End data collection.',
              assigneeRole: 'lead',
              dueOffset: 55,
              priority: 'high',
              labels: ['deployment', 'closure'],
            },
          ],
        },
        {
          name: 'Data Analysis',
          description: 'Analyze survey data',
          tasks: [
            {
              title: 'Clean data',
              description: 'Check for missing and invalid responses.',
              assigneeRole: 'member',
              dueOffset: 58,
              priority: 'high',
              labels: ['analysis', 'cleaning'],
            },
            {
              title: 'Descriptive analysis',
              description: 'Calculate frequencies and distributions.',
              assigneeRole: 'member',
              dueOffset: 62,
              priority: 'high',
              labels: ['analysis', 'descriptive'],
            },
            {
              title: 'Inferential analysis',
              description: 'Run statistical tests.',
              assigneeRole: 'member',
              dueOffset: 68,
              priority: 'high',
              labels: ['analysis', 'inferential'],
            },
          ],
        },
        {
          name: 'Reporting',
          description: 'Report findings',
          tasks: [
            {
              title: 'Create data visualizations',
              description: 'Build charts and graphs.',
              assigneeRole: 'member',
              dueOffset: 72,
              priority: 'high',
              labels: ['reporting', 'visualization'],
            },
            {
              title: 'Write findings report',
              description: 'Document survey results.',
              assigneeRole: 'member',
              dueOffset: 78,
              priority: 'high',
              labels: ['reporting', 'writing'],
            },
            {
              title: 'Present results',
              description: 'Share findings with stakeholders.',
              assigneeRole: 'lead',
              dueOffset: 82,
              priority: 'high',
              labels: ['reporting', 'presentation'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['design', 'testing', 'deployment', 'analysis', 'reporting'],
      },
    },
    settings: {
      responseTracking: true,
      anonymityProtection: true,
    },
  },

  // ==================== 14. INTERVIEW STUDY ====================
  {
    name: 'Interview Study',
    slug: 'interview-study',
    description:
      'In-depth interview study to gather rich qualitative data from participants.',
    category: 'research',
    icon: 'Mic',
    color: '#F97316',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'preparation', name: 'Preparation', order: 0, color: '#6B7280' },
      { id: 'recruitment', name: 'Recruitment', order: 1, color: '#3B82F6' },
      { id: 'interviewing', name: 'Interviewing', order: 2, color: '#F59E0B' },
      { id: 'analysis', name: 'Analysis', order: 3, color: '#8B5CF6' },
      { id: 'reporting', name: 'Reporting', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Interview Type',
        type: 'select',
        description: 'Type of interview',
        options: ['Semi-structured', 'Unstructured', 'Structured', 'Narrative', 'Expert'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Interview Preparation',
          description: 'Prepare for interviews',
          tasks: [
            {
              title: 'Define interview objectives',
              description: 'Clarify what to learn from interviews.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['preparation', 'objectives'],
            },
            {
              title: 'Develop interview guide',
              description: 'Create question guide and probes.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['preparation', 'guide'],
            },
            {
              title: 'Pilot interview',
              description: 'Test guide with practice interview.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['preparation', 'pilot'],
            },
            {
              title: 'Set up recording equipment',
              description: 'Prepare audio/video recording.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'medium',
              labels: ['preparation', 'equipment'],
            },
          ],
        },
        {
          name: 'Participant Recruitment',
          description: 'Recruit interview participants',
          tasks: [
            {
              title: 'Define participant criteria',
              description: 'Specify who to interview.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['recruitment', 'criteria'],
            },
            {
              title: 'Identify potential participants',
              description: 'Source participants from various channels.',
              assigneeRole: 'member',
              dueOffset: 20,
              priority: 'high',
              labels: ['recruitment', 'sourcing'],
            },
            {
              title: 'Screen participants',
              description: 'Verify participants meet criteria.',
              assigneeRole: 'member',
              dueOffset: 25,
              priority: 'high',
              labels: ['recruitment', 'screening'],
            },
            {
              title: 'Schedule interviews',
              description: 'Book interview times.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['recruitment', 'scheduling'],
            },
          ],
        },
        {
          name: 'Conducting Interviews',
          description: 'Conduct the interviews',
          tasks: [
            {
              title: 'Conduct interviews',
              description: 'Complete all planned interviews.',
              assigneeRole: 'member',
              dueOffset: 50,
              priority: 'high',
              labels: ['interviewing', 'execution'],
            },
            {
              title: 'Write post-interview notes',
              description: 'Document impressions after each interview.',
              assigneeRole: 'member',
              dueOffset: 52,
              priority: 'high',
              labels: ['interviewing', 'notes'],
            },
            {
              title: 'Transcribe interviews',
              description: 'Create verbatim transcripts.',
              assigneeRole: 'member',
              dueOffset: 60,
              priority: 'high',
              labels: ['interviewing', 'transcription'],
            },
          ],
        },
        {
          name: 'Data Analysis',
          description: 'Analyze interview data',
          tasks: [
            {
              title: 'Initial reading',
              description: 'Read through all transcripts.',
              assigneeRole: 'member',
              dueOffset: 65,
              priority: 'high',
              labels: ['analysis', 'reading'],
            },
            {
              title: 'Code transcripts',
              description: 'Apply codes to interview data.',
              assigneeRole: 'member',
              dueOffset: 75,
              priority: 'high',
              labels: ['analysis', 'coding'],
            },
            {
              title: 'Identify themes',
              description: 'Develop themes from codes.',
              assigneeRole: 'lead',
              dueOffset: 82,
              priority: 'high',
              labels: ['analysis', 'themes'],
            },
            {
              title: 'Select illustrative quotes',
              description: 'Choose quotes to support themes.',
              assigneeRole: 'member',
              dueOffset: 85,
              priority: 'medium',
              labels: ['analysis', 'quotes'],
            },
          ],
        },
        {
          name: 'Reporting',
          description: 'Report interview findings',
          tasks: [
            {
              title: 'Write findings',
              description: 'Present themes with supporting evidence.',
              assigneeRole: 'member',
              dueOffset: 92,
              priority: 'high',
              labels: ['reporting', 'findings'],
            },
            {
              title: 'Create participant profiles',
              description: 'Develop anonymized participant descriptions.',
              assigneeRole: 'member',
              dueOffset: 95,
              priority: 'medium',
              labels: ['reporting', 'profiles'],
            },
            {
              title: 'Write discussion',
              description: 'Interpret findings in context.',
              assigneeRole: 'lead',
              dueOffset: 100,
              priority: 'high',
              labels: ['reporting', 'discussion'],
            },
            {
              title: 'Finalize report',
              description: 'Complete final report.',
              assigneeRole: 'lead',
              dueOffset: 105,
              priority: 'high',
              labels: ['reporting', 'finalization'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['preparation', 'recruitment', 'interviewing', 'analysis', 'reporting'],
      },
    },
    settings: {
      consentRequired: true,
      recordingManagement: true,
    },
  },

  // ==================== 15. FOCUS GROUP STUDY ====================
  {
    name: 'Focus Group Study',
    slug: 'focus-group-study',
    description:
      'Focus group research project to explore group perspectives and generate rich discussion data.',
    category: 'research',
    icon: 'Users2',
    color: '#A855F7',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'recruitment', name: 'Recruitment', order: 1, color: '#3B82F6' },
      { id: 'facilitation', name: 'Facilitation', order: 2, color: '#F59E0B' },
      { id: 'analysis', name: 'Analysis', order: 3, color: '#8B5CF6' },
      { id: 'reporting', name: 'Reporting', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Number of Groups',
        type: 'number',
        description: 'Planned number of focus groups',
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Focus Group Planning',
          description: 'Plan focus group sessions',
          tasks: [
            {
              title: 'Define discussion topics',
              description: 'Identify key areas to explore.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'topics'],
            },
            {
              title: 'Develop moderator guide',
              description: 'Create facilitation guide.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['planning', 'guide'],
            },
            {
              title: 'Plan group composition',
              description: 'Decide on group size and composition.',
              assigneeRole: 'lead',
              dueOffset: 10,
              priority: 'high',
              labels: ['planning', 'composition'],
            },
            {
              title: 'Arrange venue',
              description: 'Book appropriate space.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['planning', 'logistics'],
            },
          ],
        },
        {
          name: 'Participant Recruitment',
          description: 'Recruit focus group participants',
          tasks: [
            {
              title: 'Define recruitment criteria',
              description: 'Specify participant requirements.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['recruitment', 'criteria'],
            },
            {
              title: 'Recruit participants',
              description: 'Identify and invite participants.',
              assigneeRole: 'member',
              dueOffset: 25,
              priority: 'high',
              labels: ['recruitment', 'outreach'],
            },
            {
              title: 'Screen participants',
              description: 'Ensure participants meet criteria.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['recruitment', 'screening'],
            },
            {
              title: 'Confirm attendance',
              description: 'Send reminders and confirmations.',
              assigneeRole: 'member',
              dueOffset: 32,
              priority: 'high',
              labels: ['recruitment', 'confirmation'],
            },
          ],
        },
        {
          name: 'Focus Group Facilitation',
          description: 'Conduct focus groups',
          tasks: [
            {
              title: 'Conduct focus groups',
              description: 'Facilitate all planned sessions.',
              assigneeRole: 'lead',
              dueOffset: 45,
              priority: 'high',
              labels: ['facilitation', 'sessions'],
            },
            {
              title: 'Take observation notes',
              description: 'Document group dynamics.',
              assigneeRole: 'member',
              dueOffset: 47,
              priority: 'high',
              labels: ['facilitation', 'observation'],
            },
            {
              title: 'Transcribe discussions',
              description: 'Create transcripts of sessions.',
              assigneeRole: 'member',
              dueOffset: 55,
              priority: 'high',
              labels: ['facilitation', 'transcription'],
            },
          ],
        },
        {
          name: 'Data Analysis',
          description: 'Analyze focus group data',
          tasks: [
            {
              title: 'Read transcripts',
              description: 'Familiarize with all data.',
              assigneeRole: 'member',
              dueOffset: 60,
              priority: 'high',
              labels: ['analysis', 'reading'],
            },
            {
              title: 'Code discussions',
              description: 'Apply coding framework.',
              assigneeRole: 'member',
              dueOffset: 70,
              priority: 'high',
              labels: ['analysis', 'coding'],
            },
            {
              title: 'Identify group patterns',
              description: 'Analyze group interactions and consensus.',
              assigneeRole: 'member',
              dueOffset: 75,
              priority: 'high',
              labels: ['analysis', 'patterns'],
            },
            {
              title: 'Develop themes',
              description: 'Synthesize themes across groups.',
              assigneeRole: 'lead',
              dueOffset: 80,
              priority: 'high',
              labels: ['analysis', 'themes'],
            },
          ],
        },
        {
          name: 'Reporting',
          description: 'Report focus group findings',
          tasks: [
            {
              title: 'Write findings report',
              description: 'Document themes and insights.',
              assigneeRole: 'member',
              dueOffset: 88,
              priority: 'high',
              labels: ['reporting', 'findings'],
            },
            {
              title: 'Create recommendations',
              description: 'Develop actionable recommendations.',
              assigneeRole: 'lead',
              dueOffset: 92,
              priority: 'high',
              labels: ['reporting', 'recommendations'],
            },
            {
              title: 'Present to stakeholders',
              description: 'Share findings with stakeholders.',
              assigneeRole: 'lead',
              dueOffset: 98,
              priority: 'high',
              labels: ['reporting', 'presentation'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'recruitment', 'facilitation', 'analysis', 'reporting'],
      },
    },
    settings: {
      groupDynamicsTracking: true,
      facilitationGuides: true,
    },
  },

  // ==================== 16. CASE STUDY RESEARCH ====================
  {
    name: 'Case Study Research',
    slug: 'case-study-research',
    description: 'In-depth case study research examining a single case or multiple cases.',
    category: 'research',
    icon: 'FileText',
    color: '#059669',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'design', name: 'Design', order: 0, color: '#6B7280' },
      { id: 'data-collection', name: 'Data Collection', order: 1, color: '#3B82F6' },
      { id: 'analysis', name: 'Analysis', order: 2, color: '#F59E0B' },
      { id: 'writing', name: 'Writing', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Case Type', type: 'select', description: 'Type of case study', options: ['Single Case', 'Multiple Case', 'Embedded', 'Holistic'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Case Study Design',
          description: 'Design the case study',
          tasks: [
            { title: 'Define research questions', description: 'Formulate case study questions.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['design', 'questions'] },
            { title: 'Select case(s)', description: 'Choose appropriate case(s) for study.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['design', 'selection'] },
            { title: 'Define unit of analysis', description: 'Specify what the case represents.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['design', 'unit'] },
            { title: 'Develop case study protocol', description: 'Create detailed procedures.', assigneeRole: 'member', dueOffset: 12, priority: 'high', labels: ['design', 'protocol'] },
          ],
        },
        {
          name: 'Data Collection',
          description: 'Collect case study data',
          tasks: [
            { title: 'Document review', description: 'Collect and review documents.', assigneeRole: 'member', dueOffset: 20, priority: 'high', labels: ['collection', 'documents'] },
            { title: 'Conduct interviews', description: 'Interview key informants.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['collection', 'interviews'] },
            { title: 'Direct observation', description: 'Observe case in context.', assigneeRole: 'member', dueOffset: 40, priority: 'high', labels: ['collection', 'observation'] },
            { title: 'Compile case database', description: 'Organize all evidence.', assigneeRole: 'member', dueOffset: 45, priority: 'high', labels: ['collection', 'database'] },
          ],
        },
        {
          name: 'Analysis',
          description: 'Analyze case data',
          tasks: [
            { title: 'Pattern matching', description: 'Compare patterns with predictions.', assigneeRole: 'member', dueOffset: 55, priority: 'high', labels: ['analysis', 'patterns'] },
            { title: 'Cross-case synthesis', description: 'Analyze across cases if applicable.', assigneeRole: 'member', dueOffset: 62, priority: 'high', labels: ['analysis', 'cross-case'] },
            { title: 'Develop explanations', description: 'Build theoretical explanations.', assigneeRole: 'lead', dueOffset: 70, priority: 'high', labels: ['analysis', 'theory'] },
          ],
        },
        {
          name: 'Writing',
          description: 'Write case study report',
          tasks: [
            { title: 'Write case narrative', description: 'Develop detailed case description.', assigneeRole: 'member', dueOffset: 80, priority: 'high', labels: ['writing', 'narrative'] },
            { title: 'Present findings', description: 'Document key findings.', assigneeRole: 'member', dueOffset: 88, priority: 'high', labels: ['writing', 'findings'] },
            { title: 'Draw conclusions', description: 'Synthesize conclusions.', assigneeRole: 'lead', dueOffset: 95, priority: 'high', labels: ['writing', 'conclusions'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['design', 'data-collection', 'analysis', 'writing', 'completed'] },
    },
    settings: { chainOfEvidence: true, triangulation: true },
  },

  // ==================== 17. ETHNOGRAPHIC STUDY ====================
  {
    name: 'Ethnographic Study',
    slug: 'ethnographic-study',
    description: 'Ethnographic research immersing in a cultural setting to understand practices and meanings.',
    category: 'research',
    icon: 'Globe',
    color: '#DC2626',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'preparation', name: 'Preparation', order: 0, color: '#6B7280' },
      { id: 'fieldwork', name: 'Fieldwork', order: 1, color: '#3B82F6' },
      { id: 'analysis', name: 'Analysis', order: 2, color: '#F59E0B' },
      { id: 'writing', name: 'Writing', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Field Site', type: 'text', description: 'Location of fieldwork', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Preparation',
          description: 'Prepare for fieldwork',
          tasks: [
            { title: 'Define research focus', description: 'Identify cultural phenomenon to study.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['preparation', 'focus'] },
            { title: 'Gain site access', description: 'Negotiate entry to field site.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['preparation', 'access'] },
            { title: 'Build rapport', description: 'Establish relationships with participants.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['preparation', 'rapport'] },
          ],
        },
        {
          name: 'Fieldwork',
          description: 'Conduct ethnographic fieldwork',
          tasks: [
            { title: 'Participant observation', description: 'Observe and participate in activities.', assigneeRole: 'lead', dueOffset: 60, priority: 'high', labels: ['fieldwork', 'observation'] },
            { title: 'Write field notes', description: 'Document daily observations.', assigneeRole: 'lead', dueOffset: 65, priority: 'high', labels: ['fieldwork', 'notes'] },
            { title: 'Conduct interviews', description: 'Interview community members.', assigneeRole: 'lead', dueOffset: 75, priority: 'high', labels: ['fieldwork', 'interviews'] },
            { title: 'Collect artifacts', description: 'Gather cultural artifacts and documents.', assigneeRole: 'lead', dueOffset: 80, priority: 'medium', labels: ['fieldwork', 'artifacts'] },
          ],
        },
        {
          name: 'Analysis',
          description: 'Analyze ethnographic data',
          tasks: [
            { title: 'Code field notes', description: 'Apply codes to observations.', assigneeRole: 'lead', dueOffset: 95, priority: 'high', labels: ['analysis', 'coding'] },
            { title: 'Identify cultural themes', description: 'Develop cultural themes.', assigneeRole: 'lead', dueOffset: 105, priority: 'high', labels: ['analysis', 'themes'] },
            { title: 'Develop cultural portrait', description: 'Create holistic description.', assigneeRole: 'lead', dueOffset: 115, priority: 'high', labels: ['analysis', 'portrait'] },
          ],
        },
        {
          name: 'Writing',
          description: 'Write ethnography',
          tasks: [
            { title: 'Write thick description', description: 'Develop rich narrative.', assigneeRole: 'lead', dueOffset: 130, priority: 'high', labels: ['writing', 'description'] },
            { title: 'Integrate theory', description: 'Connect to theoretical frameworks.', assigneeRole: 'lead', dueOffset: 140, priority: 'high', labels: ['writing', 'theory'] },
            { title: 'Finalize ethnography', description: 'Complete final manuscript.', assigneeRole: 'lead', dueOffset: 150, priority: 'high', labels: ['writing', 'finalization'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['preparation', 'fieldwork', 'analysis', 'writing', 'completed'] },
    },
    settings: { prolongedEngagement: true, reflexivity: true },
  },

  // ==================== 18. ACTION RESEARCH ====================
  {
    name: 'Action Research',
    slug: 'action-research',
    description: 'Collaborative action research to solve practical problems while generating knowledge.',
    category: 'research',
    icon: 'RefreshCw',
    color: '#2563EB',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'action', name: 'Action', order: 1, color: '#3B82F6' },
      { id: 'observation', name: 'Observation', order: 2, color: '#F59E0B' },
      { id: 'reflection', name: 'Reflection', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Action Cycles', type: 'number', description: 'Number of action cycles planned', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Planning Phase',
          description: 'Plan the action research',
          tasks: [
            { title: 'Identify problem', description: 'Define the practical problem to address.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning', 'problem'] },
            { title: 'Form collaborative team', description: 'Engage stakeholders as co-researchers.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['planning', 'collaboration'] },
            { title: 'Develop action plan', description: 'Design intervention strategy.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['planning', 'intervention'] },
          ],
        },
        {
          name: 'Action Phase',
          description: 'Implement the intervention',
          tasks: [
            { title: 'Implement intervention', description: 'Put action plan into practice.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['action', 'implementation'] },
            { title: 'Document implementation', description: 'Record what actually happens.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['action', 'documentation'] },
            { title: 'Adapt as needed', description: 'Make adjustments during implementation.', assigneeRole: 'lead', dueOffset: 40, priority: 'medium', labels: ['action', 'adaptation'] },
          ],
        },
        {
          name: 'Observation Phase',
          description: 'Observe and collect data',
          tasks: [
            { title: 'Collect data on outcomes', description: 'Gather evidence of effects.', assigneeRole: 'member', dueOffset: 50, priority: 'high', labels: ['observation', 'data'] },
            { title: 'Monitor unintended effects', description: 'Watch for unexpected outcomes.', assigneeRole: 'member', dueOffset: 55, priority: 'high', labels: ['observation', 'effects'] },
            { title: 'Gather stakeholder feedback', description: 'Get input from participants.', assigneeRole: 'member', dueOffset: 58, priority: 'high', labels: ['observation', 'feedback'] },
          ],
        },
        {
          name: 'Reflection Phase',
          description: 'Reflect and plan next cycle',
          tasks: [
            { title: 'Analyze outcomes', description: 'Evaluate what happened.', assigneeRole: 'lead', dueOffset: 65, priority: 'high', labels: ['reflection', 'analysis'] },
            { title: 'Reflect with team', description: 'Collaborative reflection session.', assigneeRole: 'lead', dueOffset: 70, priority: 'high', labels: ['reflection', 'collaboration'] },
            { title: 'Document learnings', description: 'Record insights and knowledge.', assigneeRole: 'member', dueOffset: 75, priority: 'high', labels: ['reflection', 'documentation'] },
            { title: 'Plan next cycle', description: 'Design next action cycle.', assigneeRole: 'lead', dueOffset: 80, priority: 'high', labels: ['reflection', 'planning'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'action', 'observation', 'reflection', 'completed'] },
    },
    settings: { cyclicalProcess: true, participatory: true },
  },

  // ==================== 19. EXPERIMENTAL DESIGN ====================
  {
    name: 'Experimental Design',
    slug: 'experimental-design',
    description: 'Controlled experimental research to establish causal relationships.',
    category: 'research',
    icon: 'Beaker',
    color: '#7C3AED',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'design', name: 'Design', order: 0, color: '#6B7280' },
      { id: 'preparation', name: 'Preparation', order: 1, color: '#3B82F6' },
      { id: 'execution', name: 'Execution', order: 2, color: '#F59E0B' },
      { id: 'analysis', name: 'Analysis', order: 3, color: '#8B5CF6' },
      { id: 'reporting', name: 'Reporting', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Design Type', type: 'select', description: 'Experimental design type', options: ['Between-subjects', 'Within-subjects', 'Mixed', 'Factorial'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Experimental Design',
          description: 'Design the experiment',
          tasks: [
            { title: 'Define hypotheses', description: 'State null and alternative hypotheses.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['design', 'hypotheses'] },
            { title: 'Identify variables', description: 'Define IV, DV, and control variables.', assigneeRole: 'lead', dueOffset: 3, priority: 'high', labels: ['design', 'variables'] },
            { title: 'Select design type', description: 'Choose experimental design.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['design', 'methodology'] },
            { title: 'Plan randomization', description: 'Design random assignment procedure.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['design', 'randomization'] },
          ],
        },
        {
          name: 'Preparation',
          description: 'Prepare for experiment',
          tasks: [
            { title: 'Develop materials', description: 'Create experimental materials.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['preparation', 'materials'] },
            { title: 'Set up lab environment', description: 'Configure experimental setting.', assigneeRole: 'member', dueOffset: 18, priority: 'high', labels: ['preparation', 'setup'] },
            { title: 'Pilot test', description: 'Run pilot experiment.', assigneeRole: 'member', dueOffset: 22, priority: 'high', labels: ['preparation', 'pilot'] },
            { title: 'Recruit participants', description: 'Recruit experimental subjects.', assigneeRole: 'member', dueOffset: 30, priority: 'high', labels: ['preparation', 'recruitment'] },
          ],
        },
        {
          name: 'Execution',
          description: 'Run the experiment',
          tasks: [
            { title: 'Randomize participants', description: 'Assign to conditions.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['execution', 'randomization'] },
            { title: 'Administer treatments', description: 'Deliver experimental conditions.', assigneeRole: 'member', dueOffset: 50, priority: 'high', labels: ['execution', 'treatment'] },
            { title: 'Collect measures', description: 'Record dependent variables.', assigneeRole: 'member', dueOffset: 55, priority: 'high', labels: ['execution', 'measurement'] },
            { title: 'Debrief participants', description: 'Provide debriefing.', assigneeRole: 'member', dueOffset: 58, priority: 'medium', labels: ['execution', 'debrief'] },
          ],
        },
        {
          name: 'Analysis',
          description: 'Analyze experimental data',
          tasks: [
            { title: 'Check manipulation', description: 'Verify manipulation effectiveness.', assigneeRole: 'member', dueOffset: 62, priority: 'high', labels: ['analysis', 'manipulation'] },
            { title: 'Run statistical tests', description: 'Conduct planned analyses.', assigneeRole: 'member', dueOffset: 68, priority: 'high', labels: ['analysis', 'statistics'] },
            { title: 'Calculate effect sizes', description: 'Determine effect magnitudes.', assigneeRole: 'member', dueOffset: 72, priority: 'high', labels: ['analysis', 'effects'] },
          ],
        },
        {
          name: 'Reporting',
          description: 'Report results',
          tasks: [
            { title: 'Write results', description: 'Document findings.', assigneeRole: 'member', dueOffset: 80, priority: 'high', labels: ['reporting', 'results'] },
            { title: 'Discuss implications', description: 'Interpret findings.', assigneeRole: 'lead', dueOffset: 88, priority: 'high', labels: ['reporting', 'discussion'] },
            { title: 'Submit paper', description: 'Finalize and submit.', assigneeRole: 'lead', dueOffset: 95, priority: 'high', labels: ['reporting', 'submission'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['design', 'preparation', 'execution', 'analysis', 'reporting'] },
    },
    settings: { preregistration: true, blindingRequired: true },
  },

  // ==================== 20. CLINICAL TRIAL ====================
  {
    name: 'Clinical Trial',
    slug: 'clinical-trial',
    description: 'Clinical trial research project following regulatory guidelines and protocols.',
    category: 'research',
    icon: 'Stethoscope',
    color: '#0891B2',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'protocol', name: 'Protocol', order: 0, color: '#6B7280' },
      { id: 'approval', name: 'Approval', order: 1, color: '#3B82F6' },
      { id: 'enrollment', name: 'Enrollment', order: 2, color: '#F59E0B' },
      { id: 'treatment', name: 'Treatment', order: 3, color: '#8B5CF6' },
      { id: 'analysis', name: 'Analysis', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Trial Phase', type: 'select', description: 'Clinical trial phase', options: ['Phase I', 'Phase II', 'Phase III', 'Phase IV'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Protocol Development',
          description: 'Develop trial protocol',
          tasks: [
            { title: 'Define endpoints', description: 'Specify primary and secondary endpoints.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['protocol', 'endpoints'] },
            { title: 'Design trial', description: 'Create detailed trial design.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['protocol', 'design'] },
            { title: 'Write protocol', description: 'Complete full protocol document.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['protocol', 'documentation'] },
            { title: 'Statistical analysis plan', description: 'Develop SAP.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['protocol', 'statistics'] },
          ],
        },
        {
          name: 'Regulatory Approval',
          description: 'Obtain approvals',
          tasks: [
            { title: 'IRB submission', description: 'Submit to ethics board.', assigneeRole: 'lead', dueOffset: 42, priority: 'high', labels: ['approval', 'irb'] },
            { title: 'Regulatory filing', description: 'Submit to regulatory agency.', assigneeRole: 'lead', dueOffset: 50, priority: 'high', labels: ['approval', 'regulatory'] },
            { title: 'Site agreements', description: 'Execute site contracts.', assigneeRole: 'member', dueOffset: 60, priority: 'high', labels: ['approval', 'sites'] },
          ],
        },
        {
          name: 'Enrollment',
          description: 'Recruit and enroll participants',
          tasks: [
            { title: 'Screen participants', description: 'Screen against eligibility.', assigneeRole: 'member', dueOffset: 90, priority: 'high', labels: ['enrollment', 'screening'] },
            { title: 'Informed consent', description: 'Obtain consent.', assigneeRole: 'member', dueOffset: 95, priority: 'high', labels: ['enrollment', 'consent'] },
            { title: 'Baseline assessments', description: 'Conduct baseline measures.', assigneeRole: 'member', dueOffset: 100, priority: 'high', labels: ['enrollment', 'baseline'] },
            { title: 'Randomize participants', description: 'Assign to arms.', assigneeRole: 'member', dueOffset: 105, priority: 'high', labels: ['enrollment', 'randomization'] },
          ],
        },
        {
          name: 'Treatment Phase',
          description: 'Administer treatment',
          tasks: [
            { title: 'Administer interventions', description: 'Deliver treatments per protocol.', assigneeRole: 'member', dueOffset: 150, priority: 'high', labels: ['treatment', 'intervention'] },
            { title: 'Safety monitoring', description: 'Monitor adverse events.', assigneeRole: 'member', dueOffset: 160, priority: 'high', labels: ['treatment', 'safety'] },
            { title: 'Follow-up visits', description: 'Conduct protocol visits.', assigneeRole: 'member', dueOffset: 180, priority: 'high', labels: ['treatment', 'follow-up'] },
          ],
        },
        {
          name: 'Analysis and Reporting',
          description: 'Analyze and report',
          tasks: [
            { title: 'Database lock', description: 'Lock database for analysis.', assigneeRole: 'lead', dueOffset: 200, priority: 'high', labels: ['analysis', 'data'] },
            { title: 'Primary analysis', description: 'Conduct primary endpoint analysis.', assigneeRole: 'member', dueOffset: 210, priority: 'high', labels: ['analysis', 'primary'] },
            { title: 'Clinical study report', description: 'Write CSR.', assigneeRole: 'lead', dueOffset: 230, priority: 'high', labels: ['analysis', 'reporting'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['protocol', 'approval', 'enrollment', 'treatment', 'analysis'] },
    },
    settings: { gcp: true, dsmb: true },
  },

  // ==================== 21. A/B TESTING RESEARCH ====================
  {
    name: 'A/B Testing Research',
    slug: 'ab-testing-research',
    description: 'Comprehensive A/B testing project for product and UX experiments.',
    category: 'research',
    icon: 'SplitSquareVertical',
    color: '#EA580C',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'hypothesis', name: 'Hypothesis', order: 0, color: '#6B7280' },
      { id: 'design', name: 'Design', order: 1, color: '#3B82F6' },
      { id: 'running', name: 'Running', order: 2, color: '#F59E0B' },
      { id: 'analysis', name: 'Analysis', order: 3, color: '#8B5CF6' },
      { id: 'decision', name: 'Decision', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Primary Metric', type: 'text', description: 'Main success metric', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Hypothesis',
          description: 'Define test hypothesis',
          tasks: [
            { title: 'Identify opportunity', description: 'Find area for improvement.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['hypothesis', 'opportunity'] },
            { title: 'Write hypothesis', description: 'Formulate testable hypothesis.', assigneeRole: 'lead', dueOffset: 3, priority: 'high', labels: ['hypothesis', 'documentation'] },
            { title: 'Define metrics', description: 'Specify success metrics.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['hypothesis', 'metrics'] },
          ],
        },
        {
          name: 'Test Design',
          description: 'Design the experiment',
          tasks: [
            { title: 'Design variants', description: 'Create A and B versions.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['design', 'variants'] },
            { title: 'Calculate sample size', description: 'Determine required sample.', assigneeRole: 'member', dueOffset: 12, priority: 'high', labels: ['design', 'statistics'] },
            { title: 'Set up tracking', description: 'Implement event tracking.', assigneeRole: 'member', dueOffset: 15, priority: 'high', labels: ['design', 'tracking'] },
            { title: 'QA test', description: 'Verify test setup.', assigneeRole: 'member', dueOffset: 18, priority: 'high', labels: ['design', 'qa'] },
          ],
        },
        {
          name: 'Running Test',
          description: 'Execute the test',
          tasks: [
            { title: 'Launch test', description: 'Start the experiment.', assigneeRole: 'lead', dueOffset: 20, priority: 'high', labels: ['running', 'launch'] },
            { title: 'Monitor health', description: 'Check for issues.', assigneeRole: 'member', dueOffset: 22, priority: 'high', labels: ['running', 'monitoring'] },
            { title: 'Wait for significance', description: 'Allow test to reach sample size.', assigneeRole: 'member', dueOffset: 40, priority: 'high', labels: ['running', 'duration'] },
          ],
        },
        {
          name: 'Analysis',
          description: 'Analyze results',
          tasks: [
            { title: 'Run statistical analysis', description: 'Calculate significance.', assigneeRole: 'member', dueOffset: 45, priority: 'high', labels: ['analysis', 'statistics'] },
            { title: 'Segment analysis', description: 'Analyze by user segments.', assigneeRole: 'member', dueOffset: 48, priority: 'medium', labels: ['analysis', 'segments'] },
            { title: 'Document findings', description: 'Write up results.', assigneeRole: 'member', dueOffset: 52, priority: 'high', labels: ['analysis', 'documentation'] },
          ],
        },
        {
          name: 'Decision',
          description: 'Make and implement decision',
          tasks: [
            { title: 'Review with stakeholders', description: 'Present results.', assigneeRole: 'lead', dueOffset: 55, priority: 'high', labels: ['decision', 'review'] },
            { title: 'Make decision', description: 'Decide ship/iterate/kill.', assigneeRole: 'lead', dueOffset: 57, priority: 'high', labels: ['decision', 'conclusion'] },
            { title: 'Implement winner', description: 'Roll out winning variant.', assigneeRole: 'member', dueOffset: 62, priority: 'high', labels: ['decision', 'implementation'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['hypothesis', 'design', 'running', 'analysis', 'decision'] },
    },
    settings: { experimentTracking: true, statisticalRigor: true },
  },

  // ==================== 22. USER RESEARCH PROJECT ====================
  {
    name: 'User Research Project',
    slug: 'user-research-project',
    description: 'Comprehensive user research to understand user needs and behaviors.',
    category: 'research',
    icon: 'UserSearch',
    color: '#D946EF',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'recruiting', name: 'Recruiting', order: 1, color: '#3B82F6' },
      { id: 'research', name: 'Research', order: 2, color: '#F59E0B' },
      { id: 'synthesis', name: 'Synthesis', order: 3, color: '#8B5CF6' },
      { id: 'delivery', name: 'Delivery', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Research Methods', type: 'multiselect', description: 'Methods to use', options: ['Interviews', 'Surveys', 'Usability Testing', 'Diary Study', 'Card Sorting'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Research Planning',
          description: 'Plan the research',
          tasks: [
            { title: 'Define objectives', description: 'Clarify research goals.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning', 'objectives'] },
            { title: 'Select methods', description: 'Choose research methods.', assigneeRole: 'lead', dueOffset: 3, priority: 'high', labels: ['planning', 'methods'] },
            { title: 'Create research plan', description: 'Document full plan.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['planning', 'documentation'] },
          ],
        },
        {
          name: 'Participant Recruiting',
          description: 'Recruit participants',
          tasks: [
            { title: 'Define criteria', description: 'Specify participant requirements.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['recruiting', 'criteria'] },
            { title: 'Recruit participants', description: 'Source and schedule participants.', assigneeRole: 'member', dueOffset: 20, priority: 'high', labels: ['recruiting', 'sourcing'] },
            { title: 'Screen participants', description: 'Verify fit.', assigneeRole: 'member', dueOffset: 22, priority: 'high', labels: ['recruiting', 'screening'] },
          ],
        },
        {
          name: 'Conducting Research',
          description: 'Execute research sessions',
          tasks: [
            { title: 'Conduct sessions', description: 'Run all research sessions.', assigneeRole: 'member', dueOffset: 40, priority: 'high', labels: ['research', 'sessions'] },
            { title: 'Take notes', description: 'Document observations.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['research', 'notes'] },
            { title: 'Collect artifacts', description: 'Gather recordings and materials.', assigneeRole: 'member', dueOffset: 45, priority: 'medium', labels: ['research', 'artifacts'] },
          ],
        },
        {
          name: 'Synthesis',
          description: 'Synthesize findings',
          tasks: [
            { title: 'Analyze data', description: 'Code and analyze data.', assigneeRole: 'member', dueOffset: 52, priority: 'high', labels: ['synthesis', 'analysis'] },
            { title: 'Identify insights', description: 'Extract key insights.', assigneeRole: 'lead', dueOffset: 58, priority: 'high', labels: ['synthesis', 'insights'] },
            { title: 'Create artifacts', description: 'Build personas, journey maps.', assigneeRole: 'member', dueOffset: 65, priority: 'high', labels: ['synthesis', 'artifacts'] },
          ],
        },
        {
          name: 'Delivery',
          description: 'Deliver findings',
          tasks: [
            { title: 'Create presentation', description: 'Build findings deck.', assigneeRole: 'member', dueOffset: 72, priority: 'high', labels: ['delivery', 'presentation'] },
            { title: 'Present to stakeholders', description: 'Share findings.', assigneeRole: 'lead', dueOffset: 78, priority: 'high', labels: ['delivery', 'presentation'] },
            { title: 'Archive research', description: 'Store in repository.', assigneeRole: 'member', dueOffset: 82, priority: 'medium', labels: ['delivery', 'archive'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'recruiting', 'research', 'synthesis', 'delivery'] },
    },
    settings: { participantTracking: true, insightRepository: true },
  },

  // ==================== 23. CONSUMER RESEARCH ====================
  {
    name: 'Consumer Research',
    slug: 'consumer-research',
    description: 'Consumer research to understand purchasing behavior and preferences.',
    category: 'research',
    icon: 'ShoppingCart',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'research', name: 'Research', order: 1, color: '#3B82F6' },
      { id: 'analysis', name: 'Analysis', order: 2, color: '#F59E0B' },
      { id: 'insights', name: 'Insights', order: 3, color: '#8B5CF6' },
      { id: 'delivery', name: 'Delivery', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Consumer Segment', type: 'text', description: 'Target consumer segment', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Research Planning',
          description: 'Plan consumer research',
          tasks: [
            { title: 'Define research questions', description: 'Identify what to learn.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning', 'questions'] },
            { title: 'Select methodology', description: 'Choose research approach.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['planning', 'methodology'] },
            { title: 'Design research instruments', description: 'Create surveys or guides.', assigneeRole: 'member', dueOffset: 12, priority: 'high', labels: ['planning', 'instruments'] },
          ],
        },
        {
          name: 'Data Collection',
          description: 'Collect consumer data',
          tasks: [
            { title: 'Recruit consumers', description: 'Find target consumers.', assigneeRole: 'member', dueOffset: 20, priority: 'high', labels: ['research', 'recruitment'] },
            { title: 'Conduct research', description: 'Execute research activities.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['research', 'execution'] },
            { title: 'Collect behavioral data', description: 'Gather purchase and usage data.', assigneeRole: 'member', dueOffset: 40, priority: 'high', labels: ['research', 'behavioral'] },
          ],
        },
        {
          name: 'Analysis',
          description: 'Analyze consumer data',
          tasks: [
            { title: 'Analyze survey data', description: 'Process quantitative data.', assigneeRole: 'member', dueOffset: 48, priority: 'high', labels: ['analysis', 'quantitative'] },
            { title: 'Analyze qualitative data', description: 'Code and theme qualitative data.', assigneeRole: 'member', dueOffset: 55, priority: 'high', labels: ['analysis', 'qualitative'] },
            { title: 'Segment analysis', description: 'Analyze by consumer segments.', assigneeRole: 'member', dueOffset: 60, priority: 'high', labels: ['analysis', 'segmentation'] },
          ],
        },
        {
          name: 'Insights Development',
          description: 'Develop consumer insights',
          tasks: [
            { title: 'Identify key insights', description: 'Extract actionable insights.', assigneeRole: 'lead', dueOffset: 68, priority: 'high', labels: ['insights', 'key-findings'] },
            { title: 'Develop personas', description: 'Create consumer personas.', assigneeRole: 'member', dueOffset: 73, priority: 'high', labels: ['insights', 'personas'] },
            { title: 'Map consumer journey', description: 'Document decision journey.', assigneeRole: 'member', dueOffset: 78, priority: 'high', labels: ['insights', 'journey'] },
          ],
        },
        {
          name: 'Delivery',
          description: 'Deliver insights',
          tasks: [
            { title: 'Create report', description: 'Write insights report.', assigneeRole: 'member', dueOffset: 85, priority: 'high', labels: ['delivery', 'report'] },
            { title: 'Present findings', description: 'Share with stakeholders.', assigneeRole: 'lead', dueOffset: 92, priority: 'high', labels: ['delivery', 'presentation'] },
            { title: 'Develop recommendations', description: 'Create strategic recommendations.', assigneeRole: 'lead', dueOffset: 98, priority: 'high', labels: ['delivery', 'recommendations'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'research', 'analysis', 'insights', 'delivery'] },
    },
    settings: { consumerPanels: true, behavioralData: true },
  },

  // ==================== 24. COMPETITOR RESEARCH ====================
  {
    name: 'Competitor Research',
    slug: 'competitor-research',
    description: 'In-depth competitor research to understand competitive landscape.',
    category: 'research',
    icon: 'Target',
    color: '#EF4444',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'scoping', name: 'Scoping', order: 0, color: '#6B7280' },
      { id: 'research', name: 'Research', order: 1, color: '#3B82F6' },
      { id: 'analysis', name: 'Analysis', order: 2, color: '#F59E0B' },
      { id: 'strategy', name: 'Strategy', order: 3, color: '#8B5CF6' },
      { id: 'delivery', name: 'Delivery', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Focus Area', type: 'select', description: 'Primary focus', options: ['Product', 'Pricing', 'Marketing', 'Technology', 'Full Business'], isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Scoping',
          description: 'Define research scope',
          tasks: [
            { title: 'Identify competitors', description: 'List direct and indirect competitors.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['scoping', 'competitors'] },
            { title: 'Define analysis framework', description: 'Decide comparison dimensions.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['scoping', 'framework'] },
            { title: 'Prioritize competitors', description: 'Focus on key competitors.', assigneeRole: 'lead', dueOffset: 8, priority: 'high', labels: ['scoping', 'prioritization'] },
          ],
        },
        {
          name: 'Research',
          description: 'Gather competitive intelligence',
          tasks: [
            { title: 'Product analysis', description: 'Analyze competitor products.', assigneeRole: 'member', dueOffset: 15, priority: 'high', labels: ['research', 'product'] },
            { title: 'Pricing analysis', description: 'Research pricing strategies.', assigneeRole: 'member', dueOffset: 20, priority: 'high', labels: ['research', 'pricing'] },
            { title: 'Marketing analysis', description: 'Study marketing approaches.', assigneeRole: 'member', dueOffset: 25, priority: 'high', labels: ['research', 'marketing'] },
            { title: 'Customer feedback', description: 'Analyze competitor reviews.', assigneeRole: 'member', dueOffset: 30, priority: 'medium', labels: ['research', 'feedback'] },
          ],
        },
        {
          name: 'Analysis',
          description: 'Analyze competitive position',
          tasks: [
            { title: 'Feature comparison', description: 'Create feature matrix.', assigneeRole: 'member', dueOffset: 38, priority: 'high', labels: ['analysis', 'features'] },
            { title: 'SWOT analysis', description: 'Analyze strengths and weaknesses.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['analysis', 'swot'] },
            { title: 'Positioning map', description: 'Create competitive positioning.', assigneeRole: 'member', dueOffset: 46, priority: 'high', labels: ['analysis', 'positioning'] },
          ],
        },
        {
          name: 'Strategy',
          description: 'Develop strategic response',
          tasks: [
            { title: 'Identify opportunities', description: 'Find competitive gaps.', assigneeRole: 'lead', dueOffset: 52, priority: 'high', labels: ['strategy', 'opportunities'] },
            { title: 'Develop recommendations', description: 'Create strategic recommendations.', assigneeRole: 'lead', dueOffset: 58, priority: 'high', labels: ['strategy', 'recommendations'] },
            { title: 'Create battle cards', description: 'Build sales enablement tools.', assigneeRole: 'member', dueOffset: 63, priority: 'medium', labels: ['strategy', 'sales'] },
          ],
        },
        {
          name: 'Delivery',
          description: 'Deliver analysis',
          tasks: [
            { title: 'Write report', description: 'Document full analysis.', assigneeRole: 'member', dueOffset: 70, priority: 'high', labels: ['delivery', 'report'] },
            { title: 'Present findings', description: 'Share with stakeholders.', assigneeRole: 'lead', dueOffset: 78, priority: 'high', labels: ['delivery', 'presentation'] },
            { title: 'Set up monitoring', description: 'Establish ongoing tracking.', assigneeRole: 'member', dueOffset: 82, priority: 'medium', labels: ['delivery', 'monitoring'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['scoping', 'research', 'analysis', 'strategy', 'delivery'] },
    },
    settings: { competitiveIntelligence: true, salesEnablement: true },
  },

  // ==================== 25. INDUSTRY ANALYSIS ====================
  {
    name: 'Industry Analysis',
    slug: 'industry-analysis',
    description: 'Comprehensive industry analysis to understand market dynamics and trends.',
    category: 'research',
    icon: 'Building2',
    color: '#6366F1',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'scoping', name: 'Scoping', order: 0, color: '#6B7280' },
      { id: 'research', name: 'Research', order: 1, color: '#3B82F6' },
      { id: 'analysis', name: 'Analysis', order: 2, color: '#F59E0B' },
      { id: 'synthesis', name: 'Synthesis', order: 3, color: '#8B5CF6' },
      { id: 'delivery', name: 'Delivery', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Industry', type: 'text', description: 'Industry being analyzed', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Scoping',
          description: 'Define analysis scope',
          tasks: [
            { title: 'Define industry boundaries', description: 'Specify industry scope.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['scoping', 'boundaries'] },
            { title: 'Identify key questions', description: 'List analysis questions.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['scoping', 'questions'] },
            { title: 'Map data sources', description: 'Identify information sources.', assigneeRole: 'member', dueOffset: 8, priority: 'high', labels: ['scoping', 'sources'] },
          ],
        },
        {
          name: 'Research',
          description: 'Gather industry data',
          tasks: [
            { title: 'Market size research', description: 'Determine market size and growth.', assigneeRole: 'member', dueOffset: 15, priority: 'high', labels: ['research', 'market-size'] },
            { title: 'Industry structure', description: 'Map industry participants.', assigneeRole: 'member', dueOffset: 22, priority: 'high', labels: ['research', 'structure'] },
            { title: 'Regulatory environment', description: 'Research regulations.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['research', 'regulatory'] },
            { title: 'Technology landscape', description: 'Analyze technology trends.', assigneeRole: 'member', dueOffset: 32, priority: 'medium', labels: ['research', 'technology'] },
          ],
        },
        {
          name: 'Analysis',
          description: 'Analyze industry dynamics',
          tasks: [
            { title: 'Porter five forces', description: 'Conduct five forces analysis.', assigneeRole: 'member', dueOffset: 40, priority: 'high', labels: ['analysis', 'five-forces'] },
            { title: 'PESTEL analysis', description: 'Analyze macro environment.', assigneeRole: 'member', dueOffset: 45, priority: 'high', labels: ['analysis', 'pestel'] },
            { title: 'Value chain analysis', description: 'Map industry value chain.', assigneeRole: 'member', dueOffset: 50, priority: 'high', labels: ['analysis', 'value-chain'] },
          ],
        },
        {
          name: 'Synthesis',
          description: 'Synthesize findings',
          tasks: [
            { title: 'Identify key drivers', description: 'Determine industry drivers.', assigneeRole: 'lead', dueOffset: 58, priority: 'high', labels: ['synthesis', 'drivers'] },
            { title: 'Forecast trends', description: 'Project future developments.', assigneeRole: 'lead', dueOffset: 65, priority: 'high', labels: ['synthesis', 'forecasting'] },
            { title: 'Strategic implications', description: 'Draw strategic conclusions.', assigneeRole: 'lead', dueOffset: 70, priority: 'high', labels: ['synthesis', 'strategy'] },
          ],
        },
        {
          name: 'Delivery',
          description: 'Deliver analysis',
          tasks: [
            { title: 'Write industry report', description: 'Document full analysis.', assigneeRole: 'member', dueOffset: 78, priority: 'high', labels: ['delivery', 'report'] },
            { title: 'Create executive summary', description: 'Write executive brief.', assigneeRole: 'lead', dueOffset: 85, priority: 'high', labels: ['delivery', 'summary'] },
            { title: 'Present findings', description: 'Share with stakeholders.', assigneeRole: 'lead', dueOffset: 90, priority: 'high', labels: ['delivery', 'presentation'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['scoping', 'research', 'analysis', 'synthesis', 'delivery'] },
    },
    settings: { frameworkBased: true, dataVisualization: true },
  },
];
