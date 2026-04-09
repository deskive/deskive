/**
 * Marketing Project Templates
 * Pre-built templates for marketing campaigns, product launches, and content strategies
 */

export const MARKETING_TEMPLATES = [
  // ==================== 1. PRODUCT LAUNCH CAMPAIGN ====================
  {
    name: 'Product Launch Campaign',
    slug: 'product-launch-campaign',
    description:
      'Complete product launch template covering pre-launch buzz, launch day activities, and post-launch follow-up. Perfect for coordinating cross-functional teams.',
    category: 'marketing',
    icon: 'Rocket',
    color: '#EC4899',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'in_progress', name: 'In Progress', order: 1, color: '#3B82F6' },
      { id: 'review', name: 'Review', order: 2, color: '#F59E0B' },
      { id: 'approved', name: 'Approved', order: 3, color: '#8B5CF6' },
      { id: 'published', name: 'Published', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Channel',
        type: 'select',
        description: 'Marketing channel',
        options: ['Social Media', 'Email', 'Blog', 'Press', 'Paid Ads', 'Website'],
        isRequired: false,
      },
      {
        name: 'Target Audience',
        type: 'select',
        description: 'Primary target audience',
        options: ['Existing Customers', 'New Prospects', 'Enterprise', 'SMB', 'General'],
        isRequired: false,
      },
      {
        name: 'Launch Date',
        type: 'date',
        description: 'Target launch date',
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Pre-Launch (4-6 weeks before)',
          description: 'Building anticipation and preparing assets',
          tasks: [
            {
              title: 'Define launch goals and KPIs',
              description:
                'Set clear objectives for the launch: signups, sales, awareness metrics.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'strategy'],
              subtasks: [
                { title: 'Define primary success metric' },
                { title: 'Set target numbers' },
                { title: 'Identify tracking methods' },
              ],
            },
            {
              title: 'Create messaging framework',
              description:
                'Develop key messages, positioning, and value propositions.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['content', 'strategy'],
              subtasks: [
                { title: 'Write product positioning statement' },
                { title: 'Create key messaging points' },
                { title: 'Develop taglines and slogans' },
              ],
            },
            {
              title: 'Design launch landing page',
              description:
                'Create a dedicated landing page for the product launch.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['design', 'web'],
              subtasks: [
                { title: 'Wireframe landing page' },
                { title: 'Write landing page copy' },
                { title: 'Design visual assets' },
                { title: 'Implement and test page' },
              ],
            },
            {
              title: 'Create teaser content',
              description:
                'Develop teaser posts and content to build anticipation.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'medium',
              labels: ['content', 'social'],
            },
            {
              title: 'Prepare email sequences',
              description:
                'Create pre-launch, launch day, and follow-up email sequences.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['email', 'content'],
              subtasks: [
                { title: 'Write teaser email series' },
                { title: 'Write launch announcement email' },
                { title: 'Create follow-up sequence' },
              ],
            },
            {
              title: 'Brief PR and communications team',
              description:
                'Prepare press materials and brief PR team on key messages.',
              assigneeRole: 'lead',
              dueOffset: 10,
              priority: 'medium',
              labels: ['pr', 'communications'],
            },
          ],
        },
        {
          name: 'Launch Week',
          description: 'Final preparations and launch execution',
          tasks: [
            {
              title: 'Final asset review',
              description:
                'Review all launch assets for quality and consistency.',
              assigneeRole: 'lead',
              dueOffset: 21,
              priority: 'high',
              labels: ['review'],
              subtasks: [
                { title: 'Review landing page' },
                { title: 'Check email sequences' },
                { title: 'Verify social media posts' },
                { title: 'Test all links and CTAs' },
              ],
            },
            {
              title: 'Coordinate with sales team',
              description:
                'Brief sales team on launch details and enable them with materials.',
              assigneeRole: 'lead',
              dueOffset: 23,
              priority: 'high',
              labels: ['sales', 'enablement'],
            },
            {
              title: 'Schedule social media posts',
              description:
                'Schedule all launch-related social media content.',
              assigneeRole: 'member',
              dueOffset: 24,
              priority: 'high',
              labels: ['social', 'execution'],
            },
            {
              title: 'Launch Day: Execute campaign',
              description:
                'Publish landing page, send emails, post on social media.',
              assigneeRole: 'lead',
              dueOffset: 28,
              priority: 'urgent',
              labels: ['launch', 'execution'],
              subtasks: [
                { title: 'Publish landing page' },
                { title: 'Send launch email' },
                { title: 'Publish social media posts' },
                { title: 'Send press release' },
              ],
            },
            {
              title: 'Monitor and respond',
              description:
                'Monitor social media, comments, and respond to inquiries.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['monitoring', 'engagement'],
            },
          ],
        },
        {
          name: 'Post-Launch',
          description: 'Follow-up and performance analysis',
          tasks: [
            {
              title: 'Analyze launch performance',
              description:
                'Review metrics and compare against KPIs.',
              assigneeRole: 'lead',
              dueOffset: 35,
              priority: 'high',
              labels: ['analytics', 'reporting'],
              subtasks: [
                { title: 'Collect traffic data' },
                { title: 'Analyze conversion rates' },
                { title: 'Review social engagement' },
                { title: 'Calculate ROI' },
              ],
            },
            {
              title: 'Gather customer feedback',
              description:
                'Collect initial customer feedback and testimonials.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'medium',
              labels: ['feedback', 'customer'],
            },
            {
              title: 'Create launch retrospective',
              description:
                'Document what worked, what didnt, and lessons learned.',
              assigneeRole: 'lead',
              dueOffset: 42,
              priority: 'medium',
              labels: ['retrospective', 'documentation'],
            },
            {
              title: 'Plan ongoing promotion',
              description:
                'Develop plan for sustained marketing after launch.',
              assigneeRole: 'lead',
              dueOffset: 42,
              priority: 'medium',
              labels: ['planning', 'strategy'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'in_progress', 'review', 'approved', 'published'],
      },
    },
    settings: {
      trackDeadlines: true,
      requiresApproval: true,
    },
  },

  // ==================== 2. CONTENT CALENDAR ====================
  {
    name: 'Content Calendar',
    slug: 'content-calendar',
    description:
      'Monthly content planning template for blogs, social media, newsletters, and video content. Organize your content pipeline effectively.',
    category: 'marketing',
    icon: 'Calendar',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'ideas', name: 'Ideas', order: 0, color: '#6B7280' },
      { id: 'planned', name: 'Planned', order: 1, color: '#3B82F6' },
      { id: 'creating', name: 'Creating', order: 2, color: '#F59E0B' },
      { id: 'editing', name: 'Editing', order: 3, color: '#8B5CF6' },
      { id: 'scheduled', name: 'Scheduled', order: 4, color: '#EC4899' },
      { id: 'published', name: 'Published', order: 5, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Content Type',
        type: 'select',
        description: 'Type of content',
        options: ['Blog Post', 'Social Post', 'Video', 'Podcast', 'Newsletter', 'Infographic'],
        isRequired: true,
      },
      {
        name: 'Platform',
        type: 'multiselect',
        description: 'Where content will be published',
        options: ['Website', 'LinkedIn', 'Twitter', 'Instagram', 'YouTube', 'Email'],
        isRequired: false,
      },
      {
        name: 'Publish Date',
        type: 'date',
        description: 'Target publish date',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Content strategy and planning',
          tasks: [
            {
              title: 'Monthly theme and goals',
              description:
                'Define the overarching theme and content goals for the month.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'strategy'],
              subtasks: [
                { title: 'Review previous month performance' },
                { title: 'Set monthly content goals' },
                { title: 'Define monthly theme' },
              ],
            },
            {
              title: 'Keyword and topic research',
              description:
                'Research trending topics and keywords for content optimization.',
              assigneeRole: 'member',
              dueOffset: 2,
              priority: 'high',
              labels: ['research', 'seo'],
            },
            {
              title: 'Content ideation session',
              description:
                'Brainstorm content ideas aligned with monthly theme.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'brainstorm'],
            },
            {
              title: 'Create content calendar',
              description:
                'Map out publication schedule for the month.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['planning', 'schedule'],
            },
          ],
        },
        {
          name: 'Blog Content',
          description: 'Blog posts for the month',
          tasks: [
            {
              title: 'Blog Post: Week 1',
              description:
                'Research, write, and publish first blog post of the month.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['blog', 'content'],
              subtasks: [
                { title: 'Research and outline' },
                { title: 'Write first draft' },
                { title: 'Add visuals and formatting' },
                { title: 'SEO optimization' },
              ],
            },
            {
              title: 'Blog Post: Week 2',
              description:
                'Research, write, and publish second blog post.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['blog', 'content'],
            },
            {
              title: 'Blog Post: Week 3',
              description:
                'Research, write, and publish third blog post.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['blog', 'content'],
            },
            {
              title: 'Blog Post: Week 4',
              description:
                'Research, write, and publish fourth blog post.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['blog', 'content'],
            },
          ],
        },
        {
          name: 'Social Media',
          description: 'Social media content',
          tasks: [
            {
              title: 'Create social media posts batch',
              description:
                'Create batch of social media posts for the month.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['social', 'content'],
              subtasks: [
                { title: 'Write post copy' },
                { title: 'Create visual assets' },
                { title: 'Schedule in management tool' },
              ],
            },
            {
              title: 'Engagement strategy',
              description:
                'Plan community engagement and response strategy.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'medium',
              labels: ['social', 'engagement'],
            },
          ],
        },
        {
          name: 'Newsletter',
          description: 'Email newsletter content',
          tasks: [
            {
              title: 'Newsletter: Week 2',
              description:
                'Create and send bi-weekly newsletter.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['email', 'newsletter'],
              subtasks: [
                { title: 'Curate content highlights' },
                { title: 'Write newsletter copy' },
                { title: 'Design email layout' },
                { title: 'Test and send' },
              ],
            },
            {
              title: 'Newsletter: Week 4',
              description:
                'Create and send end-of-month newsletter.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['email', 'newsletter'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['ideas', 'planned', 'creating', 'editing', 'scheduled', 'published'],
      },
    },
    settings: {
      recurring: true,
      monthlyReset: true,
    },
  },

  // ==================== 3. SEO AUDIT & OPTIMIZATION ====================
  {
    name: 'SEO Audit & Optimization',
    slug: 'seo-audit-optimization',
    description:
      'Comprehensive SEO audit template covering technical SEO, on-page optimization, content analysis, and link building strategies.',
    category: 'marketing',
    icon: 'Search',
    color: '#10B981',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'audit', name: 'Audit', order: 0, color: '#6B7280' },
      { id: 'analysis', name: 'Analysis', order: 1, color: '#3B82F6' },
      { id: 'implementation', name: 'Implementation', order: 2, color: '#F59E0B' },
      { id: 'monitoring', name: 'Monitoring', order: 3, color: '#8B5CF6' },
      { id: 'done', name: 'Done', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'SEO Category',
        type: 'select',
        description: 'Area of SEO',
        options: ['Technical', 'On-Page', 'Content', 'Off-Page', 'Local'],
        isRequired: false,
      },
      {
        name: 'Priority Score',
        type: 'select',
        description: 'Impact vs effort priority',
        options: ['Quick Win', 'Major Project', 'Fill-In', 'Thankless Task'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Technical SEO Audit',
          description: 'Technical foundation analysis',
          tasks: [
            {
              title: 'Crawlability analysis',
              description:
                'Analyze site crawlability using tools like Screaming Frog.',
              assigneeRole: 'owner',
              dueOffset: 3,
              priority: 'high',
              labels: ['technical', 'audit'],
              subtasks: [
                { title: 'Run site crawl' },
                { title: 'Check robots.txt' },
                { title: 'Review sitemap' },
                { title: 'Identify crawl errors' },
              ],
            },
            {
              title: 'Site speed analysis',
              description:
                'Analyze page load times and Core Web Vitals.',
              assigneeRole: 'owner',
              dueOffset: 3,
              priority: 'high',
              labels: ['technical', 'performance'],
              subtasks: [
                { title: 'Run PageSpeed Insights' },
                { title: 'Check Core Web Vitals' },
                { title: 'Analyze resource loading' },
              ],
            },
            {
              title: 'Mobile-friendliness check',
              description:
                'Ensure site is fully optimized for mobile devices.',
              assigneeRole: 'member',
              dueOffset: 4,
              priority: 'high',
              labels: ['technical', 'mobile'],
            },
            {
              title: 'Security and HTTPS review',
              description:
                'Verify HTTPS implementation and security headers.',
              assigneeRole: 'owner',
              dueOffset: 4,
              priority: 'high',
              labels: ['technical', 'security'],
            },
          ],
        },
        {
          name: 'On-Page SEO Audit',
          description: 'On-page optimization analysis',
          tasks: [
            {
              title: 'Title tag optimization',
              description:
                'Review and optimize title tags across key pages.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['on-page', 'optimization'],
              subtasks: [
                { title: 'Audit current title tags' },
                { title: 'Research target keywords' },
                { title: 'Write optimized titles' },
              ],
            },
            {
              title: 'Meta description review',
              description:
                'Optimize meta descriptions for click-through rate.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'medium',
              labels: ['on-page', 'optimization'],
            },
            {
              title: 'Header structure analysis',
              description:
                'Review H1-H6 structure and keyword usage.',
              assigneeRole: 'member',
              dueOffset: 8,
              priority: 'medium',
              labels: ['on-page', 'content'],
            },
            {
              title: 'Internal linking audit',
              description:
                'Analyze and improve internal link structure.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'medium',
              labels: ['on-page', 'linking'],
            },
          ],
        },
        {
          name: 'Content Analysis',
          description: 'Content quality and optimization',
          tasks: [
            {
              title: 'Content inventory',
              description:
                'Create inventory of all content and assess performance.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['content', 'audit'],
            },
            {
              title: 'Identify content gaps',
              description:
                'Find keyword opportunities without existing content.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['content', 'research'],
            },
            {
              title: 'Update underperforming content',
              description:
                'Refresh and optimize content with declining traffic.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'medium',
              labels: ['content', 'optimization'],
            },
          ],
        },
        {
          name: 'Implementation & Monitoring',
          description: 'Execute fixes and track results',
          tasks: [
            {
              title: 'Implement technical fixes',
              description:
                'Execute technical SEO improvements from audit.',
              assigneeRole: 'owner',
              dueOffset: 21,
              priority: 'high',
              labels: ['implementation', 'technical'],
            },
            {
              title: 'Set up rank tracking',
              description:
                'Configure keyword rank tracking for target keywords.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['monitoring', 'tracking'],
            },
            {
              title: 'Monthly SEO report',
              description:
                'Create template for monthly SEO performance reporting.',
              assigneeRole: 'lead',
              dueOffset: 28,
              priority: 'medium',
              labels: ['reporting', 'analytics'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['audit', 'analysis', 'implementation', 'monitoring', 'done'],
      },
    },
    settings: {
      trackProgress: true,
      quarterlyReview: true,
    },
  },

  // ==================== 4. SOCIAL MEDIA CAMPAIGN ====================
  {
    name: 'Social Media Campaign',
    slug: 'social-media-campaign',
    description:
      'Plan and execute engaging social media campaigns across multiple platforms with consistent messaging and tracking.',
    category: 'marketing',
    icon: 'Share2',
    color: '#3B82F6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creating', name: 'Creating', order: 1, color: '#3B82F6' },
      { id: 'review', name: 'Review', order: 2, color: '#F59E0B' },
      { id: 'scheduled', name: 'Scheduled', order: 3, color: '#8B5CF6' },
      { id: 'live', name: 'Live', order: 4, color: '#EC4899' },
      { id: 'completed', name: 'Completed', order: 5, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Platform',
        type: 'multiselect',
        description: 'Target platforms',
        options: ['Instagram', 'Twitter', 'LinkedIn', 'Facebook', 'TikTok', 'YouTube'],
        isRequired: true,
      },
      {
        name: 'Campaign Type',
        type: 'select',
        description: 'Type of campaign',
        options: ['Brand Awareness', 'Engagement', 'Lead Generation', 'Sales', 'Contest'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy',
          description: 'Campaign strategy and planning',
          tasks: [
            {
              title: 'Define campaign objectives',
              description:
                'Set clear goals, KPIs, and success metrics.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'planning'],
            },
            {
              title: 'Audience research',
              description:
                'Research target audience demographics and behaviors.',
              assigneeRole: 'member',
              dueOffset: 2,
              priority: 'high',
              labels: ['research', 'audience'],
            },
            {
              title: 'Competitor analysis',
              description:
                'Analyze competitor social media strategies.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'medium',
              labels: ['research', 'competitive'],
            },
            {
              title: 'Create content strategy',
              description:
                'Develop content pillars and posting schedule.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['strategy', 'content'],
            },
          ],
        },
        {
          name: 'Content Creation',
          description: 'Create campaign assets',
          tasks: [
            {
              title: 'Design visual assets',
              description:
                'Create graphics, images, and templates for campaign.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['design', 'creative'],
              subtasks: [
                { title: 'Create post templates' },
                { title: 'Design story assets' },
                { title: 'Create video thumbnails' },
              ],
            },
            {
              title: 'Write post copy',
              description:
                'Write engaging captions and copy for all posts.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['content', 'copywriting'],
            },
            {
              title: 'Create video content',
              description:
                'Produce video content for campaign.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'medium',
              labels: ['video', 'content'],
            },
            {
              title: 'Prepare hashtag strategy',
              description:
                'Research and compile relevant hashtags.',
              assigneeRole: 'member',
              dueOffset: 8,
              priority: 'medium',
              labels: ['strategy', 'hashtags'],
            },
          ],
        },
        {
          name: 'Execution',
          description: 'Schedule and publish',
          tasks: [
            {
              title: 'Schedule content',
              description:
                'Schedule all posts in social media management tool.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['scheduling', 'execution'],
            },
            {
              title: 'Community management',
              description:
                'Monitor and respond to comments and messages.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['engagement', 'community'],
            },
            {
              title: 'Influencer outreach',
              description:
                'Coordinate with influencers if applicable.',
              assigneeRole: 'lead',
              dueOffset: 7,
              priority: 'medium',
              labels: ['influencer', 'outreach'],
            },
          ],
        },
        {
          name: 'Analysis',
          description: 'Performance tracking',
          tasks: [
            {
              title: 'Track daily metrics',
              description:
                'Monitor engagement and reach metrics daily.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'medium',
              labels: ['analytics', 'monitoring'],
            },
            {
              title: 'Create campaign report',
              description:
                'Compile comprehensive performance report.',
              assigneeRole: 'lead',
              dueOffset: 28,
              priority: 'high',
              labels: ['reporting', 'analytics'],
              subtasks: [
                { title: 'Gather metrics from all platforms' },
                { title: 'Compare against KPIs' },
                { title: 'Document learnings' },
              ],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'creating', 'review', 'scheduled', 'live', 'completed'],
      },
    },
    settings: {
      multiPlatform: true,
      trackEngagement: true,
    },
  },

  // ==================== 5. EMAIL MARKETING CAMPAIGN ====================
  {
    name: 'Email Marketing Campaign',
    slug: 'email-marketing-campaign',
    description:
      'End-to-end email campaign management from strategy to analysis. Perfect for newsletters, drip campaigns, and promotional emails.',
    category: 'marketing',
    icon: 'Mail',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'drafting', name: 'Drafting', order: 1, color: '#3B82F6' },
      { id: 'designing', name: 'Designing', order: 2, color: '#8B5CF6' },
      { id: 'testing', name: 'Testing', order: 3, color: '#F59E0B' },
      { id: 'sent', name: 'Sent', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Email Type',
        type: 'select',
        description: 'Type of email',
        options: ['Newsletter', 'Promotional', 'Drip/Automation', 'Transactional', 'Re-engagement'],
        isRequired: true,
      },
      {
        name: 'List Segment',
        type: 'select',
        description: 'Target segment',
        options: ['All Subscribers', 'New Users', 'Active Users', 'Churned Users', 'VIP'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Campaign planning and setup',
          tasks: [
            {
              title: 'Define campaign goals',
              description:
                'Set objectives: opens, clicks, conversions.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'strategy'],
            },
            {
              title: 'Segment audience',
              description:
                'Define and create target audience segments.',
              assigneeRole: 'member',
              dueOffset: 2,
              priority: 'high',
              labels: ['audience', 'segmentation'],
            },
            {
              title: 'Plan email sequence',
              description:
                'Map out email flow and timing.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'sequence'],
            },
          ],
        },
        {
          name: 'Content Creation',
          description: 'Write and design emails',
          tasks: [
            {
              title: 'Write email copy',
              description:
                'Write subject lines, preview text, and body copy.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['content', 'copywriting'],
              subtasks: [
                { title: 'Write subject line variations' },
                { title: 'Write preview text' },
                { title: 'Write body copy' },
                { title: 'Add CTAs' },
              ],
            },
            {
              title: 'Design email template',
              description:
                'Create or customize email template design.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['design', 'template'],
            },
            {
              title: 'Create visual assets',
              description:
                'Design images, banners, and graphics.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'medium',
              labels: ['design', 'graphics'],
            },
          ],
        },
        {
          name: 'Testing',
          description: 'QA and testing',
          tasks: [
            {
              title: 'Build email in ESP',
              description:
                'Build email in email service provider.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['technical', 'setup'],
            },
            {
              title: 'Test across email clients',
              description:
                'Test rendering in major email clients.',
              assigneeRole: 'member',
              dueOffset: 13,
              priority: 'high',
              labels: ['testing', 'qa'],
              subtasks: [
                { title: 'Test in Gmail' },
                { title: 'Test in Outlook' },
                { title: 'Test in Apple Mail' },
                { title: 'Test on mobile' },
              ],
            },
            {
              title: 'Review links and tracking',
              description:
                'Verify all links work and tracking is configured.',
              assigneeRole: 'member',
              dueOffset: 13,
              priority: 'high',
              labels: ['testing', 'tracking'],
            },
            {
              title: 'A/B test setup',
              description:
                'Configure A/B test for subject lines or content.',
              assigneeRole: 'member',
              dueOffset: 13,
              priority: 'medium',
              labels: ['testing', 'optimization'],
            },
          ],
        },
        {
          name: 'Sending & Analysis',
          description: 'Send and analyze results',
          tasks: [
            {
              title: 'Schedule/Send email',
              description:
                'Schedule or send email to target audience.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['execution', 'sending'],
            },
            {
              title: 'Monitor delivery',
              description:
                'Monitor delivery rates and initial engagement.',
              assigneeRole: 'member',
              dueOffset: 15,
              priority: 'high',
              labels: ['monitoring', 'delivery'],
            },
            {
              title: 'Analyze performance',
              description:
                'Review campaign metrics and create report.',
              assigneeRole: 'lead',
              dueOffset: 21,
              priority: 'high',
              labels: ['analytics', 'reporting'],
              subtasks: [
                { title: 'Review open rates' },
                { title: 'Analyze click rates' },
                { title: 'Check conversion data' },
                { title: 'Document insights' },
              ],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'drafting', 'designing', 'testing', 'sent'],
      },
    },
    settings: {
      trackMetrics: true,
      abTesting: true,
    },
  },

  // ==================== 6. CONTENT MARKETING CAMPAIGN ====================
  {
    name: 'Content Marketing Campaign',
    slug: 'content-marketing-campaign',
    description:
      'Strategic content marketing initiative to attract and engage target audiences through valuable, relevant content across multiple channels.',
    category: 'marketing',
    icon: 'FileText',
    color: '#6366F1',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'ideation', name: 'Ideation', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'review', name: 'Review', order: 2, color: '#F59E0B' },
      { id: 'published', name: 'Published', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Content Format',
        type: 'select',
        description: 'Type of content',
        options: ['Blog', 'Video', 'Infographic', 'Ebook', 'Case Study', 'Webinar'],
        isRequired: true,
      },
      {
        name: 'Funnel Stage',
        type: 'select',
        description: 'Buyer journey stage',
        options: ['Awareness', 'Consideration', 'Decision', 'Retention'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy & Planning',
          description: 'Define content strategy and goals',
          tasks: [
            {
              title: 'Define content marketing goals',
              description: 'Set measurable objectives for the campaign.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'planning'],
            },
            {
              title: 'Conduct audience research',
              description: 'Research target audience pain points and interests.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['research', 'audience'],
            },
            {
              title: 'Perform content audit',
              description: 'Review existing content and identify gaps.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'medium',
              labels: ['audit', 'analysis'],
            },
            {
              title: 'Create content pillars',
              description: 'Define core topics and themes for content.',
              assigneeRole: 'lead',
              dueOffset: 7,
              priority: 'high',
              labels: ['strategy', 'content'],
            },
          ],
        },
        {
          name: 'Content Creation',
          description: 'Produce content assets',
          tasks: [
            {
              title: 'Develop editorial calendar',
              description: 'Plan content schedule for the campaign period.',
              assigneeRole: 'lead',
              dueOffset: 10,
              priority: 'high',
              labels: ['planning', 'calendar'],
            },
            {
              title: 'Create cornerstone content',
              description: 'Produce flagship content pieces.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['content', 'creation'],
            },
            {
              title: 'Develop supporting content',
              description: 'Create supplementary content for distribution.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'medium',
              labels: ['content', 'creation'],
            },
          ],
        },
        {
          name: 'Distribution',
          description: 'Publish and promote content',
          tasks: [
            {
              title: 'Set up distribution channels',
              description: 'Configure publishing platforms and tools.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['distribution', 'setup'],
            },
            {
              title: 'Execute content promotion',
              description: 'Promote content across channels.',
              assigneeRole: 'member',
              dueOffset: 30,
              priority: 'high',
              labels: ['promotion', 'distribution'],
            },
            {
              title: 'Implement SEO optimization',
              description: 'Optimize content for search engines.',
              assigneeRole: 'member',
              dueOffset: 25,
              priority: 'high',
              labels: ['seo', 'optimization'],
            },
          ],
        },
        {
          name: 'Measurement',
          description: 'Track and analyze performance',
          tasks: [
            {
              title: 'Set up analytics tracking',
              description: 'Configure tracking for content metrics.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['analytics', 'setup'],
            },
            {
              title: 'Monitor content performance',
              description: 'Track engagement and conversion metrics.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'medium',
              labels: ['monitoring', 'analytics'],
            },
            {
              title: 'Create performance report',
              description: 'Compile campaign results and insights.',
              assigneeRole: 'lead',
              dueOffset: 42,
              priority: 'high',
              labels: ['reporting', 'analysis'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['ideation', 'creation', 'review', 'published'],
      },
    },
    settings: {
      trackMetrics: true,
      contentCalendar: true,
    },
  },

  // ==================== 7. SOCIAL MEDIA STRATEGY ====================
  {
    name: 'Social Media Strategy',
    slug: 'social-media-strategy',
    description:
      'Comprehensive social media strategy development including platform selection, content planning, and community building.',
    category: 'marketing',
    icon: 'Users',
    color: '#EC4899',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'research', name: 'Research', order: 0, color: '#6B7280' },
      { id: 'planning', name: 'Planning', order: 1, color: '#3B82F6' },
      { id: 'execution', name: 'Execution', order: 2, color: '#F59E0B' },
      { id: 'optimization', name: 'Optimization', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Platform Focus',
        type: 'multiselect',
        description: 'Primary platforms',
        options: ['LinkedIn', 'Instagram', 'Twitter', 'Facebook', 'TikTok', 'YouTube'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Audit & Research',
          description: 'Analyze current state and market',
          tasks: [
            {
              title: 'Conduct social media audit',
              description: 'Review current social presence and performance.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['audit', 'analysis'],
            },
            {
              title: 'Analyze competitors',
              description: 'Research competitor social strategies.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['research', 'competitive'],
            },
            {
              title: 'Define target personas',
              description: 'Create social media audience personas.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['research', 'audience'],
            },
          ],
        },
        {
          name: 'Strategy Development',
          description: 'Create strategic framework',
          tasks: [
            {
              title: 'Set social media goals',
              description: 'Define measurable objectives.',
              assigneeRole: 'lead',
              dueOffset: 7,
              priority: 'high',
              labels: ['strategy', 'goals'],
            },
            {
              title: 'Select priority platforms',
              description: 'Choose platforms based on audience.',
              assigneeRole: 'lead',
              dueOffset: 8,
              priority: 'high',
              labels: ['strategy', 'platforms'],
            },
            {
              title: 'Define content themes',
              description: 'Establish content pillars and themes.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['content', 'strategy'],
            },
            {
              title: 'Create posting schedule',
              description: 'Develop optimal posting frequency.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'medium',
              labels: ['planning', 'schedule'],
            },
          ],
        },
        {
          name: 'Implementation',
          description: 'Execute strategy',
          tasks: [
            {
              title: 'Optimize profiles',
              description: 'Update all social profiles.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['optimization', 'profiles'],
            },
            {
              title: 'Create content templates',
              description: 'Design reusable content templates.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'medium',
              labels: ['design', 'templates'],
            },
            {
              title: 'Set up management tools',
              description: 'Configure scheduling and monitoring tools.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['tools', 'setup'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['research', 'planning', 'execution', 'optimization'],
      },
    },
    settings: {
      multiPlatform: true,
    },
  },

  // ==================== 8. SEO OPTIMIZATION PROJECT ====================
  {
    name: 'SEO Optimization Project',
    slug: 'seo-optimization-project',
    description:
      'Focused SEO improvement project targeting specific keywords and pages for increased organic visibility.',
    category: 'marketing',
    icon: 'TrendingUp',
    color: '#10B981',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'research', name: 'Research', order: 0, color: '#6B7280' },
      { id: 'optimization', name: 'Optimization', order: 1, color: '#3B82F6' },
      { id: 'implementation', name: 'Implementation', order: 2, color: '#F59E0B' },
      { id: 'monitoring', name: 'Monitoring', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'SEO Focus',
        type: 'select',
        description: 'Primary optimization area',
        options: ['Technical', 'On-Page', 'Content', 'Link Building', 'Local'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Keyword Research',
          description: 'Research and select target keywords',
          tasks: [
            {
              title: 'Identify seed keywords',
              description: 'List initial keyword ideas.',
              assigneeRole: 'member',
              dueOffset: 0,
              priority: 'high',
              labels: ['research', 'keywords'],
            },
            {
              title: 'Analyze keyword difficulty',
              description: 'Assess competition for keywords.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['research', 'analysis'],
            },
            {
              title: 'Map keywords to pages',
              description: 'Assign keywords to target pages.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['planning', 'mapping'],
            },
          ],
        },
        {
          name: 'On-Page Optimization',
          description: 'Optimize page elements',
          tasks: [
            {
              title: 'Optimize title tags',
              description: 'Update title tags with keywords.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['on-page', 'optimization'],
            },
            {
              title: 'Improve meta descriptions',
              description: 'Write compelling meta descriptions.',
              assigneeRole: 'member',
              dueOffset: 8,
              priority: 'medium',
              labels: ['on-page', 'optimization'],
            },
            {
              title: 'Optimize header structure',
              description: 'Improve H1-H6 hierarchy.',
              assigneeRole: 'member',
              dueOffset: 9,
              priority: 'medium',
              labels: ['on-page', 'structure'],
            },
            {
              title: 'Add internal links',
              description: 'Improve internal linking.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'medium',
              labels: ['on-page', 'linking'],
            },
          ],
        },
        {
          name: 'Content Enhancement',
          description: 'Improve content quality',
          tasks: [
            {
              title: 'Update existing content',
              description: 'Refresh and expand content.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['content', 'optimization'],
            },
            {
              title: 'Add supporting media',
              description: 'Include images and videos.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'medium',
              labels: ['content', 'media'],
            },
            {
              title: 'Implement schema markup',
              description: 'Add structured data.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['technical', 'schema'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['research', 'optimization', 'implementation', 'monitoring'],
      },
    },
    settings: {
      trackRankings: true,
    },
  },

  // ==================== 9. PPC CAMPAIGN MANAGEMENT ====================
  {
    name: 'PPC Campaign Management',
    slug: 'ppc-campaign-management',
    description:
      'Pay-per-click advertising campaign setup and management for Google Ads, social media ads, and display networks.',
    category: 'marketing',
    icon: 'DollarSign',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'setup', name: 'Setup', order: 0, color: '#6B7280' },
      { id: 'active', name: 'Active', order: 1, color: '#3B82F6' },
      { id: 'optimization', name: 'Optimization', order: 2, color: '#F59E0B' },
      { id: 'reporting', name: 'Reporting', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Ad Platform',
        type: 'select',
        description: 'Advertising platform',
        options: ['Google Ads', 'Facebook Ads', 'LinkedIn Ads', 'Twitter Ads', 'Microsoft Ads'],
        isRequired: true,
      },
      {
        name: 'Campaign Budget',
        type: 'number',
        description: 'Monthly budget',
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Campaign Setup',
          description: 'Configure campaigns',
          tasks: [
            {
              title: 'Define campaign objectives',
              description: 'Set goals and KPIs.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'strategy'],
            },
            {
              title: 'Research keywords/audiences',
              description: 'Identify target keywords or audiences.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['research', 'targeting'],
            },
            {
              title: 'Create ad groups',
              description: 'Structure campaign ad groups.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['setup', 'structure'],
            },
            {
              title: 'Write ad copy',
              description: 'Create compelling ad copy.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['content', 'copywriting'],
            },
          ],
        },
        {
          name: 'Creative Development',
          description: 'Create ad assets',
          tasks: [
            {
              title: 'Design display ads',
              description: 'Create banner and display ads.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['design', 'creative'],
            },
            {
              title: 'Create landing pages',
              description: 'Build optimized landing pages.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['design', 'landing-page'],
            },
            {
              title: 'Set up conversion tracking',
              description: 'Implement tracking pixels.',
              assigneeRole: 'member',
              dueOffset: 8,
              priority: 'high',
              labels: ['tracking', 'setup'],
            },
          ],
        },
        {
          name: 'Launch & Optimization',
          description: 'Launch and optimize campaigns',
          tasks: [
            {
              title: 'Launch campaigns',
              description: 'Activate all campaigns.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['launch', 'execution'],
            },
            {
              title: 'Monitor performance',
              description: 'Track daily metrics.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['monitoring', 'analytics'],
            },
            {
              title: 'Optimize bids',
              description: 'Adjust bidding strategies.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['optimization', 'bidding'],
            },
            {
              title: 'A/B test ads',
              description: 'Test ad variations.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'medium',
              labels: ['testing', 'optimization'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['setup', 'active', 'optimization', 'reporting'],
      },
    },
    settings: {
      trackROI: true,
      budgetManagement: true,
    },
  },

  // ==================== 10. INFLUENCER MARKETING CAMPAIGN ====================
  {
    name: 'Influencer Marketing Campaign',
    slug: 'influencer-marketing-campaign',
    description:
      'Partner with influencers to expand brand reach and credibility through authentic endorsements and content.',
    category: 'marketing',
    icon: 'Star',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'research', name: 'Research', order: 0, color: '#6B7280' },
      { id: 'outreach', name: 'Outreach', order: 1, color: '#3B82F6' },
      { id: 'collaboration', name: 'Collaboration', order: 2, color: '#F59E0B' },
      { id: 'live', name: 'Live', order: 3, color: '#EC4899' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Influencer Tier',
        type: 'select',
        description: 'Influencer size',
        options: ['Nano', 'Micro', 'Mid-tier', 'Macro', 'Mega'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Campaign planning',
          tasks: [
            {
              title: 'Define campaign goals',
              description: 'Set influencer marketing objectives.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'strategy'],
            },
            {
              title: 'Identify target influencers',
              description: 'Research and shortlist influencers.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['research', 'influencers'],
            },
            {
              title: 'Create campaign brief',
              description: 'Develop influencer brief.',
              assigneeRole: 'lead',
              dueOffset: 7,
              priority: 'high',
              labels: ['planning', 'brief'],
            },
          ],
        },
        {
          name: 'Outreach & Negotiation',
          description: 'Contact and negotiate with influencers',
          tasks: [
            {
              title: 'Initial outreach',
              description: 'Contact shortlisted influencers.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['outreach', 'communication'],
            },
            {
              title: 'Negotiate terms',
              description: 'Agree on deliverables and compensation.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['negotiation', 'contracts'],
            },
            {
              title: 'Finalize contracts',
              description: 'Sign agreements with influencers.',
              assigneeRole: 'lead',
              dueOffset: 17,
              priority: 'high',
              labels: ['contracts', 'legal'],
            },
          ],
        },
        {
          name: 'Content Creation',
          description: 'Collaborate on content',
          tasks: [
            {
              title: 'Share brand assets',
              description: 'Provide influencers with brand materials.',
              assigneeRole: 'member',
              dueOffset: 18,
              priority: 'high',
              labels: ['content', 'assets'],
            },
            {
              title: 'Review content drafts',
              description: 'Approve influencer content.',
              assigneeRole: 'lead',
              dueOffset: 21,
              priority: 'high',
              labels: ['review', 'approval'],
            },
            {
              title: 'Coordinate posting schedule',
              description: 'Align content publication timing.',
              assigneeRole: 'member',
              dueOffset: 23,
              priority: 'medium',
              labels: ['planning', 'schedule'],
            },
          ],
        },
        {
          name: 'Analysis',
          description: 'Track results',
          tasks: [
            {
              title: 'Track campaign metrics',
              description: 'Monitor reach and engagement.',
              assigneeRole: 'member',
              dueOffset: 30,
              priority: 'high',
              labels: ['analytics', 'tracking'],
            },
            {
              title: 'Calculate ROI',
              description: 'Measure campaign return.',
              assigneeRole: 'lead',
              dueOffset: 35,
              priority: 'high',
              labels: ['analytics', 'roi'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['research', 'outreach', 'collaboration', 'live', 'completed'],
      },
    },
    settings: {
      trackInfluencers: true,
    },
  },

  // ==================== 11. PRODUCT LAUNCH MARKETING ====================
  {
    name: 'Product Launch Marketing',
    slug: 'product-launch-marketing',
    description:
      'Marketing-focused product launch template emphasizing go-to-market strategy, messaging, and multi-channel promotion.',
    category: 'marketing',
    icon: 'Package',
    color: '#EF4444',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'pre-launch', name: 'Pre-Launch', order: 0, color: '#6B7280' },
      { id: 'launch', name: 'Launch', order: 1, color: '#3B82F6' },
      { id: 'post-launch', name: 'Post-Launch', order: 2, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Launch Type',
        type: 'select',
        description: 'Type of launch',
        options: ['Soft Launch', 'Hard Launch', 'Beta', 'General Availability'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Go-to-Market Strategy',
          description: 'Define GTM approach',
          tasks: [
            {
              title: 'Define value proposition',
              description: 'Articulate product value.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'messaging'],
            },
            {
              title: 'Identify target segments',
              description: 'Define target markets.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['strategy', 'targeting'],
            },
            {
              title: 'Develop pricing strategy',
              description: 'Set pricing and positioning.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['strategy', 'pricing'],
            },
          ],
        },
        {
          name: 'Launch Assets',
          description: 'Create marketing materials',
          tasks: [
            {
              title: 'Create product messaging',
              description: 'Develop key messages.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['content', 'messaging'],
            },
            {
              title: 'Design launch assets',
              description: 'Create visual materials.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['design', 'creative'],
            },
            {
              title: 'Prepare press materials',
              description: 'Create press kit.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'medium',
              labels: ['pr', 'content'],
            },
            {
              title: 'Build landing page',
              description: 'Create product landing page.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['web', 'design'],
            },
          ],
        },
        {
          name: 'Launch Execution',
          description: 'Execute launch',
          tasks: [
            {
              title: 'Execute launch day activities',
              description: 'Coordinate all launch activities.',
              assigneeRole: 'lead',
              dueOffset: 21,
              priority: 'urgent',
              labels: ['launch', 'execution'],
            },
            {
              title: 'Monitor launch metrics',
              description: 'Track launch performance.',
              assigneeRole: 'member',
              dueOffset: 22,
              priority: 'high',
              labels: ['monitoring', 'analytics'],
            },
            {
              title: 'Manage customer feedback',
              description: 'Respond to early feedback.',
              assigneeRole: 'member',
              dueOffset: 25,
              priority: 'high',
              labels: ['feedback', 'support'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['pre-launch', 'launch', 'post-launch'],
      },
    },
    settings: {
      trackLaunchMetrics: true,
    },
  },

  // ==================== 12. BRAND AWARENESS CAMPAIGN ====================
  {
    name: 'Brand Awareness Campaign',
    slug: 'brand-awareness-campaign',
    description:
      'Increase brand visibility and recognition through strategic multi-channel marketing initiatives.',
    category: 'marketing',
    icon: 'Eye',
    color: '#06B6D4',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'active', name: 'Active', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Awareness Goal',
        type: 'select',
        description: 'Primary objective',
        options: ['Reach', 'Impressions', 'Brand Recall', 'Sentiment'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy',
          description: 'Define awareness strategy',
          tasks: [
            {
              title: 'Set awareness objectives',
              description: 'Define measurable goals.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'goals'],
            },
            {
              title: 'Identify key messages',
              description: 'Define brand messages.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['messaging', 'brand'],
            },
            {
              title: 'Select channels',
              description: 'Choose marketing channels.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['strategy', 'channels'],
            },
          ],
        },
        {
          name: 'Content Development',
          description: 'Create awareness content',
          tasks: [
            {
              title: 'Create brand storytelling content',
              description: 'Develop brand narrative.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['content', 'storytelling'],
            },
            {
              title: 'Design visual brand assets',
              description: 'Create branded visuals.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['design', 'branding'],
            },
            {
              title: 'Produce video content',
              description: 'Create video ads.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'medium',
              labels: ['video', 'content'],
            },
          ],
        },
        {
          name: 'Execution',
          description: 'Launch campaign',
          tasks: [
            {
              title: 'Launch paid media',
              description: 'Activate paid campaigns.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['paid', 'execution'],
            },
            {
              title: 'Execute PR activities',
              description: 'Manage PR outreach.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'medium',
              labels: ['pr', 'outreach'],
            },
            {
              title: 'Track brand metrics',
              description: 'Monitor awareness KPIs.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'high',
              labels: ['analytics', 'tracking'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'creation', 'active', 'completed'],
      },
    },
    settings: {
      trackBrandMetrics: true,
    },
  },

  // ==================== 13. LEAD GENERATION CAMPAIGN ====================
  {
    name: 'Lead Generation Campaign',
    slug: 'lead-generation-campaign',
    description:
      'Capture and nurture qualified leads through targeted marketing campaigns and conversion optimization.',
    category: 'marketing',
    icon: 'UserPlus',
    color: '#22C55E',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'setup', name: 'Setup', order: 0, color: '#6B7280' },
      { id: 'active', name: 'Active', order: 1, color: '#3B82F6' },
      { id: 'nurturing', name: 'Nurturing', order: 2, color: '#F59E0B' },
      { id: 'converted', name: 'Converted', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Lead Type',
        type: 'select',
        description: 'Type of lead',
        options: ['MQL', 'SQL', 'PQL', 'Newsletter'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Campaign Setup',
          description: 'Configure lead gen campaign',
          tasks: [
            {
              title: 'Define lead qualification criteria',
              description: 'Set lead scoring rules.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'qualification'],
            },
            {
              title: 'Create lead magnet',
              description: 'Develop valuable offer.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['content', 'offer'],
            },
            {
              title: 'Build landing page',
              description: 'Create conversion-focused page.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['web', 'conversion'],
            },
            {
              title: 'Set up forms and tracking',
              description: 'Configure lead capture.',
              assigneeRole: 'member',
              dueOffset: 8,
              priority: 'high',
              labels: ['setup', 'tracking'],
            },
          ],
        },
        {
          name: 'Traffic Generation',
          description: 'Drive traffic to offers',
          tasks: [
            {
              title: 'Launch paid campaigns',
              description: 'Activate paid traffic.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['paid', 'traffic'],
            },
            {
              title: 'Execute content promotion',
              description: 'Promote through content.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'medium',
              labels: ['content', 'promotion'],
            },
            {
              title: 'Optimize conversion rate',
              description: 'Test and improve conversions.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['optimization', 'cro'],
            },
          ],
        },
        {
          name: 'Lead Nurturing',
          description: 'Nurture captured leads',
          tasks: [
            {
              title: 'Create nurture sequences',
              description: 'Build email sequences.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['email', 'nurturing'],
            },
            {
              title: 'Segment leads',
              description: 'Categorize by interest.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'medium',
              labels: ['segmentation', 'leads'],
            },
            {
              title: 'Hand off to sales',
              description: 'Transfer qualified leads.',
              assigneeRole: 'lead',
              dueOffset: 28,
              priority: 'high',
              labels: ['sales', 'handoff'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['setup', 'active', 'nurturing', 'converted'],
      },
    },
    settings: {
      trackLeads: true,
      leadScoring: true,
    },
  },

  // ==================== 14. MARKETING AUTOMATION SETUP ====================
  {
    name: 'Marketing Automation Setup',
    slug: 'marketing-automation-setup',
    description:
      'Implement and configure marketing automation workflows for lead nurturing, email campaigns, and customer journeys.',
    category: 'marketing',
    icon: 'Zap',
    color: '#A855F7',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'building', name: 'Building', order: 1, color: '#3B82F6' },
      { id: 'testing', name: 'Testing', order: 2, color: '#F59E0B' },
      { id: 'live', name: 'Live', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Platform',
        type: 'select',
        description: 'Automation platform',
        options: ['HubSpot', 'Marketo', 'Pardot', 'ActiveCampaign', 'Mailchimp'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy & Planning',
          description: 'Plan automation workflows',
          tasks: [
            {
              title: 'Map customer journeys',
              description: 'Document customer touchpoints.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'journey'],
            },
            {
              title: 'Define automation triggers',
              description: 'Identify trigger events.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'triggers'],
            },
            {
              title: 'Design workflow logic',
              description: 'Create workflow diagrams.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['planning', 'workflows'],
            },
          ],
        },
        {
          name: 'Platform Setup',
          description: 'Configure automation platform',
          tasks: [
            {
              title: 'Configure platform settings',
              description: 'Set up platform basics.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['setup', 'technical'],
            },
            {
              title: 'Import and segment contacts',
              description: 'Migrate contact data.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['data', 'import'],
            },
            {
              title: 'Set up integrations',
              description: 'Connect with other tools.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['integration', 'setup'],
            },
          ],
        },
        {
          name: 'Workflow Building',
          description: 'Build automation workflows',
          tasks: [
            {
              title: 'Create email templates',
              description: 'Build automated email templates.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['email', 'templates'],
            },
            {
              title: 'Build lead nurture workflow',
              description: 'Create nurturing automation.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'high',
              labels: ['workflow', 'nurturing'],
            },
            {
              title: 'Set up lead scoring',
              description: 'Configure scoring rules.',
              assigneeRole: 'member',
              dueOffset: 15,
              priority: 'high',
              labels: ['scoring', 'setup'],
            },
            {
              title: 'Test all workflows',
              description: 'QA automation sequences.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['testing', 'qa'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'building', 'testing', 'live'],
      },
    },
    settings: {
      trackAutomation: true,
    },
  },

  // ==================== 15. VIDEO MARKETING STRATEGY ====================
  {
    name: 'Video Marketing Strategy',
    slug: 'video-marketing-strategy',
    description:
      'Develop and execute video content strategy across platforms including YouTube, social media, and website.',
    category: 'marketing',
    icon: 'Video',
    color: '#EF4444',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'production', name: 'Production', order: 1, color: '#3B82F6' },
      { id: 'editing', name: 'Editing', order: 2, color: '#F59E0B' },
      { id: 'published', name: 'Published', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Video Type',
        type: 'select',
        description: 'Type of video content',
        options: ['Tutorial', 'Product Demo', 'Testimonial', 'Brand Story', 'Live Stream', 'Short Form'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy Development',
          description: 'Define video strategy',
          tasks: [
            {
              title: 'Define video goals',
              description: 'Set objectives for video marketing.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'goals'],
            },
            {
              title: 'Research video trends',
              description: 'Analyze trending formats.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'medium',
              labels: ['research', 'trends'],
            },
            {
              title: 'Create content calendar',
              description: 'Plan video schedule.',
              assigneeRole: 'lead',
              dueOffset: 7,
              priority: 'high',
              labels: ['planning', 'calendar'],
            },
          ],
        },
        {
          name: 'Pre-Production',
          description: 'Prepare for filming',
          tasks: [
            {
              title: 'Write video scripts',
              description: 'Create video scripts.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['content', 'scripts'],
            },
            {
              title: 'Plan production logistics',
              description: 'Organize filming details.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['planning', 'production'],
            },
            {
              title: 'Prepare equipment and talent',
              description: 'Ready all resources.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['preparation', 'resources'],
            },
          ],
        },
        {
          name: 'Production & Post',
          description: 'Create and edit videos',
          tasks: [
            {
              title: 'Film video content',
              description: 'Execute video production.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['production', 'filming'],
            },
            {
              title: 'Edit videos',
              description: 'Post-production editing.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['editing', 'post-production'],
            },
            {
              title: 'Optimize for platforms',
              description: 'Format for each platform.',
              assigneeRole: 'member',
              dueOffset: 30,
              priority: 'medium',
              labels: ['optimization', 'distribution'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'production', 'editing', 'published'],
      },
    },
    settings: {
      trackViews: true,
    },
  },

  // ==================== 16. PODCAST LAUNCH ====================
  {
    name: 'Podcast Launch',
    slug: 'podcast-launch',
    description:
      'Launch a podcast from concept to first episodes including branding, equipment setup, and distribution.',
    category: 'marketing',
    icon: 'Mic',
    color: '#7C3AED',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'concept', name: 'Concept', order: 0, color: '#6B7280' },
      { id: 'production', name: 'Production', order: 1, color: '#3B82F6' },
      { id: 'launch', name: 'Launch', order: 2, color: '#F59E0B' },
      { id: 'live', name: 'Live', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Podcast Format',
        type: 'select',
        description: 'Show format',
        options: ['Interview', 'Solo', 'Co-hosted', 'Panel', 'Narrative'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Concept Development',
          description: 'Define podcast concept',
          tasks: [
            {
              title: 'Define podcast concept',
              description: 'Clarify show theme and format.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['concept', 'planning'],
            },
            {
              title: 'Research competition',
              description: 'Analyze competing podcasts.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'medium',
              labels: ['research', 'competitive'],
            },
            {
              title: 'Create show branding',
              description: 'Design logo and artwork.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['branding', 'design'],
            },
            {
              title: 'Set up equipment',
              description: 'Acquire and test equipment.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['setup', 'equipment'],
            },
          ],
        },
        {
          name: 'Episode Production',
          description: 'Create initial episodes',
          tasks: [
            {
              title: 'Plan first season',
              description: 'Outline initial episodes.',
              assigneeRole: 'lead',
              dueOffset: 12,
              priority: 'high',
              labels: ['planning', 'content'],
            },
            {
              title: 'Record trailer episode',
              description: 'Create show trailer.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['recording', 'production'],
            },
            {
              title: 'Produce first episodes',
              description: 'Record and edit episodes.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['production', 'editing'],
            },
          ],
        },
        {
          name: 'Distribution Setup',
          description: 'Set up podcast distribution',
          tasks: [
            {
              title: 'Choose hosting platform',
              description: 'Select podcast host.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['setup', 'hosting'],
            },
            {
              title: 'Submit to directories',
              description: 'Distribute to platforms.',
              assigneeRole: 'member',
              dueOffset: 23,
              priority: 'high',
              labels: ['distribution', 'platforms'],
            },
            {
              title: 'Launch promotion',
              description: 'Promote podcast launch.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['launch', 'promotion'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['concept', 'production', 'launch', 'live'],
      },
    },
    settings: {
      trackDownloads: true,
    },
  },

  // ==================== 17. WEBINAR SERIES ====================
  {
    name: 'Webinar Series',
    slug: 'webinar-series',
    description:
      'Plan and execute educational webinar series including topic planning, promotion, and follow-up sequences.',
    category: 'marketing',
    icon: 'Monitor',
    color: '#0EA5E9',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'promotion', name: 'Promotion', order: 1, color: '#3B82F6' },
      { id: 'live', name: 'Live', order: 2, color: '#F59E0B' },
      { id: 'follow-up', name: 'Follow-up', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Webinar Type',
        type: 'select',
        description: 'Type of webinar',
        options: ['Educational', 'Product Demo', 'Panel Discussion', 'Q&A', 'Workshop'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan webinar series',
          tasks: [
            {
              title: 'Define webinar topics',
              description: 'Select topics for series.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'content'],
            },
            {
              title: 'Schedule webinar dates',
              description: 'Set dates and times.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'schedule'],
            },
            {
              title: 'Invite speakers',
              description: 'Confirm presenters.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['speakers', 'outreach'],
            },
            {
              title: 'Create presentation materials',
              description: 'Develop slides and content.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['content', 'presentation'],
            },
          ],
        },
        {
          name: 'Promotion',
          description: 'Promote webinars',
          tasks: [
            {
              title: 'Create registration page',
              description: 'Build webinar landing page.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['web', 'registration'],
            },
            {
              title: 'Launch email promotion',
              description: 'Send promotional emails.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['email', 'promotion'],
            },
            {
              title: 'Promote on social media',
              description: 'Share on social channels.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'medium',
              labels: ['social', 'promotion'],
            },
          ],
        },
        {
          name: 'Execution',
          description: 'Run webinars',
          tasks: [
            {
              title: 'Run tech rehearsal',
              description: 'Test all technology.',
              assigneeRole: 'member',
              dueOffset: 20,
              priority: 'high',
              labels: ['technical', 'preparation'],
            },
            {
              title: 'Host webinars',
              description: 'Facilitate live sessions.',
              assigneeRole: 'lead',
              dueOffset: 21,
              priority: 'urgent',
              labels: ['live', 'execution'],
            },
            {
              title: 'Send follow-up content',
              description: 'Share recordings and resources.',
              assigneeRole: 'member',
              dueOffset: 23,
              priority: 'high',
              labels: ['follow-up', 'content'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'promotion', 'live', 'follow-up'],
      },
    },
    settings: {
      trackRegistrations: true,
    },
  },

  // ==================== 18. TRADE SHOW MARKETING ====================
  {
    name: 'Trade Show Marketing',
    slug: 'trade-show-marketing',
    description:
      'Comprehensive trade show marketing from booth design to lead capture and post-show follow-up.',
    category: 'marketing',
    icon: 'Building',
    color: '#F97316',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'pre-show', name: 'Pre-Show', order: 0, color: '#6B7280' },
      { id: 'at-show', name: 'At Show', order: 1, color: '#3B82F6' },
      { id: 'post-show', name: 'Post-Show', order: 2, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Show Name',
        type: 'text',
        description: 'Trade show name',
        isRequired: true,
      },
      {
        name: 'Booth Size',
        type: 'select',
        description: 'Booth dimensions',
        options: ['10x10', '10x20', '20x20', '20x30', 'Island'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Pre-Show Planning',
          description: 'Prepare for trade show',
          tasks: [
            {
              title: 'Set show objectives',
              description: 'Define goals and KPIs.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'goals'],
            },
            {
              title: 'Design booth',
              description: 'Create booth design.',
              assigneeRole: 'member',
              dueOffset: 30,
              priority: 'high',
              labels: ['design', 'booth'],
            },
            {
              title: 'Prepare marketing materials',
              description: 'Create collateral.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['content', 'materials'],
            },
            {
              title: 'Schedule meetings',
              description: 'Book prospect meetings.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['outreach', 'meetings'],
            },
          ],
        },
        {
          name: 'Show Execution',
          description: 'Activities during show',
          tasks: [
            {
              title: 'Set up booth',
              description: 'Install booth and materials.',
              assigneeRole: 'member',
              dueOffset: 45,
              priority: 'high',
              labels: ['setup', 'booth'],
            },
            {
              title: 'Staff booth',
              description: 'Manage booth coverage.',
              assigneeRole: 'lead',
              dueOffset: 46,
              priority: 'high',
              labels: ['staffing', 'execution'],
            },
            {
              title: 'Capture leads',
              description: 'Collect prospect information.',
              assigneeRole: 'member',
              dueOffset: 48,
              priority: 'high',
              labels: ['leads', 'capture'],
            },
          ],
        },
        {
          name: 'Post-Show Follow-up',
          description: 'After show activities',
          tasks: [
            {
              title: 'Process leads',
              description: 'Import and qualify leads.',
              assigneeRole: 'member',
              dueOffset: 50,
              priority: 'urgent',
              labels: ['leads', 'processing'],
            },
            {
              title: 'Send follow-up emails',
              description: 'Email all contacts.',
              assigneeRole: 'member',
              dueOffset: 52,
              priority: 'high',
              labels: ['email', 'follow-up'],
            },
            {
              title: 'Calculate ROI',
              description: 'Measure show success.',
              assigneeRole: 'lead',
              dueOffset: 60,
              priority: 'high',
              labels: ['analytics', 'roi'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['pre-show', 'at-show', 'post-show'],
      },
    },
    settings: {
      trackLeads: true,
    },
  },

  // ==================== 19. PR CAMPAIGN ====================
  {
    name: 'PR Campaign',
    slug: 'pr-campaign',
    description:
      'Public relations campaign to generate media coverage, build credibility, and manage brand reputation.',
    category: 'marketing',
    icon: 'Newspaper',
    color: '#64748B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'outreach', name: 'Outreach', order: 1, color: '#3B82F6' },
      { id: 'coverage', name: 'Coverage', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'PR Type',
        type: 'select',
        description: 'Type of PR',
        options: ['Product Launch', 'Company News', 'Thought Leadership', 'Crisis', 'Event'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy',
          description: 'Plan PR campaign',
          tasks: [
            {
              title: 'Define PR objectives',
              description: 'Set campaign goals.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'planning'],
            },
            {
              title: 'Identify target media',
              description: 'Build media list.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['research', 'media'],
            },
            {
              title: 'Develop key messages',
              description: 'Create messaging framework.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['messaging', 'content'],
            },
          ],
        },
        {
          name: 'Content Creation',
          description: 'Create PR materials',
          tasks: [
            {
              title: 'Write press release',
              description: 'Draft press release.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['content', 'press-release'],
            },
            {
              title: 'Prepare media kit',
              description: 'Assemble press kit.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['content', 'media-kit'],
            },
            {
              title: 'Create spokesperson briefs',
              description: 'Prepare talking points.',
              assigneeRole: 'lead',
              dueOffset: 8,
              priority: 'medium',
              labels: ['content', 'briefing'],
            },
          ],
        },
        {
          name: 'Media Outreach',
          description: 'Engage with media',
          tasks: [
            {
              title: 'Pitch to journalists',
              description: 'Send personalized pitches.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['outreach', 'pitching'],
            },
            {
              title: 'Coordinate interviews',
              description: 'Schedule media interviews.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'high',
              labels: ['interviews', 'coordination'],
            },
            {
              title: 'Track and report coverage',
              description: 'Monitor media mentions.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['monitoring', 'reporting'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'outreach', 'coverage', 'completed'],
      },
    },
    settings: {
      trackCoverage: true,
    },
  },

  // ==================== 20. CRISIS COMMUNICATION PLAN ====================
  {
    name: 'Crisis Communication Plan',
    slug: 'crisis-communication-plan',
    description:
      'Prepare for and manage crisis communications with stakeholders, media, and the public.',
    category: 'marketing',
    icon: 'AlertTriangle',
    color: '#DC2626',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'preparation', name: 'Preparation', order: 0, color: '#6B7280' },
      { id: 'response', name: 'Response', order: 1, color: '#EF4444' },
      { id: 'recovery', name: 'Recovery', order: 2, color: '#F59E0B' },
      { id: 'resolved', name: 'Resolved', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Crisis Severity',
        type: 'select',
        description: 'Level of crisis',
        options: ['Low', 'Medium', 'High', 'Critical'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Preparation',
          description: 'Prepare crisis plan',
          tasks: [
            {
              title: 'Identify potential crises',
              description: 'Map possible scenarios.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'risk'],
            },
            {
              title: 'Establish crisis team',
              description: 'Define roles and contacts.',
              assigneeRole: 'lead',
              dueOffset: 2,
              priority: 'high',
              labels: ['team', 'organization'],
            },
            {
              title: 'Create response templates',
              description: 'Draft holding statements.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['content', 'templates'],
            },
            {
              title: 'Set up monitoring',
              description: 'Configure alerts.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['monitoring', 'setup'],
            },
          ],
        },
        {
          name: 'Response Protocol',
          description: 'Define response process',
          tasks: [
            {
              title: 'Define escalation process',
              description: 'Create escalation ladder.',
              assigneeRole: 'lead',
              dueOffset: 7,
              priority: 'high',
              labels: ['process', 'escalation'],
            },
            {
              title: 'Prepare spokesperson',
              description: 'Media train spokespersons.',
              assigneeRole: 'lead',
              dueOffset: 10,
              priority: 'high',
              labels: ['training', 'spokesperson'],
            },
            {
              title: 'Create stakeholder matrix',
              description: 'Map communication needs.',
              assigneeRole: 'member',
              dueOffset: 8,
              priority: 'medium',
              labels: ['stakeholders', 'planning'],
            },
          ],
        },
        {
          name: 'Documentation',
          description: 'Document plan',
          tasks: [
            {
              title: 'Compile crisis playbook',
              description: 'Document full plan.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['documentation', 'playbook'],
            },
            {
              title: 'Distribute to team',
              description: 'Share with stakeholders.',
              assigneeRole: 'member',
              dueOffset: 15,
              priority: 'high',
              labels: ['distribution', 'training'],
            },
            {
              title: 'Schedule drills',
              description: 'Plan practice exercises.',
              assigneeRole: 'lead',
              dueOffset: 21,
              priority: 'medium',
              labels: ['training', 'drills'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['preparation', 'response', 'recovery', 'resolved'],
      },
    },
    settings: {
      urgentNotifications: true,
    },
  },

  // ==================== 21. CUSTOMER TESTIMONIAL CAMPAIGN ====================
  {
    name: 'Customer Testimonial Campaign',
    slug: 'customer-testimonial-campaign',
    description:
      'Collect and leverage customer testimonials and case studies for social proof and marketing.',
    category: 'marketing',
    icon: 'MessageSquare',
    color: '#059669',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'outreach', name: 'Outreach', order: 0, color: '#6B7280' },
      { id: 'collection', name: 'Collection', order: 1, color: '#3B82F6' },
      { id: 'production', name: 'Production', order: 2, color: '#F59E0B' },
      { id: 'published', name: 'Published', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Testimonial Type',
        type: 'select',
        description: 'Format of testimonial',
        options: ['Written Quote', 'Video', 'Case Study', 'Review', 'Social Proof'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan testimonial campaign',
          tasks: [
            {
              title: 'Identify target customers',
              description: 'Select customers for testimonials.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'customers'],
            },
            {
              title: 'Create outreach templates',
              description: 'Draft request emails.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['content', 'templates'],
            },
            {
              title: 'Define incentive program',
              description: 'Set up customer rewards.',
              assigneeRole: 'lead',
              dueOffset: 2,
              priority: 'medium',
              labels: ['planning', 'incentives'],
            },
          ],
        },
        {
          name: 'Collection',
          description: 'Gather testimonials',
          tasks: [
            {
              title: 'Send outreach emails',
              description: 'Contact selected customers.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['outreach', 'email'],
            },
            {
              title: 'Schedule video interviews',
              description: 'Book video testimonial sessions.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['scheduling', 'video'],
            },
            {
              title: 'Collect written testimonials',
              description: 'Gather quote submissions.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['collection', 'content'],
            },
          ],
        },
        {
          name: 'Production',
          description: 'Create testimonial assets',
          tasks: [
            {
              title: 'Edit video testimonials',
              description: 'Produce final videos.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['video', 'editing'],
            },
            {
              title: 'Design testimonial graphics',
              description: 'Create quote visuals.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'medium',
              labels: ['design', 'graphics'],
            },
            {
              title: 'Write case studies',
              description: 'Develop detailed stories.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['content', 'case-study'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['outreach', 'collection', 'production', 'published'],
      },
    },
    settings: {
      trackTestimonials: true,
    },
  },

  // ==================== 22. REFERRAL PROGRAM LAUNCH ====================
  {
    name: 'Referral Program Launch',
    slug: 'referral-program-launch',
    description:
      'Launch a customer referral program to drive word-of-mouth growth and customer acquisition.',
    category: 'marketing',
    icon: 'Gift',
    color: '#D946EF',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'design', name: 'Design', order: 0, color: '#6B7280' },
      { id: 'build', name: 'Build', order: 1, color: '#3B82F6' },
      { id: 'launch', name: 'Launch', order: 2, color: '#F59E0B' },
      { id: 'active', name: 'Active', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Reward Type',
        type: 'select',
        description: 'Referral incentive',
        options: ['Discount', 'Cash', 'Credits', 'Free Product', 'Points'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Program Design',
          description: 'Design referral program',
          tasks: [
            {
              title: 'Define program structure',
              description: 'Design referral mechanics.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'strategy'],
            },
            {
              title: 'Set reward tiers',
              description: 'Determine incentive levels.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'rewards'],
            },
            {
              title: 'Create program terms',
              description: 'Draft legal terms.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['legal', 'documentation'],
            },
          ],
        },
        {
          name: 'Technical Setup',
          description: 'Build program infrastructure',
          tasks: [
            {
              title: 'Set up referral tracking',
              description: 'Implement tracking system.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['technical', 'setup'],
            },
            {
              title: 'Build referral portal',
              description: 'Create user interface.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['technical', 'web'],
            },
            {
              title: 'Configure reward fulfillment',
              description: 'Set up reward delivery.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['technical', 'rewards'],
            },
          ],
        },
        {
          name: 'Launch & Promotion',
          description: 'Launch program',
          tasks: [
            {
              title: 'Create promotional materials',
              description: 'Design launch assets.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'high',
              labels: ['content', 'design'],
            },
            {
              title: 'Launch to existing customers',
              description: 'Announce to customer base.',
              assigneeRole: 'lead',
              dueOffset: 21,
              priority: 'high',
              labels: ['launch', 'email'],
            },
            {
              title: 'Monitor program performance',
              description: 'Track referral metrics.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['analytics', 'monitoring'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['design', 'build', 'launch', 'active'],
      },
    },
    settings: {
      trackReferrals: true,
    },
  },

  // ==================== 23. LOYALTY PROGRAM MARKETING ====================
  {
    name: 'Loyalty Program Marketing',
    slug: 'loyalty-program-marketing',
    description:
      'Market and promote customer loyalty program to increase enrollment and engagement.',
    category: 'marketing',
    icon: 'Award',
    color: '#FBBF24',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'active', name: 'Active', order: 2, color: '#F59E0B' },
      { id: 'optimization', name: 'Optimization', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Program Type',
        type: 'select',
        description: 'Loyalty model',
        options: ['Points', 'Tiers', 'Cashback', 'Perks', 'Hybrid'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy',
          description: 'Plan loyalty marketing',
          tasks: [
            {
              title: 'Define marketing objectives',
              description: 'Set enrollment and engagement goals.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'goals'],
            },
            {
              title: 'Identify target segments',
              description: 'Define customer segments.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['segmentation', 'targeting'],
            },
            {
              title: 'Map customer journey',
              description: 'Design loyalty touchpoints.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['strategy', 'journey'],
            },
          ],
        },
        {
          name: 'Content Creation',
          description: 'Create promotional content',
          tasks: [
            {
              title: 'Develop program messaging',
              description: 'Create value proposition.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['content', 'messaging'],
            },
            {
              title: 'Design promotional assets',
              description: 'Create visual materials.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['design', 'creative'],
            },
            {
              title: 'Create email sequences',
              description: 'Build enrollment campaigns.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['email', 'automation'],
            },
          ],
        },
        {
          name: 'Execution',
          description: 'Launch marketing campaigns',
          tasks: [
            {
              title: 'Launch enrollment campaign',
              description: 'Promote program signup.',
              assigneeRole: 'lead',
              dueOffset: 21,
              priority: 'high',
              labels: ['launch', 'campaign'],
            },
            {
              title: 'Implement engagement tactics',
              description: 'Activate member engagement.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['engagement', 'retention'],
            },
            {
              title: 'Track program metrics',
              description: 'Monitor performance.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'high',
              labels: ['analytics', 'reporting'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'creation', 'active', 'optimization'],
      },
    },
    settings: {
      trackLoyalty: true,
    },
  },

  // ==================== 24. SEASONAL MARKETING CAMPAIGN ====================
  {
    name: 'Seasonal Marketing Campaign',
    slug: 'seasonal-marketing-campaign',
    description:
      'Plan and execute seasonal marketing initiatives aligned with key calendar moments.',
    category: 'marketing',
    icon: 'Sun',
    color: '#F97316',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'live', name: 'Live', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Season',
        type: 'select',
        description: 'Target season',
        options: ['Spring', 'Summer', 'Fall', 'Winter', 'Holiday', 'Back-to-School'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan seasonal campaign',
          tasks: [
            {
              title: 'Define seasonal theme',
              description: 'Set campaign theme and messaging.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'theme'],
            },
            {
              title: 'Plan promotional offers',
              description: 'Design seasonal promotions.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'offers'],
            },
            {
              title: 'Set campaign timeline',
              description: 'Define key dates.',
              assigneeRole: 'lead',
              dueOffset: 2,
              priority: 'high',
              labels: ['planning', 'timeline'],
            },
          ],
        },
        {
          name: 'Creative Development',
          description: 'Create seasonal content',
          tasks: [
            {
              title: 'Design seasonal assets',
              description: 'Create themed visuals.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['design', 'creative'],
            },
            {
              title: 'Write campaign copy',
              description: 'Create seasonal messaging.',
              assigneeRole: 'member',
              dueOffset: 8,
              priority: 'high',
              labels: ['content', 'copywriting'],
            },
            {
              title: 'Prepare email campaigns',
              description: 'Build promotional emails.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['email', 'campaign'],
            },
          ],
        },
        {
          name: 'Execution',
          description: 'Launch campaign',
          tasks: [
            {
              title: 'Launch seasonal campaign',
              description: 'Activate all channels.',
              assigneeRole: 'lead',
              dueOffset: 21,
              priority: 'high',
              labels: ['launch', 'execution'],
            },
            {
              title: 'Monitor daily performance',
              description: 'Track campaign metrics.',
              assigneeRole: 'member',
              dueOffset: 25,
              priority: 'high',
              labels: ['monitoring', 'analytics'],
            },
            {
              title: 'Optimize and adjust',
              description: 'Refine based on data.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'medium',
              labels: ['optimization', 'adjustment'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'creation', 'live', 'completed'],
      },
    },
    settings: {
      seasonal: true,
    },
  },

  // ==================== 25. HOLIDAY MARKETING CAMPAIGN ====================
  {
    name: 'Holiday Marketing Campaign',
    slug: 'holiday-marketing-campaign',
    description:
      'Execute high-impact holiday marketing campaign with special promotions and themed content.',
    category: 'marketing',
    icon: 'Gift',
    color: '#DC2626',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'pre-holiday', name: 'Pre-Holiday', order: 2, color: '#F59E0B' },
      { id: 'live', name: 'Live', order: 3, color: '#EC4899' },
      { id: 'wrap-up', name: 'Wrap-up', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Holiday',
        type: 'select',
        description: 'Target holiday',
        options: ['Christmas', 'Thanksgiving', 'Halloween', 'Easter', 'Valentines Day', 'Mothers Day', 'Fathers Day'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy',
          description: 'Plan holiday campaign',
          tasks: [
            {
              title: 'Define holiday strategy',
              description: 'Set campaign objectives.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'planning'],
            },
            {
              title: 'Plan gift guides',
              description: 'Curate product recommendations.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['content', 'products'],
            },
            {
              title: 'Design promotional calendar',
              description: 'Map out promotions.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'calendar'],
            },
            {
              title: 'Set inventory alerts',
              description: 'Coordinate with operations.',
              assigneeRole: 'lead',
              dueOffset: 7,
              priority: 'medium',
              labels: ['operations', 'inventory'],
            },
          ],
        },
        {
          name: 'Creative',
          description: 'Create holiday content',
          tasks: [
            {
              title: 'Design holiday assets',
              description: 'Create festive visuals.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['design', 'creative'],
            },
            {
              title: 'Produce video content',
              description: 'Create holiday videos.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'medium',
              labels: ['video', 'production'],
            },
            {
              title: 'Write email sequences',
              description: 'Create holiday emails.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'high',
              labels: ['email', 'content'],
            },
          ],
        },
        {
          name: 'Execution',
          description: 'Launch holiday campaign',
          tasks: [
            {
              title: 'Launch early-bird promotions',
              description: 'Start pre-holiday offers.',
              assigneeRole: 'lead',
              dueOffset: 28,
              priority: 'high',
              labels: ['launch', 'promotions'],
            },
            {
              title: 'Execute peak campaigns',
              description: 'Run main promotions.',
              assigneeRole: 'lead',
              dueOffset: 35,
              priority: 'urgent',
              labels: ['execution', 'peak'],
            },
            {
              title: 'Manage last-minute push',
              description: 'Final promotional push.',
              assigneeRole: 'member',
              dueOffset: 40,
              priority: 'high',
              labels: ['execution', 'urgency'],
            },
            {
              title: 'Post-holiday analysis',
              description: 'Review campaign results.',
              assigneeRole: 'lead',
              dueOffset: 50,
              priority: 'high',
              labels: ['analytics', 'reporting'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'creation', 'pre-holiday', 'live', 'wrap-up'],
      },
    },
    settings: {
      holidayTracking: true,
    },
  },

  // ==================== 26. BLACK FRIDAY CAMPAIGN ====================
  {
    name: 'Black Friday Campaign',
    slug: 'black-friday-campaign',
    description:
      'Plan and execute Black Friday and Cyber Monday sales campaigns with aggressive promotions.',
    category: 'marketing',
    icon: 'Tag',
    color: '#111827',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'preparation', name: 'Preparation', order: 1, color: '#3B82F6' },
      { id: 'black-friday', name: 'Black Friday', order: 2, color: '#111827' },
      { id: 'cyber-monday', name: 'Cyber Monday', order: 3, color: '#0EA5E9' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Discount Strategy',
        type: 'select',
        description: 'Promotion type',
        options: ['Percentage Off', 'BOGO', 'Tiered Discounts', 'Flash Sales', 'Bundle Deals'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan BFCM strategy',
          tasks: [
            {
              title: 'Define BFCM strategy',
              description: 'Set sales and marketing goals.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'planning'],
            },
            {
              title: 'Plan promotions',
              description: 'Design deals and discounts.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['planning', 'promotions'],
            },
            {
              title: 'Prepare inventory',
              description: 'Coordinate stock levels.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['operations', 'inventory'],
            },
          ],
        },
        {
          name: 'Marketing Preparation',
          description: 'Create campaign assets',
          tasks: [
            {
              title: 'Design BFCM creative',
              description: 'Create promotional assets.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['design', 'creative'],
            },
            {
              title: 'Build email sequences',
              description: 'Create teaser and sale emails.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'high',
              labels: ['email', 'automation'],
            },
            {
              title: 'Set up paid campaigns',
              description: 'Prepare ad campaigns.',
              assigneeRole: 'member',
              dueOffset: 19,
              priority: 'high',
              labels: ['paid', 'advertising'],
            },
            {
              title: 'Test website performance',
              description: 'Load test site.',
              assigneeRole: 'member',
              dueOffset: 20,
              priority: 'high',
              labels: ['technical', 'testing'],
            },
          ],
        },
        {
          name: 'Execution',
          description: 'Execute BFCM campaigns',
          tasks: [
            {
              title: 'Launch Black Friday',
              description: 'Activate BF promotions.',
              assigneeRole: 'lead',
              dueOffset: 25,
              priority: 'urgent',
              labels: ['launch', 'black-friday'],
            },
            {
              title: 'Monitor and optimize',
              description: 'Real-time adjustments.',
              assigneeRole: 'member',
              dueOffset: 26,
              priority: 'urgent',
              labels: ['monitoring', 'optimization'],
            },
            {
              title: 'Execute Cyber Monday',
              description: 'Activate CM promotions.',
              assigneeRole: 'lead',
              dueOffset: 28,
              priority: 'urgent',
              labels: ['launch', 'cyber-monday'],
            },
            {
              title: 'Post-event analysis',
              description: 'Review BFCM results.',
              assigneeRole: 'lead',
              dueOffset: 35,
              priority: 'high',
              labels: ['analytics', 'reporting'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'preparation', 'black-friday', 'cyber-monday', 'completed'],
      },
    },
    settings: {
      urgentMonitoring: true,
    },
  },

  // ==================== 27. NEW YEAR CAMPAIGN ====================
  {
    name: 'New Year Campaign',
    slug: 'new-year-campaign',
    description:
      'New Year marketing campaign focusing on resolutions, fresh starts, and annual goals.',
    category: 'marketing',
    icon: 'Sparkles',
    color: '#EAB308',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'live', name: 'Live', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Campaign Focus',
        type: 'select',
        description: 'Main theme',
        options: ['Resolutions', 'Fresh Start', 'Year in Review', 'Goal Setting', 'New Products'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy',
          description: 'Plan New Year campaign',
          tasks: [
            {
              title: 'Define campaign theme',
              description: 'Set New Year messaging.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'theme'],
            },
            {
              title: 'Plan promotions',
              description: 'Design New Year offers.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'promotions'],
            },
            {
              title: 'Create year in review',
              description: 'Compile annual highlights.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'medium',
              labels: ['content', 'review'],
            },
          ],
        },
        {
          name: 'Content Creation',
          description: 'Create New Year content',
          tasks: [
            {
              title: 'Design New Year assets',
              description: 'Create festive visuals.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['design', 'creative'],
            },
            {
              title: 'Write resolution content',
              description: 'Create helpful content.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['content', 'blog'],
            },
            {
              title: 'Prepare email campaign',
              description: 'Build New Year emails.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['email', 'campaign'],
            },
          ],
        },
        {
          name: 'Execution',
          description: 'Launch campaign',
          tasks: [
            {
              title: 'Launch New Year campaign',
              description: 'Activate all channels.',
              assigneeRole: 'lead',
              dueOffset: 21,
              priority: 'high',
              labels: ['launch', 'execution'],
            },
            {
              title: 'Extend January promotions',
              description: 'Continue momentum.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'medium',
              labels: ['promotions', 'extension'],
            },
            {
              title: 'Analyze campaign results',
              description: 'Review performance.',
              assigneeRole: 'lead',
              dueOffset: 35,
              priority: 'high',
              labels: ['analytics', 'reporting'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'creation', 'live', 'completed'],
      },
    },
    settings: {
      seasonal: true,
    },
  },

  // ==================== 28. VALENTINES DAY CAMPAIGN ====================
  {
    name: 'Valentines Day Campaign',
    slug: 'valentines-day-campaign',
    description:
      'Romance-themed marketing campaign for Valentines Day with gift guides and special offers.',
    category: 'marketing',
    icon: 'Heart',
    color: '#EC4899',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'live', name: 'Live', order: 2, color: '#EC4899' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Target Audience',
        type: 'select',
        description: 'Primary audience',
        options: ['Couples', 'Singles', 'Self-Love', 'Gift Givers', 'All'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan Valentines campaign',
          tasks: [
            {
              title: 'Define campaign strategy',
              description: 'Set Valentines objectives.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'planning'],
            },
            {
              title: 'Create gift guides',
              description: 'Curate gift recommendations.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['content', 'products'],
            },
            {
              title: 'Plan special offers',
              description: 'Design romantic promotions.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'promotions'],
            },
          ],
        },
        {
          name: 'Creative',
          description: 'Create romantic content',
          tasks: [
            {
              title: 'Design Valentines assets',
              description: 'Create romantic visuals.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['design', 'creative'],
            },
            {
              title: 'Write romantic copy',
              description: 'Create campaign messaging.',
              assigneeRole: 'member',
              dueOffset: 8,
              priority: 'high',
              labels: ['content', 'copywriting'],
            },
            {
              title: 'Build email campaign',
              description: 'Create Valentines emails.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['email', 'campaign'],
            },
          ],
        },
        {
          name: 'Execution',
          description: 'Launch campaign',
          tasks: [
            {
              title: 'Launch early promotions',
              description: 'Start early February.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['launch', 'promotions'],
            },
            {
              title: 'Push last-minute gifts',
              description: 'Target procrastinators.',
              assigneeRole: 'member',
              dueOffset: 20,
              priority: 'high',
              labels: ['urgency', 'promotions'],
            },
            {
              title: 'Analyze results',
              description: 'Review campaign success.',
              assigneeRole: 'lead',
              dueOffset: 25,
              priority: 'medium',
              labels: ['analytics', 'reporting'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'creation', 'live', 'completed'],
      },
    },
    settings: {
      seasonal: true,
    },
  },

  // ==================== 29. MOTHERS/FATHERS DAY CAMPAIGN ====================
  {
    name: 'Parent Appreciation Campaign',
    slug: 'parent-appreciation-campaign',
    description:
      'Mothers Day and Fathers Day combined campaign celebrating parents with gift-focused marketing.',
    category: 'marketing',
    icon: 'Users',
    color: '#7C3AED',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'mothers-day', name: 'Mothers Day', order: 1, color: '#EC4899' },
      { id: 'fathers-day', name: 'Fathers Day', order: 2, color: '#3B82F6' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Holiday Focus',
        type: 'select',
        description: 'Which holiday',
        options: ['Mothers Day', 'Fathers Day', 'Both'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan parent day campaigns',
          tasks: [
            {
              title: 'Define campaign strategy',
              description: 'Set objectives for both days.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'planning'],
            },
            {
              title: 'Create gift guides',
              description: 'Curate parent gift ideas.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['content', 'products'],
            },
            {
              title: 'Plan promotional calendar',
              description: 'Schedule both campaigns.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'calendar'],
            },
          ],
        },
        {
          name: 'Mothers Day',
          description: 'Mothers Day execution',
          tasks: [
            {
              title: 'Design Mothers Day assets',
              description: 'Create campaign visuals.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['design', 'mothers-day'],
            },
            {
              title: 'Launch Mothers Day campaign',
              description: 'Activate promotions.',
              assigneeRole: 'lead',
              dueOffset: 21,
              priority: 'high',
              labels: ['launch', 'execution'],
            },
            {
              title: 'Send reminder emails',
              description: 'Last-minute gift push.',
              assigneeRole: 'member',
              dueOffset: 25,
              priority: 'high',
              labels: ['email', 'urgency'],
            },
          ],
        },
        {
          name: 'Fathers Day',
          description: 'Fathers Day execution',
          tasks: [
            {
              title: 'Design Fathers Day assets',
              description: 'Create campaign visuals.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'high',
              labels: ['design', 'fathers-day'],
            },
            {
              title: 'Launch Fathers Day campaign',
              description: 'Activate promotions.',
              assigneeRole: 'lead',
              dueOffset: 42,
              priority: 'high',
              labels: ['launch', 'execution'],
            },
            {
              title: 'Analyze combined results',
              description: 'Review both campaigns.',
              assigneeRole: 'lead',
              dueOffset: 50,
              priority: 'high',
              labels: ['analytics', 'reporting'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'mothers-day', 'fathers-day', 'completed'],
      },
    },
    settings: {
      seasonal: true,
    },
  },

  // ==================== 30. SUMMER CAMPAIGN ====================
  {
    name: 'Summer Campaign',
    slug: 'summer-campaign',
    description:
      'Summer-themed marketing campaign with vacation vibes, outdoor activities, and seasonal promotions.',
    category: 'marketing',
    icon: 'Sun',
    color: '#FBBF24',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'live', name: 'Live', order: 2, color: '#FBBF24' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Summer Theme',
        type: 'select',
        description: 'Campaign focus',
        options: ['Vacation', 'Outdoor', 'Beach', 'Travel', 'Fitness'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan summer campaign',
          tasks: [
            {
              title: 'Define summer strategy',
              description: 'Set seasonal objectives.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'planning'],
            },
            {
              title: 'Plan summer promotions',
              description: 'Design seasonal offers.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['planning', 'promotions'],
            },
            {
              title: 'Identify summer content',
              description: 'Plan seasonal content.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['content', 'planning'],
            },
          ],
        },
        {
          name: 'Creative',
          description: 'Create summer content',
          tasks: [
            {
              title: 'Design summer visuals',
              description: 'Create sunny assets.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['design', 'creative'],
            },
            {
              title: 'Create summer content',
              description: 'Produce seasonal content.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['content', 'production'],
            },
            {
              title: 'Build email campaigns',
              description: 'Create summer emails.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'high',
              labels: ['email', 'campaign'],
            },
          ],
        },
        {
          name: 'Execution',
          description: 'Launch summer campaign',
          tasks: [
            {
              title: 'Launch campaign',
              description: 'Activate summer promotions.',
              assigneeRole: 'lead',
              dueOffset: 28,
              priority: 'high',
              labels: ['launch', 'execution'],
            },
            {
              title: 'Monitor performance',
              description: 'Track summer metrics.',
              assigneeRole: 'member',
              dueOffset: 42,
              priority: 'medium',
              labels: ['monitoring', 'analytics'],
            },
            {
              title: 'End-of-summer analysis',
              description: 'Review campaign results.',
              assigneeRole: 'lead',
              dueOffset: 90,
              priority: 'high',
              labels: ['analytics', 'reporting'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'creation', 'live', 'completed'],
      },
    },
    settings: {
      seasonal: true,
    },
  },

  // ==================== 31. BACK-TO-SCHOOL CAMPAIGN ====================
  {
    name: 'Back-to-School Campaign',
    slug: 'back-to-school-campaign',
    description:
      'Target students, parents, and educators with back-to-school promotions and content.',
    category: 'marketing',
    icon: 'BookOpen',
    color: '#0891B2',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'early-bird', name: 'Early Bird', order: 2, color: '#F59E0B' },
      { id: 'peak', name: 'Peak', order: 3, color: '#EC4899' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Target Segment',
        type: 'select',
        description: 'Primary audience',
        options: ['Students', 'Parents', 'Teachers', 'College', 'All'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan BTS campaign',
          tasks: [
            {
              title: 'Define BTS strategy',
              description: 'Set campaign objectives.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'planning'],
            },
            {
              title: 'Research BTS trends',
              description: 'Identify shopping patterns.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['research', 'trends'],
            },
            {
              title: 'Plan promotional tiers',
              description: 'Design offer schedule.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['planning', 'promotions'],
            },
          ],
        },
        {
          name: 'Content Creation',
          description: 'Create BTS content',
          tasks: [
            {
              title: 'Design BTS assets',
              description: 'Create campaign visuals.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['design', 'creative'],
            },
            {
              title: 'Create shopping guides',
              description: 'Build product guides.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'high',
              labels: ['content', 'guides'],
            },
            {
              title: 'Prepare email sequences',
              description: 'Build BTS emails.',
              assigneeRole: 'member',
              dueOffset: 19,
              priority: 'high',
              labels: ['email', 'automation'],
            },
          ],
        },
        {
          name: 'Execution',
          description: 'Launch BTS campaign',
          tasks: [
            {
              title: 'Launch early-bird sales',
              description: 'Start July promotions.',
              assigneeRole: 'lead',
              dueOffset: 28,
              priority: 'high',
              labels: ['launch', 'early-bird'],
            },
            {
              title: 'Execute peak season',
              description: 'August main campaign.',
              assigneeRole: 'lead',
              dueOffset: 42,
              priority: 'high',
              labels: ['execution', 'peak'],
            },
            {
              title: 'Last-minute push',
              description: 'Target late shoppers.',
              assigneeRole: 'member',
              dueOffset: 55,
              priority: 'high',
              labels: ['urgency', 'promotions'],
            },
            {
              title: 'Campaign analysis',
              description: 'Review BTS results.',
              assigneeRole: 'lead',
              dueOffset: 65,
              priority: 'high',
              labels: ['analytics', 'reporting'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'creation', 'early-bird', 'peak', 'completed'],
      },
    },
    settings: {
      seasonal: true,
    },
  },

  // ==================== 32. ANNIVERSARY MARKETING ====================
  {
    name: 'Anniversary Marketing',
    slug: 'anniversary-marketing',
    description:
      'Celebrate company or product anniversaries with special campaigns and customer appreciation.',
    category: 'marketing',
    icon: 'Cake',
    color: '#D946EF',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'celebration', name: 'Celebration', order: 2, color: '#D946EF' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Anniversary Type',
        type: 'select',
        description: 'What milestone',
        options: ['Company', 'Product', 'Service', 'Partnership', 'Store'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan anniversary campaign',
          tasks: [
            {
              title: 'Define celebration theme',
              description: 'Set anniversary messaging.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'theme'],
            },
            {
              title: 'Plan special offers',
              description: 'Design anniversary deals.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'promotions'],
            },
            {
              title: 'Create milestone content',
              description: 'Document journey and achievements.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['content', 'storytelling'],
            },
          ],
        },
        {
          name: 'Content Creation',
          description: 'Create anniversary assets',
          tasks: [
            {
              title: 'Design anniversary logo',
              description: 'Create special branding.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['design', 'branding'],
            },
            {
              title: 'Produce thank you video',
              description: 'Create customer appreciation video.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'medium',
              labels: ['video', 'production'],
            },
            {
              title: 'Build campaign assets',
              description: 'Create promotional materials.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['design', 'creative'],
            },
          ],
        },
        {
          name: 'Celebration',
          description: 'Execute anniversary campaign',
          tasks: [
            {
              title: 'Launch anniversary campaign',
              description: 'Start celebration promotions.',
              assigneeRole: 'lead',
              dueOffset: 21,
              priority: 'high',
              labels: ['launch', 'celebration'],
            },
            {
              title: 'Host anniversary event',
              description: 'Execute special event.',
              assigneeRole: 'lead',
              dueOffset: 25,
              priority: 'high',
              labels: ['event', 'execution'],
            },
            {
              title: 'Thank loyal customers',
              description: 'Customer appreciation outreach.',
              assigneeRole: 'member',
              dueOffset: 23,
              priority: 'high',
              labels: ['customer', 'appreciation'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'creation', 'celebration', 'completed'],
      },
    },
    settings: {
      milestone: true,
    },
  },

  // ==================== 33. MILESTONE CELEBRATION ====================
  {
    name: 'Milestone Celebration',
    slug: 'milestone-celebration',
    description:
      'Celebrate business milestones like customer count, revenue goals, or product achievements.',
    category: 'marketing',
    icon: 'Trophy',
    color: '#FBBF24',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'announcement', name: 'Announcement', order: 2, color: '#FBBF24' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Milestone Type',
        type: 'select',
        description: 'Achievement type',
        options: ['Customer Count', 'Revenue', 'Product', 'Users', 'Downloads', 'Other'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan milestone campaign',
          tasks: [
            {
              title: 'Define milestone story',
              description: 'Craft achievement narrative.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'storytelling'],
            },
            {
              title: 'Plan celebration activities',
              description: 'Design promotional activities.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['planning', 'activities'],
            },
            {
              title: 'Identify thank-you opportunities',
              description: 'Plan customer appreciation.',
              assigneeRole: 'member',
              dueOffset: 2,
              priority: 'high',
              labels: ['customer', 'appreciation'],
            },
          ],
        },
        {
          name: 'Content',
          description: 'Create celebration content',
          tasks: [
            {
              title: 'Create announcement content',
              description: 'Write milestone messaging.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['content', 'announcement'],
            },
            {
              title: 'Design celebration assets',
              description: 'Create visual materials.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['design', 'creative'],
            },
            {
              title: 'Prepare PR materials',
              description: 'Draft press release.',
              assigneeRole: 'member',
              dueOffset: 8,
              priority: 'medium',
              labels: ['pr', 'content'],
            },
          ],
        },
        {
          name: 'Announcement',
          description: 'Announce milestone',
          tasks: [
            {
              title: 'Launch announcement',
              description: 'Publish milestone news.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['launch', 'announcement'],
            },
            {
              title: 'Engage community',
              description: 'Respond to congratulations.',
              assigneeRole: 'member',
              dueOffset: 15,
              priority: 'high',
              labels: ['engagement', 'community'],
            },
            {
              title: 'Document for future',
              description: 'Archive celebration content.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'low',
              labels: ['documentation', 'archive'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'creation', 'announcement', 'completed'],
      },
    },
    settings: {
      milestone: true,
    },
  },

  // ==================== 34. AWARD SUBMISSION CAMPAIGN ====================
  {
    name: 'Award Submission Campaign',
    slug: 'award-submission-campaign',
    description:
      'Prepare and submit entries for industry awards and recognition programs.',
    category: 'marketing',
    icon: 'Award',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'research', name: 'Research', order: 0, color: '#6B7280' },
      { id: 'preparation', name: 'Preparation', order: 1, color: '#3B82F6' },
      { id: 'submitted', name: 'Submitted', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Award Category',
        type: 'select',
        description: 'Type of award',
        options: ['Industry', 'Product', 'Leadership', 'Innovation', 'Design', 'Customer Service'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Research',
          description: 'Identify award opportunities',
          tasks: [
            {
              title: 'Research relevant awards',
              description: 'Identify submission opportunities.',
              assigneeRole: 'member',
              dueOffset: 0,
              priority: 'high',
              labels: ['research', 'awards'],
            },
            {
              title: 'Review eligibility criteria',
              description: 'Check requirements.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['research', 'criteria'],
            },
            {
              title: 'Create submission calendar',
              description: 'Track deadlines.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['planning', 'calendar'],
            },
          ],
        },
        {
          name: 'Preparation',
          description: 'Prepare submissions',
          tasks: [
            {
              title: 'Gather supporting materials',
              description: 'Collect data and testimonials.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['preparation', 'content'],
            },
            {
              title: 'Write submission narratives',
              description: 'Craft compelling stories.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['content', 'writing'],
            },
            {
              title: 'Prepare visual materials',
              description: 'Create supporting visuals.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'medium',
              labels: ['design', 'visuals'],
            },
            {
              title: 'Review and refine',
              description: 'Polish submissions.',
              assigneeRole: 'lead',
              dueOffset: 19,
              priority: 'high',
              labels: ['review', 'refinement'],
            },
          ],
        },
        {
          name: 'Submission',
          description: 'Submit entries',
          tasks: [
            {
              title: 'Submit award entries',
              description: 'Complete submissions.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['submission', 'execution'],
            },
            {
              title: 'Track submission status',
              description: 'Monitor progress.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'medium',
              labels: ['tracking', 'status'],
            },
            {
              title: 'Plan winner announcements',
              description: 'Prepare for results.',
              assigneeRole: 'lead',
              dueOffset: 35,
              priority: 'medium',
              labels: ['planning', 'announcements'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['research', 'preparation', 'submitted', 'completed'],
      },
    },
    settings: {
      trackDeadlines: true,
    },
  },

  // ==================== 35. INDUSTRY REPORT LAUNCH ====================
  {
    name: 'Industry Report Launch',
    slug: 'industry-report-launch',
    description:
      'Create and launch original industry research report for thought leadership and lead generation.',
    category: 'marketing',
    icon: 'BarChart',
    color: '#3B82F6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'research', name: 'Research', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'design', name: 'Design', order: 2, color: '#F59E0B' },
      { id: 'launch', name: 'Launch', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Report Type',
        type: 'select',
        description: 'Research format',
        options: ['Survey Report', 'Trend Analysis', 'Benchmark Study', 'State of Industry', 'Forecast'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Research',
          description: 'Conduct research',
          tasks: [
            {
              title: 'Define research scope',
              description: 'Set report objectives.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['research', 'planning'],
            },
            {
              title: 'Design survey/methodology',
              description: 'Create research approach.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['research', 'methodology'],
            },
            {
              title: 'Collect data',
              description: 'Gather research data.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['research', 'data'],
            },
            {
              title: 'Analyze findings',
              description: 'Interpret results.',
              assigneeRole: 'lead',
              dueOffset: 28,
              priority: 'high',
              labels: ['analysis', 'insights'],
            },
          ],
        },
        {
          name: 'Report Creation',
          description: 'Create the report',
          tasks: [
            {
              title: 'Write report content',
              description: 'Draft full report.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'high',
              labels: ['content', 'writing'],
            },
            {
              title: 'Create data visualizations',
              description: 'Design charts and graphs.',
              assigneeRole: 'member',
              dueOffset: 38,
              priority: 'high',
              labels: ['design', 'data-viz'],
            },
            {
              title: 'Design report layout',
              description: 'Format final document.',
              assigneeRole: 'member',
              dueOffset: 42,
              priority: 'high',
              labels: ['design', 'layout'],
            },
          ],
        },
        {
          name: 'Launch',
          description: 'Launch and promote report',
          tasks: [
            {
              title: 'Create landing page',
              description: 'Build download page.',
              assigneeRole: 'member',
              dueOffset: 45,
              priority: 'high',
              labels: ['web', 'landing-page'],
            },
            {
              title: 'Launch PR campaign',
              description: 'Pitch to media.',
              assigneeRole: 'member',
              dueOffset: 49,
              priority: 'high',
              labels: ['pr', 'outreach'],
            },
            {
              title: 'Promote across channels',
              description: 'Distribute report.',
              assigneeRole: 'member',
              dueOffset: 49,
              priority: 'high',
              labels: ['promotion', 'distribution'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['research', 'creation', 'design', 'launch'],
      },
    },
    settings: {
      leadGeneration: true,
    },
  },

  // ==================== 36. CASE STUDY DEVELOPMENT ====================
  {
    name: 'Case Study Development',
    slug: 'case-study-development',
    description:
      'Create compelling customer case studies showcasing success stories and ROI.',
    category: 'marketing',
    icon: 'FileText',
    color: '#059669',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'selection', name: 'Selection', order: 0, color: '#6B7280' },
      { id: 'interview', name: 'Interview', order: 1, color: '#3B82F6' },
      { id: 'creation', name: 'Creation', order: 2, color: '#F59E0B' },
      { id: 'published', name: 'Published', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Industry',
        type: 'select',
        description: 'Customer industry',
        options: ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Other'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Customer Selection',
          description: 'Identify case study candidates',
          tasks: [
            {
              title: 'Identify success stories',
              description: 'Find ideal customers.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['research', 'selection'],
            },
            {
              title: 'Get customer approval',
              description: 'Secure participation.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['outreach', 'approval'],
            },
            {
              title: 'Gather initial data',
              description: 'Collect metrics and background.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['research', 'data'],
            },
          ],
        },
        {
          name: 'Interview & Research',
          description: 'Conduct customer interviews',
          tasks: [
            {
              title: 'Prepare interview questions',
              description: 'Create discussion guide.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['preparation', 'interview'],
            },
            {
              title: 'Conduct customer interview',
              description: 'Interview key stakeholders.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['interview', 'research'],
            },
            {
              title: 'Collect supporting data',
              description: 'Gather ROI metrics.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'high',
              labels: ['data', 'metrics'],
            },
          ],
        },
        {
          name: 'Content Creation',
          description: 'Create case study',
          tasks: [
            {
              title: 'Write case study draft',
              description: 'Create initial content.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['content', 'writing'],
            },
            {
              title: 'Design case study',
              description: 'Create visual layout.',
              assigneeRole: 'member',
              dueOffset: 25,
              priority: 'high',
              labels: ['design', 'layout'],
            },
            {
              title: 'Get customer approval',
              description: 'Final review and sign-off.',
              assigneeRole: 'lead',
              dueOffset: 28,
              priority: 'high',
              labels: ['approval', 'review'],
            },
            {
              title: 'Publish and promote',
              description: 'Launch case study.',
              assigneeRole: 'member',
              dueOffset: 32,
              priority: 'high',
              labels: ['publish', 'promotion'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['selection', 'interview', 'creation', 'published'],
      },
    },
    settings: {
      customerApproval: true,
    },
  },

  // ==================== 37. WHITE PAPER CAMPAIGN ====================
  {
    name: 'White Paper Campaign',
    slug: 'white-paper-campaign',
    description:
      'Create and promote authoritative white paper for thought leadership and lead generation.',
    category: 'marketing',
    icon: 'File',
    color: '#6366F1',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'research', name: 'Research', order: 0, color: '#6B7280' },
      { id: 'writing', name: 'Writing', order: 1, color: '#3B82F6' },
      { id: 'design', name: 'Design', order: 2, color: '#F59E0B' },
      { id: 'promotion', name: 'Promotion', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Topic Area',
        type: 'text',
        description: 'White paper subject',
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning & Research',
          description: 'Plan white paper',
          tasks: [
            {
              title: 'Define white paper topic',
              description: 'Select compelling subject.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'topic'],
            },
            {
              title: 'Conduct research',
              description: 'Gather supporting data.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['research', 'data'],
            },
            {
              title: 'Create outline',
              description: 'Structure the document.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['planning', 'outline'],
            },
          ],
        },
        {
          name: 'Content Creation',
          description: 'Write white paper',
          tasks: [
            {
              title: 'Write first draft',
              description: 'Complete initial content.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['writing', 'content'],
            },
            {
              title: 'Expert review',
              description: 'Get SME feedback.',
              assigneeRole: 'lead',
              dueOffset: 25,
              priority: 'high',
              labels: ['review', 'feedback'],
            },
            {
              title: 'Finalize content',
              description: 'Polish final draft.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['editing', 'finalization'],
            },
          ],
        },
        {
          name: 'Design & Launch',
          description: 'Design and launch',
          tasks: [
            {
              title: 'Design white paper',
              description: 'Create professional layout.',
              assigneeRole: 'member',
              dueOffset: 32,
              priority: 'high',
              labels: ['design', 'layout'],
            },
            {
              title: 'Build landing page',
              description: 'Create download page.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'high',
              labels: ['web', 'landing-page'],
            },
            {
              title: 'Launch promotion',
              description: 'Promote white paper.',
              assigneeRole: 'lead',
              dueOffset: 38,
              priority: 'high',
              labels: ['launch', 'promotion'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['research', 'writing', 'design', 'promotion'],
      },
    },
    settings: {
      gatedContent: true,
    },
  },

  // ==================== 38. EBOOK LAUNCH ====================
  {
    name: 'Ebook Launch',
    slug: 'ebook-launch',
    description:
      'Create and launch ebook as lead magnet or thought leadership content.',
    category: 'marketing',
    icon: 'BookOpen',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'writing', name: 'Writing', order: 1, color: '#3B82F6' },
      { id: 'design', name: 'Design', order: 2, color: '#F59E0B' },
      { id: 'launch', name: 'Launch', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Ebook Topic',
        type: 'text',
        description: 'Main subject',
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan ebook project',
          tasks: [
            {
              title: 'Define ebook concept',
              description: 'Set topic and audience.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'concept'],
            },
            {
              title: 'Create chapter outline',
              description: 'Structure content.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['planning', 'outline'],
            },
            {
              title: 'Research content',
              description: 'Gather information.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['research', 'content'],
            },
          ],
        },
        {
          name: 'Writing',
          description: 'Write ebook content',
          tasks: [
            {
              title: 'Write chapters',
              description: 'Complete all content.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['writing', 'content'],
            },
            {
              title: 'Edit and proofread',
              description: 'Polish content.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'high',
              labels: ['editing', 'review'],
            },
            {
              title: 'Final approval',
              description: 'Sign off on content.',
              assigneeRole: 'lead',
              dueOffset: 38,
              priority: 'high',
              labels: ['approval', 'review'],
            },
          ],
        },
        {
          name: 'Design & Launch',
          description: 'Design and publish',
          tasks: [
            {
              title: 'Design ebook layout',
              description: 'Create visual design.',
              assigneeRole: 'member',
              dueOffset: 42,
              priority: 'high',
              labels: ['design', 'layout'],
            },
            {
              title: 'Create promotional assets',
              description: 'Design marketing materials.',
              assigneeRole: 'member',
              dueOffset: 45,
              priority: 'high',
              labels: ['design', 'promotion'],
            },
            {
              title: 'Launch ebook',
              description: 'Publish and promote.',
              assigneeRole: 'lead',
              dueOffset: 49,
              priority: 'high',
              labels: ['launch', 'promotion'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['planning', 'writing', 'design', 'launch'],
      },
    },
    settings: {
      leadMagnet: true,
    },
  },

  // ==================== 39. NEWSLETTER STRATEGY ====================
  {
    name: 'Newsletter Strategy',
    slug: 'newsletter-strategy',
    description:
      'Develop and launch email newsletter program for audience engagement and retention.',
    category: 'marketing',
    icon: 'Mail',
    color: '#0EA5E9',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'strategy', name: 'Strategy', order: 0, color: '#6B7280' },
      { id: 'setup', name: 'Setup', order: 1, color: '#3B82F6' },
      { id: 'launch', name: 'Launch', order: 2, color: '#F59E0B' },
      { id: 'ongoing', name: 'Ongoing', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Newsletter Frequency',
        type: 'select',
        description: 'Send frequency',
        options: ['Daily', 'Weekly', 'Bi-weekly', 'Monthly'],
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy',
          description: 'Define newsletter strategy',
          tasks: [
            {
              title: 'Define newsletter concept',
              description: 'Set format and content focus.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['strategy', 'concept'],
            },
            {
              title: 'Set goals and KPIs',
              description: 'Define success metrics.',
              assigneeRole: 'lead',
              dueOffset: 2,
              priority: 'high',
              labels: ['strategy', 'goals'],
            },
            {
              title: 'Plan content categories',
              description: 'Define content mix.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['content', 'planning'],
            },
          ],
        },
        {
          name: 'Setup',
          description: 'Set up newsletter infrastructure',
          tasks: [
            {
              title: 'Design newsletter template',
              description: 'Create email design.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['design', 'template'],
            },
            {
              title: 'Set up email platform',
              description: 'Configure ESP.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['setup', 'technical'],
            },
            {
              title: 'Create signup forms',
              description: 'Build subscription forms.',
              assigneeRole: 'member',
              dueOffset: 12,
              priority: 'high',
              labels: ['web', 'forms'],
            },
            {
              title: 'Write welcome sequence',
              description: 'Create onboarding emails.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['email', 'automation'],
            },
          ],
        },
        {
          name: 'Launch',
          description: 'Launch newsletter',
          tasks: [
            {
              title: 'Create first issues',
              description: 'Produce initial content.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['content', 'creation'],
            },
            {
              title: 'Launch newsletter',
              description: 'Send first edition.',
              assigneeRole: 'lead',
              dueOffset: 28,
              priority: 'high',
              labels: ['launch', 'execution'],
            },
            {
              title: 'Promote newsletter',
              description: 'Drive subscriptions.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'high',
              labels: ['promotion', 'growth'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['strategy', 'setup', 'launch', 'ongoing'],
      },
    },
    settings: {
      trackSubscribers: true,
    },
  },

  // ==================== 40. BLOG CONTENT CALENDAR ====================
  {
    name: 'Blog Content Calendar',
    slug: 'blog-content-calendar',
    description:
      'Plan and manage blog content production with editorial calendar and workflow.',
    category: 'marketing',
    icon: 'Layout',
    color: '#10B981',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'ideas', name: 'Ideas', order: 0, color: '#6B7280' },
      { id: 'writing', name: 'Writing', order: 1, color: '#3B82F6' },
      { id: 'editing', name: 'Editing', order: 2, color: '#F59E0B' },
      { id: 'published', name: 'Published', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Content Category',
        type: 'select',
        description: 'Blog category',
        options: ['How-To', 'Industry News', 'Thought Leadership', 'Product', 'Company News'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan content calendar',
          tasks: [
            {
              title: 'Define content themes',
              description: 'Set monthly themes.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['planning', 'themes'],
            },
            {
              title: 'Research topics',
              description: 'Generate topic ideas.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['research', 'topics'],
            },
            {
              title: 'Create editorial calendar',
              description: 'Schedule posts.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['planning', 'calendar'],
            },
          ],
        },
        {
          name: 'Content Production',
          description: 'Produce blog content',
          tasks: [
            {
              title: 'Assign writers',
              description: 'Delegate content creation.',
              assigneeRole: 'lead',
              dueOffset: 7,
              priority: 'high',
              labels: ['assignment', 'workflow'],
            },
            {
              title: 'Write blog posts',
              description: 'Create content.',
              assigneeRole: 'member',
              dueOffset: 21,
              priority: 'high',
              labels: ['writing', 'content'],
            },
            {
              title: 'Edit and review',
              description: 'Polish content.',
              assigneeRole: 'member',
              dueOffset: 25,
              priority: 'high',
              labels: ['editing', 'review'],
            },
          ],
        },
        {
          name: 'Publishing',
          description: 'Publish and promote',
          tasks: [
            {
              title: 'Schedule posts',
              description: 'Queue for publishing.',
              assigneeRole: 'member',
              dueOffset: 27,
              priority: 'high',
              labels: ['scheduling', 'publishing'],
            },
            {
              title: 'Promote on social',
              description: 'Share new posts.',
              assigneeRole: 'member',
              dueOffset: 28,
              priority: 'medium',
              labels: ['social', 'promotion'],
            },
            {
              title: 'Track performance',
              description: 'Monitor metrics.',
              assigneeRole: 'member',
              dueOffset: 35,
              priority: 'medium',
              labels: ['analytics', 'tracking'],
            },
          ],
        },
      ],
      settings: {
        defaultView: 'board',
        statuses: ['ideas', 'writing', 'editing', 'published'],
      },
    },
    settings: {
      contentCalendar: true,
    },
  },

  // ==================== 41. GUEST POSTING STRATEGY ====================
  {
    name: 'Guest Posting Strategy',
    slug: 'guest-posting-strategy',
    description: 'Build authority and backlinks through strategic guest posting on relevant publications.',
    category: 'marketing',
    icon: 'ExternalLink',
    color: '#7C3AED',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'research', name: 'Research', order: 0, color: '#6B7280' },
      { id: 'outreach', name: 'Outreach', order: 1, color: '#3B82F6' },
      { id: 'writing', name: 'Writing', order: 2, color: '#F59E0B' },
      { id: 'published', name: 'Published', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Target Publication', type: 'text', description: 'Publication name', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Research',
          description: 'Identify guest posting opportunities',
          tasks: [
            { title: 'Research target publications', description: 'Find relevant sites.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['research', 'outreach'] },
            { title: 'Analyze publication guidelines', description: 'Review submission requirements.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['research', 'guidelines'] },
            { title: 'Create pitch templates', description: 'Draft outreach emails.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['content', 'templates'] },
          ],
        },
        {
          name: 'Outreach & Writing',
          description: 'Pitch and create content',
          tasks: [
            { title: 'Send pitches', description: 'Contact editors.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['outreach', 'pitching'] },
            { title: 'Write guest posts', description: 'Create approved content.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['writing', 'content'] },
            { title: 'Submit for review', description: 'Send to publication.', assigneeRole: 'member', dueOffset: 25, priority: 'high', labels: ['submission', 'review'] },
          ],
        },
        {
          name: 'Promotion',
          description: 'Promote published posts',
          tasks: [
            { title: 'Share published posts', description: 'Promote on social.', assigneeRole: 'member', dueOffset: 30, priority: 'medium', labels: ['promotion', 'social'] },
            { title: 'Track backlinks', description: 'Monitor link metrics.', assigneeRole: 'member', dueOffset: 35, priority: 'medium', labels: ['analytics', 'seo'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['research', 'outreach', 'writing', 'published'] },
    },
    settings: { trackBacklinks: true },
  },

  // ==================== 42. LINK BUILDING CAMPAIGN ====================
  {
    name: 'Link Building Campaign',
    slug: 'link-building-campaign',
    description: 'Acquire high-quality backlinks through outreach, content, and relationship building.',
    category: 'marketing',
    icon: 'Link',
    color: '#059669',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'research', name: 'Research', order: 0, color: '#6B7280' },
      { id: 'outreach', name: 'Outreach', order: 1, color: '#3B82F6' },
      { id: 'negotiation', name: 'Negotiation', order: 2, color: '#F59E0B' },
      { id: 'acquired', name: 'Acquired', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Link Type', type: 'select', description: 'Type of link', options: ['Editorial', 'Guest Post', 'Resource', 'Directory', 'Mention'], isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Research',
          description: 'Identify link opportunities',
          tasks: [
            { title: 'Analyze competitor backlinks', description: 'Research competitor links.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['research', 'competitive'] },
            { title: 'Identify link prospects', description: 'Build prospect list.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['research', 'prospects'] },
            { title: 'Create linkable assets', description: 'Develop link-worthy content.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['content', 'assets'] },
          ],
        },
        {
          name: 'Outreach',
          description: 'Contact prospects',
          tasks: [
            { title: 'Personalize outreach', description: 'Craft custom emails.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['outreach', 'email'] },
            { title: 'Follow up', description: 'Send follow-up emails.', assigneeRole: 'member', dueOffset: 24, priority: 'medium', labels: ['outreach', 'follow-up'] },
            { title: 'Track acquired links', description: 'Monitor new backlinks.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['tracking', 'analytics'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['research', 'outreach', 'negotiation', 'acquired'] },
    },
    settings: { trackBacklinks: true },
  },

  // ==================== 43. LOCAL SEO CAMPAIGN ====================
  {
    name: 'Local SEO Campaign',
    slug: 'local-seo-campaign',
    description: 'Improve local search visibility for brick-and-mortar or service-area businesses.',
    category: 'marketing',
    icon: 'MapPin',
    color: '#EF4444',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'audit', name: 'Audit', order: 0, color: '#6B7280' },
      { id: 'optimization', name: 'Optimization', order: 1, color: '#3B82F6' },
      { id: 'citations', name: 'Citations', order: 2, color: '#F59E0B' },
      { id: 'monitoring', name: 'Monitoring', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Location', type: 'text', description: 'Target location', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Local Audit',
          description: 'Assess local SEO status',
          tasks: [
            { title: 'Audit Google Business Profile', description: 'Review GBP listing.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['audit', 'gbp'] },
            { title: 'Check NAP consistency', description: 'Verify name, address, phone.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['audit', 'citations'] },
            { title: 'Analyze local competitors', description: 'Research local competition.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['research', 'competitive'] },
          ],
        },
        {
          name: 'Optimization',
          description: 'Optimize local presence',
          tasks: [
            { title: 'Optimize GBP listing', description: 'Enhance profile.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['optimization', 'gbp'] },
            { title: 'Build local citations', description: 'Submit to directories.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['citations', 'directories'] },
            { title: 'Generate reviews', description: 'Implement review strategy.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['reviews', 'reputation'] },
            { title: 'Create local content', description: 'Develop location pages.', assigneeRole: 'member', dueOffset: 28, priority: 'medium', labels: ['content', 'local'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['audit', 'optimization', 'citations', 'monitoring'] },
    },
    settings: { trackLocalRankings: true },
  },

  // ==================== 44. INTERNATIONAL SEO ====================
  {
    name: 'International SEO',
    slug: 'international-seo',
    description: 'Expand search presence to international markets with multi-language optimization.',
    category: 'marketing',
    icon: 'Globe',
    color: '#3B82F6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'research', name: 'Research', order: 0, color: '#6B7280' },
      { id: 'technical', name: 'Technical', order: 1, color: '#3B82F6' },
      { id: 'content', name: 'Content', order: 2, color: '#F59E0B' },
      { id: 'live', name: 'Live', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Target Markets', type: 'multiselect', description: 'Target countries', options: ['US', 'UK', 'Germany', 'France', 'Spain', 'Japan', 'Brazil'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Market Research',
          description: 'Research target markets',
          tasks: [
            { title: 'Analyze target markets', description: 'Research market potential.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['research', 'markets'] },
            { title: 'Keyword research by market', description: 'Localized keyword research.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['research', 'keywords'] },
            { title: 'Competitor analysis', description: 'Research local competitors.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['research', 'competitive'] },
          ],
        },
        {
          name: 'Technical Setup',
          description: 'Configure technical infrastructure',
          tasks: [
            { title: 'Implement hreflang tags', description: 'Set up language targeting.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['technical', 'hreflang'] },
            { title: 'Configure URL structure', description: 'Set up subdirectories/subdomains.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['technical', 'structure'] },
            { title: 'Set up Search Console', description: 'Configure for each market.', assigneeRole: 'member', dueOffset: 19, priority: 'high', labels: ['technical', 'setup'] },
          ],
        },
        {
          name: 'Content Localization',
          description: 'Localize content',
          tasks: [
            { title: 'Translate priority pages', description: 'Localize key content.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['content', 'translation'] },
            { title: 'Create local content', description: 'Develop market-specific content.', assigneeRole: 'member', dueOffset: 42, priority: 'medium', labels: ['content', 'local'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['research', 'technical', 'content', 'live'] },
    },
    settings: { multiMarket: true },
  },

  // ==================== 45. VOICE SEARCH OPTIMIZATION ====================
  {
    name: 'Voice Search Optimization',
    slug: 'voice-search-optimization',
    description: 'Optimize content for voice search queries and smart speakers.',
    category: 'marketing',
    icon: 'Mic',
    color: '#6366F1',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'research', name: 'Research', order: 0, color: '#6B7280' },
      { id: 'optimization', name: 'Optimization', order: 1, color: '#3B82F6' },
      { id: 'implementation', name: 'Implementation', order: 2, color: '#F59E0B' },
      { id: 'monitoring', name: 'Monitoring', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Device Focus', type: 'multiselect', description: 'Target devices', options: ['Google Assistant', 'Alexa', 'Siri', 'Cortana'], isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Research',
          description: 'Research voice search patterns',
          tasks: [
            { title: 'Analyze voice queries', description: 'Research question patterns.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['research', 'queries'] },
            { title: 'Identify featured snippet opportunities', description: 'Find position zero targets.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['research', 'snippets'] },
            { title: 'Audit current content', description: 'Review conversational content.', assigneeRole: 'member', dueOffset: 7, priority: 'medium', labels: ['audit', 'content'] },
          ],
        },
        {
          name: 'Optimization',
          description: 'Optimize for voice',
          tasks: [
            { title: 'Optimize for questions', description: 'Add FAQ content.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['content', 'faq'] },
            { title: 'Implement structured data', description: 'Add speakable schema.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['technical', 'schema'] },
            { title: 'Optimize for featured snippets', description: 'Target position zero.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['content', 'snippets'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['research', 'optimization', 'implementation', 'monitoring'] },
    },
    settings: { trackVoiceSearch: true },
  },

  // ==================== 46. MOBILE MARKETING CAMPAIGN ====================
  {
    name: 'Mobile Marketing Campaign',
    slug: 'mobile-marketing-campaign',
    description: 'Execute mobile-first marketing campaigns targeting smartphone users.',
    category: 'marketing',
    icon: 'Smartphone',
    color: '#0EA5E9',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'live', name: 'Live', order: 2, color: '#F59E0B' },
      { id: 'optimization', name: 'Optimization', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Mobile Channel', type: 'multiselect', description: 'Marketing channels', options: ['SMS', 'Push', 'In-App', 'Mobile Web', 'App Ads'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy',
          description: 'Plan mobile campaign',
          tasks: [
            { title: 'Define mobile objectives', description: 'Set campaign goals.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy', 'goals'] },
            { title: 'Research mobile behavior', description: 'Analyze user patterns.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['research', 'behavior'] },
            { title: 'Select mobile channels', description: 'Choose marketing channels.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['strategy', 'channels'] },
          ],
        },
        {
          name: 'Content Creation',
          description: 'Create mobile content',
          tasks: [
            { title: 'Design mobile-first creatives', description: 'Create mobile assets.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['design', 'mobile'] },
            { title: 'Write mobile copy', description: 'Create short-form content.', assigneeRole: 'member', dueOffset: 12, priority: 'high', labels: ['content', 'copywriting'] },
            { title: 'Set up mobile campaigns', description: 'Configure channels.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['setup', 'technical'] },
          ],
        },
        {
          name: 'Execution',
          description: 'Launch and optimize',
          tasks: [
            { title: 'Launch mobile campaign', description: 'Activate campaigns.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['launch', 'execution'] },
            { title: 'Optimize mobile experience', description: 'Improve conversion.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['optimization', 'cro'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'creation', 'live', 'optimization'] },
    },
    settings: { mobileFirst: true },
  },

  // ==================== 47. APP STORE OPTIMIZATION ====================
  {
    name: 'App Store Optimization',
    slug: 'app-store-optimization',
    description: 'Improve app visibility and downloads through ASO best practices.',
    category: 'marketing',
    icon: 'Download',
    color: '#10B981',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'audit', name: 'Audit', order: 0, color: '#6B7280' },
      { id: 'optimization', name: 'Optimization', order: 1, color: '#3B82F6' },
      { id: 'testing', name: 'Testing', order: 2, color: '#F59E0B' },
      { id: 'monitoring', name: 'Monitoring', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'App Store', type: 'multiselect', description: 'Target stores', options: ['iOS App Store', 'Google Play', 'Amazon Appstore'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'ASO Audit',
          description: 'Audit current ASO',
          tasks: [
            { title: 'Audit app listing', description: 'Review current optimization.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['audit', 'analysis'] },
            { title: 'Research app keywords', description: 'Find target keywords.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['research', 'keywords'] },
            { title: 'Analyze competitors', description: 'Review competitor apps.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['research', 'competitive'] },
          ],
        },
        {
          name: 'Optimization',
          description: 'Optimize app listing',
          tasks: [
            { title: 'Optimize title and subtitle', description: 'Improve app name.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['optimization', 'title'] },
            { title: 'Write compelling description', description: 'Update app description.', assigneeRole: 'member', dueOffset: 12, priority: 'high', labels: ['content', 'description'] },
            { title: 'Optimize screenshots', description: 'Improve visual assets.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['design', 'screenshots'] },
            { title: 'Improve ratings and reviews', description: 'Implement review strategy.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['reviews', 'ratings'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['audit', 'optimization', 'testing', 'monitoring'] },
    },
    settings: { trackDownloads: true },
  },

  // ==================== 48. PUSH NOTIFICATION STRATEGY ====================
  {
    name: 'Push Notification Strategy',
    slug: 'push-notification-strategy',
    description: 'Develop effective push notification campaigns for mobile and web users.',
    category: 'marketing',
    icon: 'Bell',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'setup', name: 'Setup', order: 1, color: '#3B82F6' },
      { id: 'active', name: 'Active', order: 2, color: '#F59E0B' },
      { id: 'optimization', name: 'Optimization', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Platform', type: 'multiselect', description: 'Notification platforms', options: ['iOS', 'Android', 'Web'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy',
          description: 'Plan push strategy',
          tasks: [
            { title: 'Define notification goals', description: 'Set engagement objectives.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy', 'goals'] },
            { title: 'Map notification triggers', description: 'Identify send events.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['planning', 'triggers'] },
            { title: 'Plan content types', description: 'Define message categories.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['content', 'planning'] },
          ],
        },
        {
          name: 'Implementation',
          description: 'Set up notifications',
          tasks: [
            { title: 'Configure push platform', description: 'Set up technical infrastructure.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['technical', 'setup'] },
            { title: 'Write notification copy', description: 'Create message templates.', assigneeRole: 'member', dueOffset: 12, priority: 'high', labels: ['content', 'copywriting'] },
            { title: 'Set up automation', description: 'Configure triggered sends.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['automation', 'setup'] },
            { title: 'Test notifications', description: 'QA all notifications.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['testing', 'qa'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'setup', 'active', 'optimization'] },
    },
    settings: { trackEngagement: true },
  },

  // ==================== 49. SMS MARKETING CAMPAIGN ====================
  {
    name: 'SMS Marketing Campaign',
    slug: 'sms-marketing-campaign',
    description: 'Execute text message marketing campaigns for direct customer engagement.',
    category: 'marketing',
    icon: 'MessageCircle',
    color: '#22C55E',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'setup', name: 'Setup', order: 1, color: '#3B82F6' },
      { id: 'active', name: 'Active', order: 2, color: '#F59E0B' },
      { id: 'analysis', name: 'Analysis', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Campaign Type', type: 'select', description: 'SMS campaign type', options: ['Promotional', 'Transactional', 'Automated', 'Conversational'], isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan SMS campaign',
          tasks: [
            { title: 'Define SMS objectives', description: 'Set campaign goals.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy', 'goals'] },
            { title: 'Review compliance', description: 'Ensure TCPA compliance.', assigneeRole: 'lead', dueOffset: 2, priority: 'high', labels: ['compliance', 'legal'] },
            { title: 'Build subscriber list', description: 'Grow SMS opt-ins.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['list', 'growth'] },
          ],
        },
        {
          name: 'Execution',
          description: 'Launch SMS campaign',
          tasks: [
            { title: 'Write SMS copy', description: 'Create message content.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['content', 'copywriting'] },
            { title: 'Set up automation', description: 'Configure triggers.', assigneeRole: 'member', dueOffset: 12, priority: 'high', labels: ['automation', 'setup'] },
            { title: 'Launch campaign', description: 'Send SMS messages.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['launch', 'execution'] },
            { title: 'Analyze results', description: 'Review performance.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['analytics', 'reporting'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'setup', 'active', 'analysis'] },
    },
    settings: { complianceRequired: true },
  },

  // ==================== 50. CHATBOT MARKETING ====================
  {
    name: 'Chatbot Marketing',
    slug: 'chatbot-marketing',
    description: 'Implement conversational marketing through chatbots for lead generation and support.',
    category: 'marketing',
    icon: 'MessageSquare',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'building', name: 'Building', order: 1, color: '#3B82F6' },
      { id: 'testing', name: 'Testing', order: 2, color: '#F59E0B' },
      { id: 'live', name: 'Live', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Chatbot Platform', type: 'select', description: 'Bot platform', options: ['Intercom', 'Drift', 'HubSpot', 'Zendesk', 'Custom'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy',
          description: 'Plan chatbot strategy',
          tasks: [
            { title: 'Define chatbot goals', description: 'Set objectives.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy', 'goals'] },
            { title: 'Map conversation flows', description: 'Design user journeys.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['planning', 'flows'] },
            { title: 'Write bot scripts', description: 'Create conversation content.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['content', 'scripts'] },
          ],
        },
        {
          name: 'Implementation',
          description: 'Build and launch chatbot',
          tasks: [
            { title: 'Build chatbot flows', description: 'Configure bot logic.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['building', 'technical'] },
            { title: 'Test conversations', description: 'QA all flows.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['testing', 'qa'] },
            { title: 'Launch chatbot', description: 'Deploy to live.', assigneeRole: 'lead', dueOffset: 25, priority: 'high', labels: ['launch', 'deployment'] },
            { title: 'Monitor and optimize', description: 'Improve conversations.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['optimization', 'analytics'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'building', 'testing', 'live'] },
    },
    settings: { conversationalMarketing: true },
  },

  // ==================== 51. ACCOUNT-BASED MARKETING ====================
  {
    name: 'Account-Based Marketing',
    slug: 'account-based-marketing',
    description: 'Target high-value accounts with personalized multi-channel campaigns.',
    category: 'marketing',
    icon: 'Target',
    color: '#DC2626',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'identification', name: 'Identification', order: 0, color: '#6B7280' },
      { id: 'engagement', name: 'Engagement', order: 1, color: '#3B82F6' },
      { id: 'nurturing', name: 'Nurturing', order: 2, color: '#F59E0B' },
      { id: 'conversion', name: 'Conversion', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Account Tier', type: 'select', description: 'Account priority', options: ['Tier 1', 'Tier 2', 'Tier 3'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Account Selection',
          description: 'Identify target accounts',
          tasks: [
            { title: 'Define ICP', description: 'Create ideal customer profile.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy', 'icp'] },
            { title: 'Build target account list', description: 'Identify target accounts.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['research', 'accounts'] },
            { title: 'Research account insights', description: 'Gather account intelligence.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['research', 'insights'] },
          ],
        },
        {
          name: 'Campaign Development',
          description: 'Create ABM campaigns',
          tasks: [
            { title: 'Create personalized content', description: 'Develop account-specific content.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['content', 'personalization'] },
            { title: 'Launch multi-channel campaigns', description: 'Activate ABM campaigns.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['launch', 'campaigns'] },
            { title: 'Coordinate with sales', description: 'Align with sales team.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['sales', 'alignment'] },
            { title: 'Track account engagement', description: 'Monitor account activity.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['tracking', 'engagement'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['identification', 'engagement', 'nurturing', 'conversion'] },
    },
    settings: { salesAlignment: true },
  },

  // ==================== 52. PARTNER MARKETING CAMPAIGN ====================
  {
    name: 'Partner Marketing Campaign',
    slug: 'partner-marketing-campaign',
    description: 'Execute joint marketing campaigns with channel and technology partners.',
    category: 'marketing',
    icon: 'Handshake',
    color: '#0891B2',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'collaboration', name: 'Collaboration', order: 1, color: '#3B82F6' },
      { id: 'execution', name: 'Execution', order: 2, color: '#F59E0B' },
      { id: 'analysis', name: 'Analysis', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Partner Type', type: 'select', description: 'Type of partner', options: ['Channel', 'Technology', 'Strategic', 'Referral'], isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan partner campaign',
          tasks: [
            { title: 'Align on campaign goals', description: 'Set joint objectives.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy', 'alignment'] },
            { title: 'Define campaign scope', description: 'Agree on deliverables.', assigneeRole: 'lead', dueOffset: 3, priority: 'high', labels: ['planning', 'scope'] },
            { title: 'Create joint value proposition', description: 'Develop combined messaging.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['messaging', 'content'] },
          ],
        },
        {
          name: 'Execution',
          description: 'Execute partner campaign',
          tasks: [
            { title: 'Create co-branded content', description: 'Develop joint assets.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['content', 'co-branded'] },
            { title: 'Launch campaign', description: 'Activate joint campaign.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['launch', 'execution'] },
            { title: 'Track joint metrics', description: 'Monitor shared KPIs.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['analytics', 'tracking'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'collaboration', 'execution', 'analysis'] },
    },
    settings: { partnerCollaboration: true },
  },

  // ==================== 53. CO-MARKETING CAMPAIGN ====================
  {
    name: 'Co-Marketing Campaign',
    slug: 'co-marketing-campaign',
    description: 'Collaborate with complementary brands on joint marketing initiatives.',
    category: 'marketing',
    icon: 'Users',
    color: '#7C3AED',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'partnership', name: 'Partnership', order: 0, color: '#6B7280' },
      { id: 'planning', name: 'Planning', order: 1, color: '#3B82F6' },
      { id: 'execution', name: 'Execution', order: 2, color: '#F59E0B' },
      { id: 'results', name: 'Results', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Partner Brand', type: 'text', description: 'Co-marketing partner', isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Partnership',
          description: 'Establish co-marketing partnership',
          tasks: [
            { title: 'Identify co-marketing partners', description: 'Find complementary brands.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['research', 'partners'] },
            { title: 'Pitch partnership', description: 'Propose collaboration.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['outreach', 'proposal'] },
            { title: 'Agree on terms', description: 'Define partnership scope.', assigneeRole: 'lead', dueOffset: 10, priority: 'high', labels: ['negotiation', 'agreement'] },
          ],
        },
        {
          name: 'Campaign Execution',
          description: 'Execute co-marketing',
          tasks: [
            { title: 'Plan joint campaign', description: 'Design campaign together.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['planning', 'collaboration'] },
            { title: 'Create joint content', description: 'Produce co-branded assets.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['content', 'co-branded'] },
            { title: 'Launch campaign', description: 'Activate together.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['launch', 'execution'] },
            { title: 'Share results', description: 'Review joint performance.', assigneeRole: 'lead', dueOffset: 42, priority: 'high', labels: ['analytics', 'reporting'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['partnership', 'planning', 'execution', 'results'] },
    },
    settings: { jointCampaign: true },
  },

  // ==================== 54. AFFILIATE MARKETING PROGRAM ====================
  {
    name: 'Affiliate Marketing Program',
    slug: 'affiliate-marketing-program',
    description: 'Launch and manage affiliate marketing program for performance-based growth.',
    category: 'marketing',
    icon: 'Link',
    color: '#059669',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'setup', name: 'Setup', order: 0, color: '#6B7280' },
      { id: 'recruitment', name: 'Recruitment', order: 1, color: '#3B82F6' },
      { id: 'active', name: 'Active', order: 2, color: '#F59E0B' },
      { id: 'optimization', name: 'Optimization', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Commission Model', type: 'select', description: 'Payout structure', options: ['Percentage', 'Flat Rate', 'Tiered', 'Hybrid'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Program Setup',
          description: 'Set up affiliate program',
          tasks: [
            { title: 'Define program structure', description: 'Design commission model.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning', 'structure'] },
            { title: 'Select affiliate platform', description: 'Choose tracking software.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['platform', 'selection'] },
            { title: 'Create affiliate assets', description: 'Build promotional materials.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['content', 'assets'] },
          ],
        },
        {
          name: 'Recruitment',
          description: 'Recruit affiliates',
          tasks: [
            { title: 'Identify target affiliates', description: 'Research potential partners.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['research', 'affiliates'] },
            { title: 'Launch recruitment campaign', description: 'Promote program.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['recruitment', 'outreach'] },
            { title: 'Onboard affiliates', description: 'Set up new partners.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['onboarding', 'setup'] },
            { title: 'Monitor performance', description: 'Track affiliate results.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['tracking', 'analytics'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['setup', 'recruitment', 'active', 'optimization'] },
    },
    settings: { performanceBased: true },
  },

  // ==================== 55. SPONSORSHIP CAMPAIGN ====================
  {
    name: 'Sponsorship Campaign',
    slug: 'sponsorship-campaign',
    description: 'Plan and execute event or content sponsorships for brand exposure.',
    category: 'marketing',
    icon: 'Trophy',
    color: '#FBBF24',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'selection', name: 'Selection', order: 0, color: '#6B7280' },
      { id: 'negotiation', name: 'Negotiation', order: 1, color: '#3B82F6' },
      { id: 'activation', name: 'Activation', order: 2, color: '#F59E0B' },
      { id: 'evaluation', name: 'Evaluation', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Sponsorship Type', type: 'select', description: 'Type of sponsorship', options: ['Event', 'Content', 'Team', 'Cause', 'Media'], isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Selection',
          description: 'Select sponsorship opportunities',
          tasks: [
            { title: 'Define sponsorship criteria', description: 'Set selection parameters.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy', 'criteria'] },
            { title: 'Research opportunities', description: 'Find sponsorship options.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['research', 'opportunities'] },
            { title: 'Evaluate ROI potential', description: 'Assess expected return.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['analysis', 'roi'] },
          ],
        },
        {
          name: 'Activation',
          description: 'Activate sponsorship',
          tasks: [
            { title: 'Negotiate terms', description: 'Finalize agreement.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['negotiation', 'contract'] },
            { title: 'Plan activation', description: 'Design sponsorship activities.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['planning', 'activation'] },
            { title: 'Execute sponsorship', description: 'Deliver sponsorship elements.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['execution', 'delivery'] },
            { title: 'Measure impact', description: 'Evaluate results.', assigneeRole: 'member', dueOffset: 56, priority: 'high', labels: ['measurement', 'analytics'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['selection', 'negotiation', 'activation', 'evaluation'] },
    },
    settings: { trackROI: true },
  },

  // ==================== 56. EVENT MARKETING ====================
  {
    name: 'Event Marketing',
    slug: 'event-marketing',
    description: 'Plan and promote in-person or virtual events for brand engagement.',
    category: 'marketing',
    icon: 'Calendar',
    color: '#EC4899',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'promotion', name: 'Promotion', order: 1, color: '#3B82F6' },
      { id: 'event', name: 'Event', order: 2, color: '#F59E0B' },
      { id: 'follow-up', name: 'Follow-up', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Event Type', type: 'select', description: 'Type of event', options: ['Conference', 'Workshop', 'Meetup', 'Launch', 'Virtual'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan event marketing',
          tasks: [
            { title: 'Define event objectives', description: 'Set marketing goals.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy', 'goals'] },
            { title: 'Plan promotional strategy', description: 'Design promotion plan.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['planning', 'promotion'] },
            { title: 'Create event branding', description: 'Design event identity.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['design', 'branding'] },
          ],
        },
        {
          name: 'Execution',
          description: 'Execute event marketing',
          tasks: [
            { title: 'Launch registration', description: 'Open event registration.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['registration', 'launch'] },
            { title: 'Execute promotion campaign', description: 'Drive registrations.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['promotion', 'campaign'] },
            { title: 'Coordinate event day', description: 'Manage event execution.', assigneeRole: 'lead', dueOffset: 35, priority: 'urgent', labels: ['event', 'execution'] },
            { title: 'Post-event follow-up', description: 'Nurture attendees.', assigneeRole: 'member', dueOffset: 40, priority: 'high', labels: ['follow-up', 'nurturing'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'promotion', 'event', 'follow-up'] },
    },
    settings: { trackRegistrations: true },
  },

  // ==================== 57. VIRTUAL EVENT MARKETING ====================
  {
    name: 'Virtual Event Marketing',
    slug: 'virtual-event-marketing',
    description: 'Market and promote virtual events, conferences, and online experiences.',
    category: 'marketing',
    icon: 'Video',
    color: '#6366F1',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'promotion', name: 'Promotion', order: 1, color: '#3B82F6' },
      { id: 'live', name: 'Live', order: 2, color: '#F59E0B' },
      { id: 'post-event', name: 'Post-Event', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Platform', type: 'select', description: 'Virtual platform', options: ['Zoom', 'Hopin', 'Webex', 'Teams', 'Custom'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Planning',
          description: 'Plan virtual event',
          tasks: [
            { title: 'Set event goals', description: 'Define objectives.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy', 'goals'] },
            { title: 'Plan virtual experience', description: 'Design online experience.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['planning', 'experience'] },
            { title: 'Set up platform', description: 'Configure virtual venue.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['technical', 'setup'] },
          ],
        },
        {
          name: 'Promotion',
          description: 'Promote virtual event',
          tasks: [
            { title: 'Build landing page', description: 'Create registration page.', assigneeRole: 'member', dueOffset: 12, priority: 'high', labels: ['web', 'landing-page'] },
            { title: 'Launch email campaign', description: 'Drive registrations.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['email', 'promotion'] },
            { title: 'Run paid promotion', description: 'Advertise event.', assigneeRole: 'member', dueOffset: 14, priority: 'medium', labels: ['paid', 'advertising'] },
          ],
        },
        {
          name: 'Post-Event',
          description: 'Post-event activities',
          tasks: [
            { title: 'Share recording', description: 'Distribute event recording.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['content', 'distribution'] },
            { title: 'Analyze attendance', description: 'Review metrics.', assigneeRole: 'member', dueOffset: 30, priority: 'high', labels: ['analytics', 'reporting'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'promotion', 'live', 'post-event'] },
    },
    settings: { virtualEvent: true },
  },

  // ==================== 58. COMMUNITY BUILDING ====================
  {
    name: 'Community Building',
    slug: 'community-building',
    description: 'Build and nurture brand community across platforms for engagement and advocacy.',
    category: 'marketing',
    icon: 'Users',
    color: '#0EA5E9',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'foundation', name: 'Foundation', order: 0, color: '#6B7280' },
      { id: 'growth', name: 'Growth', order: 1, color: '#3B82F6' },
      { id: 'engagement', name: 'Engagement', order: 2, color: '#F59E0B' },
      { id: 'advocacy', name: 'Advocacy', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Community Platform', type: 'select', description: 'Main platform', options: ['Discord', 'Slack', 'Facebook Groups', 'Circle', 'Forum'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Foundation',
          description: 'Build community foundation',
          tasks: [
            { title: 'Define community purpose', description: 'Set community vision.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy', 'vision'] },
            { title: 'Choose platform', description: 'Select community home.', assigneeRole: 'lead', dueOffset: 3, priority: 'high', labels: ['platform', 'selection'] },
            { title: 'Set up community space', description: 'Configure platform.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['setup', 'configuration'] },
            { title: 'Create community guidelines', description: 'Establish rules.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['guidelines', 'moderation'] },
          ],
        },
        {
          name: 'Growth',
          description: 'Grow community',
          tasks: [
            { title: 'Launch community', description: 'Open to members.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['launch', 'opening'] },
            { title: 'Drive initial growth', description: 'Attract first members.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['growth', 'acquisition'] },
            { title: 'Implement engagement programs', description: 'Create activities.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['engagement', 'programs'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['foundation', 'growth', 'engagement', 'advocacy'] },
    },
    settings: { communityManagement: true },
  },

  // ==================== 59. LINKEDIN MARKETING ====================
  {
    name: 'LinkedIn Marketing',
    slug: 'linkedin-marketing',
    description: 'B2B-focused marketing strategy for LinkedIn including organic and paid.',
    category: 'marketing',
    icon: 'Linkedin',
    color: '#0077B5',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'strategy', name: 'Strategy', order: 0, color: '#6B7280' },
      { id: 'content', name: 'Content', order: 1, color: '#3B82F6' },
      { id: 'active', name: 'Active', order: 2, color: '#F59E0B' },
      { id: 'optimization', name: 'Optimization', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'LinkedIn Focus', type: 'multiselect', description: 'Campaign types', options: ['Organic', 'Sponsored Content', 'InMail', 'Text Ads', 'Thought Leadership'], isRequired: true },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy',
          description: 'Define LinkedIn strategy',
          tasks: [
            { title: 'Set LinkedIn objectives', description: 'Define B2B goals.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy', 'goals'] },
            { title: 'Optimize company page', description: 'Update page presence.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['optimization', 'page'] },
            { title: 'Plan content strategy', description: 'Design content mix.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['content', 'strategy'] },
          ],
        },
        {
          name: 'Execution',
          description: 'Execute LinkedIn marketing',
          tasks: [
            { title: 'Create LinkedIn content', description: 'Produce platform content.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['content', 'creation'] },
            { title: 'Launch thought leadership', description: 'Executive posting.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['thought-leadership', 'content'] },
            { title: 'Run LinkedIn ads', description: 'Activate paid campaigns.', assigneeRole: 'member', dueOffset: 21, priority: 'medium', labels: ['paid', 'advertising'] },
            { title: 'Engage with network', description: 'Build relationships.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['engagement', 'networking'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['strategy', 'content', 'active', 'optimization'] },
    },
    settings: { b2bFocused: true },
  },

  // ==================== 60. TIKTOK MARKETING ====================
  {
    name: 'TikTok Marketing',
    slug: 'tiktok-marketing',
    description: 'Create viral short-form video content and campaigns for TikTok.',
    category: 'marketing',
    icon: 'Music',
    color: '#000000',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'strategy', name: 'Strategy', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'active', name: 'Active', order: 2, color: '#F59E0B' },
      { id: 'viral', name: 'Viral', order: 3, color: '#10B981' },
    ],
    customFields: [
      { name: 'Content Style', type: 'select', description: 'TikTok approach', options: ['Educational', 'Entertainment', 'Behind-Scenes', 'Trends', 'UGC'], isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Strategy',
          description: 'Plan TikTok strategy',
          tasks: [
            { title: 'Define TikTok goals', description: 'Set platform objectives.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy', 'goals'] },
            { title: 'Research trends', description: 'Analyze trending content.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['research', 'trends'] },
            { title: 'Set up TikTok account', description: 'Optimize profile.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['setup', 'profile'] },
          ],
        },
        {
          name: 'Content Production',
          description: 'Create TikTok content',
          tasks: [
            { title: 'Plan content calendar', description: 'Schedule video ideas.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['planning', 'calendar'] },
            { title: 'Produce TikTok videos', description: 'Create short-form content.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['production', 'video'] },
            { title: 'Engage with community', description: 'Respond and duet.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['engagement', 'community'] },
            { title: 'Run TikTok ads', description: 'Activate paid promotion.', assigneeRole: 'member', dueOffset: 28, priority: 'medium', labels: ['paid', 'advertising'] },
          ],
        },
      ],
      settings: { defaultView: 'board', statuses: ['strategy', 'creation', 'active', 'viral'] },
    },
    settings: { shortFormVideo: true },
  },

  // ==================== 61-100: Additional Templates ====================
  // Adding remaining templates in compact format

  // 61. YouTube Marketing
  {
    name: 'YouTube Marketing',
    slug: 'youtube-marketing',
    description: 'Build YouTube presence with video content strategy and channel growth.',
    category: 'marketing',
    icon: 'Youtube',
    color: '#FF0000',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'production', name: 'Production', order: 1, color: '#3B82F6' },
      { id: 'published', name: 'Published', order: 2, color: '#10B981' },
    ],
    customFields: [{ name: 'Video Type', type: 'select', description: 'Content format', options: ['Tutorial', 'Vlog', 'Review', 'Shorts', 'Live'], isRequired: false }],
    structure: {
      sections: [
        { name: 'Strategy', description: 'Plan YouTube strategy', tasks: [
          { title: 'Define channel strategy', description: 'Set YouTube goals.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy'] },
          { title: 'Optimize channel', description: 'Update channel branding.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['optimization'] },
          { title: 'Plan content series', description: 'Create video series.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['planning'] },
        ]},
        { name: 'Production', description: 'Produce videos', tasks: [
          { title: 'Create video content', description: 'Film and edit videos.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['production'] },
          { title: 'Optimize for search', description: 'SEO for YouTube.', assigneeRole: 'member', dueOffset: 25, priority: 'high', labels: ['seo'] },
          { title: 'Promote videos', description: 'Cross-promote content.', assigneeRole: 'member', dueOffset: 28, priority: 'medium', labels: ['promotion'] },
        ]},
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'production', 'published'] },
    },
    settings: { videoMarketing: true },
  },

  // 62. Instagram Marketing
  {
    name: 'Instagram Marketing',
    slug: 'instagram-marketing',
    description: 'Visual-first Instagram marketing with Stories, Reels, and feed content.',
    category: 'marketing',
    icon: 'Instagram',
    color: '#E4405F',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'active', name: 'Active', order: 2, color: '#10B981' },
    ],
    customFields: [{ name: 'Content Type', type: 'multiselect', description: 'Format', options: ['Feed', 'Stories', 'Reels', 'IGTV', 'Live'], isRequired: false }],
    structure: {
      sections: [
        { name: 'Strategy', description: 'Plan Instagram strategy', tasks: [
          { title: 'Define Instagram goals', description: 'Set objectives.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy'] },
          { title: 'Plan content mix', description: 'Balance content types.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['content'] },
          { title: 'Create content calendar', description: 'Schedule posts.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['planning'] },
        ]},
        { name: 'Execution', description: 'Execute Instagram', tasks: [
          { title: 'Create visual content', description: 'Design and shoot.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['creation'] },
          { title: 'Engage community', description: 'Respond and interact.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['engagement'] },
          { title: 'Run Instagram ads', description: 'Paid promotion.', assigneeRole: 'member', dueOffset: 21, priority: 'medium', labels: ['paid'] },
        ]},
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'creation', 'active'] },
    },
    settings: { visualFirst: true },
  },

  // 63. Twitter/X Marketing
  {
    name: 'Twitter X Marketing',
    slug: 'twitter-x-marketing',
    description: 'Real-time engagement and thought leadership on Twitter/X.',
    category: 'marketing',
    icon: 'Twitter',
    color: '#1DA1F2',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'strategy', name: 'Strategy', order: 0, color: '#6B7280' },
      { id: 'content', name: 'Content', order: 1, color: '#3B82F6' },
      { id: 'active', name: 'Active', order: 2, color: '#10B981' },
    ],
    customFields: [{ name: 'Focus Area', type: 'select', description: 'Main focus', options: ['Thought Leadership', 'Customer Service', 'News', 'Community'], isRequired: false }],
    structure: {
      sections: [
        { name: 'Strategy', description: 'Plan Twitter strategy', tasks: [
          { title: 'Define Twitter voice', description: 'Establish brand voice.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy'] },
          { title: 'Plan content themes', description: 'Set posting themes.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['content'] },
        ]},
        { name: 'Execution', description: 'Execute Twitter strategy', tasks: [
          { title: 'Create tweet content', description: 'Write tweets.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['content'] },
          { title: 'Engage in conversations', description: 'Join discussions.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['engagement'] },
          { title: 'Monitor mentions', description: 'Track brand mentions.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['monitoring'] },
        ]},
      ],
      settings: { defaultView: 'board', statuses: ['strategy', 'content', 'active'] },
    },
    settings: { realTimeEngagement: true },
  },

  // 64. Pinterest Marketing
  {
    name: 'Pinterest Marketing',
    slug: 'pinterest-marketing',
    description: 'Drive traffic and sales through Pinterest visual discovery marketing.',
    category: 'marketing',
    icon: 'Image',
    color: '#E60023',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'pinning', name: 'Pinning', order: 2, color: '#10B981' },
    ],
    customFields: [{ name: 'Pin Type', type: 'multiselect', description: 'Content type', options: ['Standard', 'Video', 'Idea', 'Product', 'Rich'], isRequired: false }],
    structure: {
      sections: [
        { name: 'Strategy', description: 'Plan Pinterest strategy', tasks: [
          { title: 'Set up business account', description: 'Optimize profile.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['setup'] },
          { title: 'Research keywords', description: 'Find search terms.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['research'] },
          { title: 'Create board strategy', description: 'Plan board structure.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['planning'] },
        ]},
        { name: 'Content', description: 'Create Pinterest content', tasks: [
          { title: 'Design pin graphics', description: 'Create visual pins.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['design'] },
          { title: 'Schedule pins', description: 'Plan pin publishing.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['scheduling'] },
          { title: 'Track analytics', description: 'Monitor performance.', assigneeRole: 'member', dueOffset: 28, priority: 'medium', labels: ['analytics'] },
        ]},
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'creation', 'pinning'] },
    },
    settings: { visualDiscovery: true },
  },

  // 65. Facebook Marketing
  {
    name: 'Facebook Marketing',
    slug: 'facebook-marketing',
    description: 'Comprehensive Facebook marketing including organic, paid, and groups.',
    category: 'marketing',
    icon: 'Facebook',
    color: '#1877F2',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' },
      { id: 'active', name: 'Active', order: 2, color: '#10B981' },
    ],
    customFields: [{ name: 'Focus Area', type: 'multiselect', description: 'Marketing areas', options: ['Page', 'Groups', 'Ads', 'Messenger', 'Marketplace'], isRequired: false }],
    structure: {
      sections: [
        { name: 'Strategy', description: 'Plan Facebook strategy', tasks: [
          { title: 'Audit Facebook presence', description: 'Review current state.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['audit'] },
          { title: 'Set Facebook goals', description: 'Define objectives.', assigneeRole: 'lead', dueOffset: 3, priority: 'high', labels: ['strategy'] },
          { title: 'Plan content strategy', description: 'Design content mix.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['content'] },
        ]},
        { name: 'Execution', description: 'Execute Facebook marketing', tasks: [
          { title: 'Create Facebook content', description: 'Produce posts.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['content'] },
          { title: 'Launch Facebook ads', description: 'Activate paid.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['paid'] },
          { title: 'Engage community', description: 'Manage interactions.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['engagement'] },
        ]},
      ],
      settings: { defaultView: 'board', statuses: ['planning', 'creation', 'active'] },
    },
    settings: { multiFormat: true },
  },

  // 66-100: Remaining templates in even more compact format
  { name: 'Growth Hacking Sprint', slug: 'growth-hacking-sprint', description: 'Rapid experimentation for growth through creative tactics.', category: 'marketing', icon: 'Zap', color: '#8B5CF6', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'ideation', name: 'Ideation', order: 0, color: '#6B7280' }, { id: 'testing', name: 'Testing', order: 1, color: '#3B82F6' }, { id: 'scaling', name: 'Scaling', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Experiments', description: 'Run growth experiments', tasks: [{ title: 'Brainstorm growth ideas', description: 'Generate hypotheses.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['ideation'] }, { title: 'Prioritize experiments', description: 'Rank by impact.', assigneeRole: 'lead', dueOffset: 2, priority: 'high', labels: ['planning'] }, { title: 'Run experiments', description: 'Test hypotheses.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['testing'] }, { title: 'Analyze results', description: 'Review outcomes.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['analysis'] }] }], settings: { defaultView: 'board', statuses: ['ideation', 'testing', 'scaling'] } }, settings: { rapidExperimentation: true } },

  { name: 'Viral Marketing Campaign', slug: 'viral-marketing-campaign', description: 'Create shareable content designed for viral spread.', category: 'marketing', icon: 'Share', color: '#EC4899', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'concept', name: 'Concept', order: 0, color: '#6B7280' }, { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' }, { id: 'launch', name: 'Launch', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Campaign', description: 'Create viral campaign', tasks: [{ title: 'Research viral triggers', description: 'Study what works.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['research'] }, { title: 'Develop viral concept', description: 'Create shareable idea.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['concept'] }, { title: 'Produce viral content', description: 'Create content.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['production'] }, { title: 'Seed content', description: 'Initial distribution.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['launch'] }] }], settings: { defaultView: 'board', statuses: ['concept', 'creation', 'launch'] } }, settings: { shareability: true } },

  { name: 'Guerrilla Marketing', slug: 'guerrilla-marketing', description: 'Unconventional, low-cost marketing tactics for maximum impact.', category: 'marketing', icon: 'Target', color: '#F97316', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'planning', name: 'Planning', order: 0, color: '#6B7280' }, { id: 'execution', name: 'Execution', order: 1, color: '#3B82F6' }, { id: 'impact', name: 'Impact', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Campaign', description: 'Plan guerrilla tactics', tasks: [{ title: 'Brainstorm unconventional ideas', description: 'Creative tactics.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['ideation'] }, { title: 'Plan execution logistics', description: 'Coordinate details.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['planning'] }, { title: 'Execute campaign', description: 'Launch tactics.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['execution'] }, { title: 'Amplify results', description: 'Share outcomes.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['amplification'] }] }], settings: { defaultView: 'board', statuses: ['planning', 'execution', 'impact'] } }, settings: { unconventional: true } },

  { name: 'Experiential Marketing', slug: 'experiential-marketing', description: 'Create immersive brand experiences for lasting impressions.', category: 'marketing', icon: 'Star', color: '#D946EF', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'concept', name: 'Concept', order: 0, color: '#6B7280' }, { id: 'production', name: 'Production', order: 1, color: '#3B82F6' }, { id: 'activation', name: 'Activation', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Experience', description: 'Create brand experience', tasks: [{ title: 'Define experience concept', description: 'Design experience.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['concept'] }, { title: 'Plan logistics', description: 'Coordinate details.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['planning'] }, { title: 'Execute activation', description: 'Run experience.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['execution'] }, { title: 'Capture content', description: 'Document experience.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['content'] }] }], settings: { defaultView: 'board', statuses: ['concept', 'production', 'activation'] } }, settings: { immersive: true } },

  { name: 'Cause Marketing', slug: 'cause-marketing', description: 'Align brand with social causes for purpose-driven marketing.', category: 'marketing', icon: 'Heart', color: '#059669', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'planning', name: 'Planning', order: 0, color: '#6B7280' }, { id: 'partnership', name: 'Partnership', order: 1, color: '#3B82F6' }, { id: 'campaign', name: 'Campaign', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Initiative', description: 'Plan cause marketing', tasks: [{ title: 'Identify relevant causes', description: 'Find aligned causes.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['research'] }, { title: 'Partner with organizations', description: 'Establish partnerships.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['partnership'] }, { title: 'Launch campaign', description: 'Activate initiative.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['launch'] }, { title: 'Measure impact', description: 'Track results.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['measurement'] }] }], settings: { defaultView: 'board', statuses: ['planning', 'partnership', 'campaign'] } }, settings: { purposeDriven: true } },

  { name: 'Sustainability Marketing', slug: 'sustainability-marketing', description: 'Communicate sustainability initiatives and eco-friendly practices.', category: 'marketing', icon: 'Leaf', color: '#22C55E', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'audit', name: 'Audit', order: 0, color: '#6B7280' }, { id: 'messaging', name: 'Messaging', order: 1, color: '#3B82F6' }, { id: 'communication', name: 'Communication', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Initiative', description: 'Plan sustainability marketing', tasks: [{ title: 'Audit sustainability efforts', description: 'Document initiatives.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['audit'] }, { title: 'Develop messaging', description: 'Create narratives.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['messaging'] }, { title: 'Launch communications', description: 'Share story.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['launch'] }] }], settings: { defaultView: 'board', statuses: ['audit', 'messaging', 'communication'] } }, settings: { ecoFriendly: true } },

  { name: 'Diversity Marketing', slug: 'diversity-marketing', description: 'Create inclusive marketing that represents diverse audiences.', category: 'marketing', icon: 'Users', color: '#7C3AED', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'research', name: 'Research', order: 0, color: '#6B7280' }, { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' }, { id: 'review', name: 'Review', order: 2, color: '#F59E0B' }, { id: 'launch', name: 'Launch', order: 3, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Initiative', description: 'Plan inclusive marketing', tasks: [{ title: 'Research diverse audiences', description: 'Understand communities.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['research'] }, { title: 'Create inclusive content', description: 'Develop representative content.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['content'] }, { title: 'Review for authenticity', description: 'Ensure genuine representation.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['review'] }, { title: 'Launch campaign', description: 'Activate messaging.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['launch'] }] }], settings: { defaultView: 'board', statuses: ['research', 'creation', 'review', 'launch'] } }, settings: { inclusive: true } },

  { name: 'Employer Branding', slug: 'employer-branding', description: 'Build employer brand to attract and retain talent.', category: 'marketing', icon: 'Briefcase', color: '#0891B2', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'audit', name: 'Audit', order: 0, color: '#6B7280' }, { id: 'development', name: 'Development', order: 1, color: '#3B82F6' }, { id: 'activation', name: 'Activation', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Branding', description: 'Build employer brand', tasks: [{ title: 'Audit employer brand', description: 'Assess current perception.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['audit'] }, { title: 'Define EVP', description: 'Create value proposition.', assigneeRole: 'lead', dueOffset: 10, priority: 'high', labels: ['strategy'] }, { title: 'Create employer content', description: 'Develop assets.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['content'] }, { title: 'Launch employer brand', description: 'Activate messaging.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['launch'] }] }], settings: { defaultView: 'board', statuses: ['audit', 'development', 'activation'] } }, settings: { talentAttraction: true } },

  { name: 'Personal Branding', slug: 'personal-branding', description: 'Build personal brand for executives and thought leaders.', category: 'marketing', icon: 'User', color: '#F59E0B', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'audit', name: 'Audit', order: 0, color: '#6B7280' }, { id: 'development', name: 'Development', order: 1, color: '#3B82F6' }, { id: 'execution', name: 'Execution', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Brand Building', description: 'Build personal brand', tasks: [{ title: 'Define personal brand', description: 'Clarify positioning.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy'] }, { title: 'Optimize online presence', description: 'Update profiles.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['optimization'] }, { title: 'Create thought leadership content', description: 'Develop content.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['content'] }, { title: 'Engage in industry', description: 'Build visibility.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['engagement'] }] }], settings: { defaultView: 'board', statuses: ['audit', 'development', 'execution'] } }, settings: { thoughtLeadership: true } },

  { name: 'Executive Thought Leadership', slug: 'executive-thought-leadership', description: 'Position executives as industry thought leaders.', category: 'marketing', icon: 'Award', color: '#6366F1', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'strategy', name: 'Strategy', order: 0, color: '#6B7280' }, { id: 'content', name: 'Content', order: 1, color: '#3B82F6' }, { id: 'amplification', name: 'Amplification', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Program', description: 'Build thought leadership', tasks: [{ title: 'Define expertise areas', description: 'Identify topics.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy'] }, { title: 'Create content calendar', description: 'Plan publishing.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['planning'] }, { title: 'Produce thought leadership content', description: 'Create articles and talks.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['content'] }, { title: 'Amplify reach', description: 'Promote content.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['amplification'] }] }], settings: { defaultView: 'board', statuses: ['strategy', 'content', 'amplification'] } }, settings: { executiveVisibility: true } },

  { name: 'Brand Refresh', slug: 'brand-refresh', description: 'Update and modernize brand identity while maintaining recognition.', category: 'marketing', icon: 'RefreshCw', color: '#EC4899', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'audit', name: 'Audit', order: 0, color: '#6B7280' }, { id: 'development', name: 'Development', order: 1, color: '#3B82F6' }, { id: 'rollout', name: 'Rollout', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Refresh', description: 'Refresh brand identity', tasks: [{ title: 'Audit current brand', description: 'Assess brand elements.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['audit'] }, { title: 'Define refresh scope', description: 'Determine changes.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['strategy'] }, { title: 'Develop updated identity', description: 'Create new elements.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['design'] }, { title: 'Roll out refresh', description: 'Implement changes.', assigneeRole: 'lead', dueOffset: 42, priority: 'high', labels: ['rollout'] }] }], settings: { defaultView: 'board', statuses: ['audit', 'development', 'rollout'] } }, settings: { brandEvolution: true } },

  { name: 'Rebranding Campaign', slug: 'rebranding-campaign', description: 'Complete brand overhaul with new identity and positioning.', category: 'marketing', icon: 'Repeat', color: '#DC2626', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'strategy', name: 'Strategy', order: 0, color: '#6B7280' }, { id: 'development', name: 'Development', order: 1, color: '#3B82F6' }, { id: 'launch', name: 'Launch', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Rebrand', description: 'Execute rebrand', tasks: [{ title: 'Define rebrand strategy', description: 'Set new direction.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy'] }, { title: 'Develop new brand identity', description: 'Create new brand.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['design'] }, { title: 'Plan launch campaign', description: 'Design announcement.', assigneeRole: 'lead', dueOffset: 49, priority: 'high', labels: ['planning'] }, { title: 'Launch rebrand', description: 'Announce new brand.', assigneeRole: 'lead', dueOffset: 63, priority: 'high', labels: ['launch'] }] }], settings: { defaultView: 'board', statuses: ['strategy', 'development', 'launch'] } }, settings: { majorChange: true } },

  { name: 'Brand Guidelines Development', slug: 'brand-guidelines-development', description: 'Create comprehensive brand guidelines for consistent usage.', category: 'marketing', icon: 'Book', color: '#0EA5E9', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'audit', name: 'Audit', order: 0, color: '#6B7280' }, { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' }, { id: 'distribution', name: 'Distribution', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Guidelines', description: 'Create brand guidelines', tasks: [{ title: 'Audit brand assets', description: 'Inventory existing elements.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['audit'] }, { title: 'Define brand standards', description: 'Document rules.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['documentation'] }, { title: 'Create guidelines document', description: 'Compile guide.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['creation'] }, { title: 'Distribute to stakeholders', description: 'Share and train.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['distribution'] }] }], settings: { defaultView: 'board', statuses: ['audit', 'creation', 'distribution'] } }, settings: { documentation: true } },

  { name: 'Marketing Analytics Setup', slug: 'marketing-analytics-setup', description: 'Implement marketing analytics and reporting infrastructure.', category: 'marketing', icon: 'BarChart2', color: '#10B981', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'planning', name: 'Planning', order: 0, color: '#6B7280' }, { id: 'implementation', name: 'Implementation', order: 1, color: '#3B82F6' }, { id: 'live', name: 'Live', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Analytics', description: 'Set up analytics', tasks: [{ title: 'Define KPIs', description: 'Identify metrics.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['strategy'] }, { title: 'Configure tracking', description: 'Set up tools.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['technical'] }, { title: 'Build dashboards', description: 'Create reports.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['reporting'] }, { title: 'Train team', description: 'Enable adoption.', assigneeRole: 'member', dueOffset: 28, priority: 'medium', labels: ['training'] }] }], settings: { defaultView: 'board', statuses: ['planning', 'implementation', 'live'] } }, settings: { datadriven: true } },

  { name: 'Attribution Modeling', slug: 'attribution-modeling', description: 'Implement marketing attribution to understand channel impact.', category: 'marketing', icon: 'GitBranch', color: '#8B5CF6', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'research', name: 'Research', order: 0, color: '#6B7280' }, { id: 'implementation', name: 'Implementation', order: 1, color: '#3B82F6' }, { id: 'optimization', name: 'Optimization', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Attribution', description: 'Set up attribution', tasks: [{ title: 'Research attribution models', description: 'Evaluate options.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['research'] }, { title: 'Select attribution model', description: 'Choose approach.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['strategy'] }, { title: 'Implement tracking', description: 'Configure tools.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['technical'] }, { title: 'Analyze attribution data', description: 'Review insights.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['analysis'] }] }], settings: { defaultView: 'board', statuses: ['research', 'implementation', 'optimization'] } }, settings: { measurementFocus: true } },

  { name: 'Customer Journey Mapping', slug: 'customer-journey-mapping', description: 'Map customer touchpoints to optimize marketing interactions.', category: 'marketing', icon: 'Map', color: '#F97316', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'research', name: 'Research', order: 0, color: '#6B7280' }, { id: 'mapping', name: 'Mapping', order: 1, color: '#3B82F6' }, { id: 'optimization', name: 'Optimization', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Journey Mapping', description: 'Map customer journey', tasks: [{ title: 'Research customer behaviors', description: 'Gather insights.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['research'] }, { title: 'Identify touchpoints', description: 'Map interactions.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['mapping'] }, { title: 'Create journey maps', description: 'Visualize journeys.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['creation'] }, { title: 'Identify optimization opportunities', description: 'Find improvements.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['optimization'] }] }], settings: { defaultView: 'board', statuses: ['research', 'mapping', 'optimization'] } }, settings: { customerCentric: true } },

  { name: 'Persona Development', slug: 'persona-development', description: 'Create detailed buyer personas to guide marketing strategy.', category: 'marketing', icon: 'Users', color: '#0891B2', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'research', name: 'Research', order: 0, color: '#6B7280' }, { id: 'creation', name: 'Creation', order: 1, color: '#3B82F6' }, { id: 'validation', name: 'Validation', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Personas', description: 'Develop buyer personas', tasks: [{ title: 'Gather customer data', description: 'Collect insights.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['research'] }, { title: 'Conduct interviews', description: 'Talk to customers.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['interviews'] }, { title: 'Create persona documents', description: 'Build profiles.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['creation'] }, { title: 'Validate with sales', description: 'Confirm accuracy.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['validation'] }] }], settings: { defaultView: 'board', statuses: ['research', 'creation', 'validation'] } }, settings: { audienceFocus: true } },

  { name: 'Market Research Project', slug: 'market-research-project', description: 'Conduct comprehensive market research for strategic decisions.', category: 'marketing', icon: 'Search', color: '#7C3AED', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'planning', name: 'Planning', order: 0, color: '#6B7280' }, { id: 'research', name: 'Research', order: 1, color: '#3B82F6' }, { id: 'analysis', name: 'Analysis', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Research', description: 'Conduct market research', tasks: [{ title: 'Define research objectives', description: 'Set goals.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'] }, { title: 'Design research methodology', description: 'Plan approach.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['methodology'] }, { title: 'Collect data', description: 'Gather information.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['collection'] }, { title: 'Analyze and report', description: 'Present findings.', assigneeRole: 'lead', dueOffset: 42, priority: 'high', labels: ['analysis'] }] }], settings: { defaultView: 'board', statuses: ['planning', 'research', 'analysis'] } }, settings: { strategic: true } },

  { name: 'Competitive Analysis', slug: 'competitive-analysis', description: 'Analyze competitors to inform marketing strategy.', category: 'marketing', icon: 'Eye', color: '#DC2626', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'identification', name: 'Identification', order: 0, color: '#6B7280' }, { id: 'analysis', name: 'Analysis', order: 1, color: '#3B82F6' }, { id: 'strategy', name: 'Strategy', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Analysis', description: 'Analyze competitors', tasks: [{ title: 'Identify competitors', description: 'List competitors.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['identification'] }, { title: 'Analyze competitor marketing', description: 'Review strategies.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['analysis'] }, { title: 'Identify opportunities', description: 'Find gaps.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['opportunities'] }, { title: 'Develop competitive strategy', description: 'Create response.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['strategy'] }] }], settings: { defaultView: 'board', statuses: ['identification', 'analysis', 'strategy'] } }, settings: { competitiveIntelligence: true } },

  { name: 'SWOT Analysis Project', slug: 'swot-analysis-project', description: 'Conduct SWOT analysis for strategic marketing planning.', category: 'marketing', icon: 'Grid', color: '#FBBF24', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'research', name: 'Research', order: 0, color: '#6B7280' }, { id: 'analysis', name: 'Analysis', order: 1, color: '#3B82F6' }, { id: 'strategy', name: 'Strategy', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'SWOT', description: 'Conduct SWOT analysis', tasks: [{ title: 'Gather internal data', description: 'Assess strengths/weaknesses.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['research'] }, { title: 'Analyze external factors', description: 'Identify opportunities/threats.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['analysis'] }, { title: 'Create SWOT matrix', description: 'Document findings.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['documentation'] }, { title: 'Develop strategic recommendations', description: 'Create action plan.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['strategy'] }] }], settings: { defaultView: 'board', statuses: ['research', 'analysis', 'strategy'] } }, settings: { strategicPlanning: true } },

  { name: 'Marketing Budget Planning', slug: 'marketing-budget-planning', description: 'Plan and allocate annual marketing budget across channels.', category: 'marketing', icon: 'DollarSign', color: '#059669', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'analysis', name: 'Analysis', order: 0, color: '#6B7280' }, { id: 'planning', name: 'Planning', order: 1, color: '#3B82F6' }, { id: 'approval', name: 'Approval', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Budget', description: 'Plan marketing budget', tasks: [{ title: 'Analyze historical spend', description: 'Review past budgets.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['analysis'] }, { title: 'Forecast marketing needs', description: 'Project requirements.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['forecasting'] }, { title: 'Allocate budget by channel', description: 'Distribute funds.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['allocation'] }, { title: 'Present for approval', description: 'Get sign-off.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['approval'] }] }], settings: { defaultView: 'board', statuses: ['analysis', 'planning', 'approval'] } }, settings: { financialPlanning: true } },

  { name: 'Marketing Team Onboarding', slug: 'marketing-team-onboarding', description: 'Onboard new marketing team members effectively.', category: 'marketing', icon: 'UserPlus', color: '#6366F1', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'preparation', name: 'Preparation', order: 0, color: '#6B7280' }, { id: 'week1', name: 'Week 1', order: 1, color: '#3B82F6' }, { id: 'month1', name: 'Month 1', order: 2, color: '#F59E0B' }, { id: 'complete', name: 'Complete', order: 3, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Onboarding', description: 'Onboard new hire', tasks: [{ title: 'Prepare onboarding materials', description: 'Ready documentation.', assigneeRole: 'lead', dueOffset: -7, priority: 'high', labels: ['preparation'] }, { title: 'Set up tools access', description: 'Configure accounts.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['setup'] }, { title: 'Conduct marketing orientation', description: 'Team introductions.', assigneeRole: 'lead', dueOffset: 3, priority: 'high', labels: ['orientation'] }, { title: 'Complete onboarding', description: 'Verify readiness.', assigneeRole: 'lead', dueOffset: 30, priority: 'high', labels: ['completion'] }] }], settings: { defaultView: 'board', statuses: ['preparation', 'week1', 'month1', 'complete'] } }, settings: { peopleManagement: true } },

  { name: 'Agency Selection Process', slug: 'agency-selection-process', description: 'Evaluate and select marketing agencies for partnerships.', category: 'marketing', icon: 'Building', color: '#F97316', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'rfp', name: 'RFP', order: 0, color: '#6B7280' }, { id: 'evaluation', name: 'Evaluation', order: 1, color: '#3B82F6' }, { id: 'selection', name: 'Selection', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Selection', description: 'Select agency', tasks: [{ title: 'Define agency requirements', description: 'Document needs.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['requirements'] }, { title: 'Create and distribute RFP', description: 'Send RFP.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['rfp'] }, { title: 'Evaluate proposals', description: 'Review submissions.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['evaluation'] }, { title: 'Select and onboard agency', description: 'Make selection.', assigneeRole: 'lead', dueOffset: 42, priority: 'high', labels: ['selection'] }] }], settings: { defaultView: 'board', statuses: ['rfp', 'evaluation', 'selection'] } }, settings: { procurement: true } },

  { name: 'Vendor Management', slug: 'vendor-management', description: 'Manage relationships with marketing vendors and suppliers.', category: 'marketing', icon: 'Users', color: '#EC4899', projectType: 'kanban', isFeatured: false, kanbanStages: [{ id: 'evaluation', name: 'Evaluation', order: 0, color: '#6B7280' }, { id: 'active', name: 'Active', order: 1, color: '#3B82F6' }, { id: 'review', name: 'Review', order: 2, color: '#10B981' }], customFields: [], structure: { sections: [{ name: 'Management', description: 'Manage vendors', tasks: [{ title: 'Inventory current vendors', description: 'List all vendors.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['inventory'] }, { title: 'Evaluate vendor performance', description: 'Review performance.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['evaluation'] }, { title: 'Negotiate contracts', description: 'Manage agreements.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['contracts'] }, { title: 'Conduct quarterly reviews', description: 'Ongoing assessment.', assigneeRole: 'lead', dueOffset: 90, priority: 'medium', labels: ['review'] }] }], settings: { defaultView: 'board', statuses: ['evaluation', 'active', 'review'] } }, settings: { vendorRelations: true } },
];
