/**
 * Operations Project Templates
 * Pre-built templates for business operations, inventory, logistics, and process management
 */

export const OPERATIONS_TEMPLATES = [
  // ==================== 1. INVENTORY MANAGEMENT ====================
  {
    name: 'Inventory Management',
    slug: 'inventory-management',
    description:
      'Track inventory levels, manage stock, and coordinate reordering. Perfect for businesses managing physical products.',
    category: 'operations',
    icon: 'Package',
    color: '#10B981',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'in_stock', name: 'In Stock', order: 0, color: '#10B981' },
      { id: 'low_stock', name: 'Low Stock', order: 1, color: '#F59E0B' },
      { id: 'out_of_stock', name: 'Out of Stock', order: 2, color: '#EF4444' },
      { id: 'on_order', name: 'On Order', order: 3, color: '#3B82F6' },
      { id: 'discontinued', name: 'Discontinued', order: 4, color: '#6B7280' },
    ],
    customFields: [
      {
        name: 'SKU',
        type: 'text',
        description: 'Product SKU',
        isRequired: true,
      },
      {
        name: 'Quantity',
        type: 'number',
        description: 'Current quantity in stock',
        isRequired: true,
      },
      {
        name: 'Reorder Level',
        type: 'number',
        description: 'Quantity to trigger reorder',
        isRequired: false,
      },
      {
        name: 'Supplier',
        type: 'text',
        description: 'Primary supplier',
        isRequired: false,
      },
      {
        name: 'Unit Cost',
        type: 'number',
        description: 'Cost per unit',
        isRequired: false,
      },
      {
        name: 'Location',
        type: 'text',
        description: 'Warehouse/storage location',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Inventory Setup',
          description: 'Set up inventory tracking',
          tasks: [
            {
              title: 'Define product categories',
              description: 'Organize inventory into categories.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['setup'],
            },
            {
              title: 'Set up location codes',
              description: 'Define warehouse locations and zones.',
              assigneeRole: 'member',
              dueOffset: 2,
              priority: 'medium',
              labels: ['setup'],
            },
            {
              title: 'Configure reorder points',
              description: 'Set automatic reorder triggers.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['setup'],
            },
            {
              title: 'Import existing inventory',
              description: 'Add all current stock to system.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['data'],
            },
          ],
        },
        {
          name: 'Regular Tasks',
          description: 'Ongoing inventory management',
          tasks: [
            {
              title: 'Weekly inventory audit',
              description: 'Verify stock counts against system.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'medium',
              labels: ['audit', 'recurring'],
            },
            {
              title: 'Review low stock items',
              description: 'Check items below reorder point.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['reorder', 'recurring'],
            },
            {
              title: 'Process supplier orders',
              description: 'Place orders with suppliers.',
              assigneeRole: 'member',
              dueOffset: 7,
              priority: 'high',
              labels: ['ordering'],
            },
            {
              title: 'Monthly inventory report',
              description: 'Generate monthly stock report.',
              assigneeRole: 'lead',
              dueOffset: 30,
              priority: 'medium',
              labels: ['reporting', 'monthly'],
            },
          ],
        },
      ],
    },
    settings: {
      defaultView: 'table',
      enableTimeTracking: false,
      enableStoryPoints: false,
    },
  },

  // ==================== 2. ORDER FULFILLMENT ====================
  {
    name: 'Order Fulfillment',
    slug: 'order-fulfillment',
    description:
      'Track orders from receipt to delivery. Manage picking, packing, and shipping processes.',
    category: 'operations',
    icon: 'Truck',
    color: '#3B82F6',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'received', name: 'Received', order: 0, color: '#6B7280' },
      { id: 'processing', name: 'Processing', order: 1, color: '#3B82F6' },
      { id: 'picking', name: 'Picking', order: 2, color: '#F59E0B' },
      { id: 'packing', name: 'Packing', order: 3, color: '#8B5CF6' },
      { id: 'shipped', name: 'Shipped', order: 4, color: '#06B6D4' },
      { id: 'delivered', name: 'Delivered', order: 5, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Order Number',
        type: 'text',
        description: 'Unique order identifier',
        isRequired: true,
      },
      {
        name: 'Customer',
        type: 'text',
        description: 'Customer name',
        isRequired: true,
      },
      {
        name: 'Order Value',
        type: 'number',
        description: 'Total order value',
        isRequired: false,
      },
      {
        name: 'Shipping Method',
        type: 'select',
        description: 'Shipping service',
        options: ['Standard', 'Express', 'Overnight', 'Pickup', 'Freight'],
        isRequired: false,
      },
      {
        name: 'Tracking Number',
        type: 'text',
        description: 'Shipping tracking number',
        isRequired: false,
      },
      {
        name: 'Ship By',
        type: 'date',
        description: 'Required ship date',
        isRequired: true,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Fulfillment Process Setup',
          description: 'Configure fulfillment workflows',
          tasks: [
            {
              title: 'Define fulfillment workflow',
              description: 'Document order fulfillment process.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['setup'],
              subtasks: [
                { title: 'Map order receipt process' },
                { title: 'Define picking procedures' },
                { title: 'Document packing standards' },
                { title: 'Set up shipping integration' },
              ],
            },
            {
              title: 'Set up shipping carriers',
              description: 'Configure shipping carrier accounts.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['setup'],
            },
            {
              title: 'Create packing slip template',
              description: 'Design packing slip and labels.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'medium',
              labels: ['templates'],
            },
          ],
        },
        {
          name: 'Sample Orders',
          description: 'Example orders to track',
          tasks: [
            {
              title: '[Sample] Standard Order #1001',
              description: 'Standard shipping order example.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'medium',
              labels: ['order', 'sample'],
              subtasks: [
                { title: 'Verify inventory available' },
                { title: 'Pick items from warehouse' },
                { title: 'Pack order' },
                { title: 'Print shipping label' },
                { title: 'Ship order' },
              ],
            },
            {
              title: '[Sample] Express Order #1002',
              description: 'Express shipping priority order.',
              assigneeRole: 'member',
              dueOffset: 1,
              priority: 'high',
              labels: ['order', 'express', 'sample'],
            },
          ],
        },
      ],
    },
    settings: {
      defaultView: 'kanban',
      enableTimeTracking: true,
      enableStoryPoints: false,
    },
  },

  // ==================== 3. VENDOR MANAGEMENT ====================
  {
    name: 'Vendor Management',
    slug: 'vendor-management',
    description:
      'Manage supplier relationships, track performance, and coordinate procurement activities.',
    category: 'operations',
    icon: 'Users',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'prospective', name: 'Prospective', order: 0, color: '#6B7280' },
      { id: 'evaluation', name: 'Evaluation', order: 1, color: '#3B82F6' },
      { id: 'active', name: 'Active', order: 2, color: '#10B981' },
      { id: 'preferred', name: 'Preferred', order: 3, color: '#F59E0B' },
      { id: 'inactive', name: 'Inactive', order: 4, color: '#EF4444' },
    ],
    customFields: [
      {
        name: 'Vendor Name',
        type: 'text',
        description: 'Supplier/vendor name',
        isRequired: true,
      },
      {
        name: 'Contact',
        type: 'text',
        description: 'Primary contact name',
        isRequired: false,
      },
      {
        name: 'Category',
        type: 'select',
        description: 'Vendor category',
        options: ['Raw Materials', 'Components', 'Services', 'Equipment', 'Software', 'Logistics'],
        isRequired: false,
      },
      {
        name: 'Payment Terms',
        type: 'select',
        description: 'Payment terms',
        options: ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'COD'],
        isRequired: false,
      },
      {
        name: 'Contract End',
        type: 'date',
        description: 'Contract end date',
        isRequired: false,
      },
      {
        name: 'Rating',
        type: 'select',
        description: 'Vendor performance rating',
        options: ['Excellent', 'Good', 'Average', 'Poor'],
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Vendor Setup',
          description: 'Set up vendor management',
          tasks: [
            {
              title: 'Define vendor categories',
              description: 'Categorize vendors by type.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['setup'],
            },
            {
              title: 'Create vendor scorecard',
              description: 'Define performance evaluation criteria.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['evaluation'],
              subtasks: [
                { title: 'Quality metrics' },
                { title: 'Delivery metrics' },
                { title: 'Price competitiveness' },
                { title: 'Communication rating' },
              ],
            },
            {
              title: 'Import existing vendors',
              description: 'Add current vendors to system.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['data'],
            },
          ],
        },
        {
          name: 'Ongoing Management',
          description: 'Regular vendor activities',
          tasks: [
            {
              title: 'Quarterly vendor review',
              description: 'Evaluate vendor performance quarterly.',
              assigneeRole: 'lead',
              dueOffset: 90,
              priority: 'high',
              labels: ['review', 'quarterly'],
            },
            {
              title: 'Contract renewal tracking',
              description: 'Monitor upcoming contract renewals.',
              assigneeRole: 'member',
              dueOffset: 30,
              priority: 'high',
              labels: ['contracts'],
            },
            {
              title: 'New vendor sourcing',
              description: 'Identify and evaluate new vendors.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'medium',
              labels: ['sourcing'],
            },
          ],
        },
      ],
    },
    settings: {
      defaultView: 'table',
      enableTimeTracking: false,
      enableStoryPoints: false,
    },
  },

  // ==================== 4. QUALITY CONTROL ====================
  {
    name: 'Quality Control',
    slug: 'quality-control',
    description:
      'Manage quality control processes, track inspections, and handle non-conformance issues.',
    category: 'operations',
    icon: 'CheckSquare',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'pending', name: 'Pending Inspection', order: 0, color: '#6B7280' },
      { id: 'in_progress', name: 'In Progress', order: 1, color: '#3B82F6' },
      { id: 'passed', name: 'Passed', order: 2, color: '#10B981' },
      { id: 'failed', name: 'Failed', order: 3, color: '#EF4444' },
      { id: 'rework', name: 'Rework', order: 4, color: '#F59E0B' },
    ],
    customFields: [
      {
        name: 'Inspection ID',
        type: 'text',
        description: 'Unique inspection identifier',
        isRequired: true,
      },
      {
        name: 'Product/Batch',
        type: 'text',
        description: 'Product or batch being inspected',
        isRequired: true,
      },
      {
        name: 'Inspection Type',
        type: 'select',
        description: 'Type of QC inspection',
        options: ['Incoming', 'In-Process', 'Final', 'Audit', 'Customer Return'],
        isRequired: true,
      },
      {
        name: 'Inspector',
        type: 'text',
        description: 'QC inspector name',
        isRequired: false,
      },
      {
        name: 'Defects Found',
        type: 'number',
        description: 'Number of defects identified',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'QC Setup',
          description: 'Set up quality control processes',
          tasks: [
            {
              title: 'Define quality standards',
              description: 'Document quality requirements and specs.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['setup', 'standards'],
            },
            {
              title: 'Create inspection checklists',
              description: 'Develop QC inspection checklists.',
              assigneeRole: 'member',
              dueOffset: 3,
              priority: 'high',
              labels: ['setup', 'templates'],
            },
            {
              title: 'Define non-conformance procedures',
              description: 'Document how to handle quality issues.',
              assigneeRole: 'lead',
              dueOffset: 5,
              priority: 'high',
              labels: ['procedures'],
            },
            {
              title: 'Train QC team',
              description: 'Train inspectors on procedures.',
              assigneeRole: 'lead',
              dueOffset: 10,
              priority: 'high',
              labels: ['training'],
            },
          ],
        },
        {
          name: 'Regular Inspections',
          description: 'Ongoing QC activities',
          tasks: [
            {
              title: 'Daily production inspection',
              description: 'Conduct daily in-process inspections.',
              assigneeRole: 'member',
              dueOffset: 1,
              priority: 'high',
              labels: ['inspection', 'daily'],
            },
            {
              title: 'Incoming material inspection',
              description: 'Inspect received materials.',
              assigneeRole: 'member',
              dueOffset: 1,
              priority: 'high',
              labels: ['inspection', 'incoming'],
            },
            {
              title: 'Weekly QC report',
              description: 'Compile weekly quality metrics.',
              assigneeRole: 'lead',
              dueOffset: 7,
              priority: 'medium',
              labels: ['reporting', 'weekly'],
            },
            {
              title: 'Root cause analysis',
              description: 'Investigate recurring quality issues.',
              assigneeRole: 'lead',
              dueOffset: 14,
              priority: 'high',
              labels: ['analysis'],
            },
          ],
        },
      ],
    },
    settings: {
      defaultView: 'kanban',
      enableTimeTracking: true,
      enableStoryPoints: false,
    },
  },

  // ==================== 5. FACILITY MANAGEMENT ====================
  {
    name: 'Facility Management',
    slug: 'facility-management',
    description:
      'Manage office or facility operations including maintenance, safety, and space planning.',
    category: 'operations',
    icon: 'Building',
    color: '#06B6D4',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'requested', name: 'Requested', order: 0, color: '#6B7280' },
      { id: 'scheduled', name: 'Scheduled', order: 1, color: '#3B82F6' },
      { id: 'in_progress', name: 'In Progress', order: 2, color: '#F59E0B' },
      { id: 'completed', name: 'Completed', order: 3, color: '#10B981' },
    ],
    customFields: [
      {
        name: 'Request Type',
        type: 'select',
        description: 'Type of facility request',
        options: ['Maintenance', 'Repair', 'Safety', 'Cleaning', 'Space Request', 'Equipment', 'Security'],
        isRequired: true,
      },
      {
        name: 'Location',
        type: 'text',
        description: 'Building/floor/room',
        isRequired: true,
      },
      {
        name: 'Urgency',
        type: 'select',
        description: 'Request urgency',
        options: ['Emergency', 'High', 'Medium', 'Low'],
        isRequired: true,
      },
      {
        name: 'Requested By',
        type: 'text',
        description: 'Person who requested',
        isRequired: false,
      },
      {
        name: 'Cost',
        type: 'number',
        description: 'Estimated/actual cost',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'Preventive Maintenance',
          description: 'Scheduled maintenance tasks',
          tasks: [
            {
              title: 'HVAC system check',
              description: 'Monthly HVAC inspection and maintenance.',
              assigneeRole: 'member',
              dueOffset: 30,
              priority: 'high',
              labels: ['maintenance', 'monthly'],
            },
            {
              title: 'Fire safety inspection',
              description: 'Quarterly fire safety equipment check.',
              assigneeRole: 'member',
              dueOffset: 90,
              priority: 'high',
              labels: ['safety', 'quarterly'],
              subtasks: [
                { title: 'Test fire alarms' },
                { title: 'Check extinguishers' },
                { title: 'Verify emergency exits' },
                { title: 'Update safety logs' },
              ],
            },
            {
              title: 'Elevator inspection',
              description: 'Annual elevator safety inspection.',
              assigneeRole: 'lead',
              dueOffset: 365,
              priority: 'high',
              labels: ['safety', 'annual'],
            },
            {
              title: 'Deep cleaning',
              description: 'Quarterly deep cleaning of facilities.',
              assigneeRole: 'member',
              dueOffset: 90,
              priority: 'medium',
              labels: ['cleaning', 'quarterly'],
            },
          ],
        },
        {
          name: 'Facility Projects',
          description: 'Larger facility initiatives',
          tasks: [
            {
              title: 'Space utilization review',
              description: 'Assess current space usage.',
              assigneeRole: 'lead',
              dueOffset: 180,
              priority: 'medium',
              labels: ['planning', 'semi-annual'],
            },
            {
              title: 'Energy audit',
              description: 'Annual energy consumption review.',
              assigneeRole: 'lead',
              dueOffset: 365,
              priority: 'medium',
              labels: ['sustainability', 'annual'],
            },
            {
              title: 'Emergency preparedness drill',
              description: 'Conduct emergency evacuation drill.',
              assigneeRole: 'lead',
              dueOffset: 180,
              priority: 'high',
              labels: ['safety', 'semi-annual'],
            },
          ],
        },
      ],
    },
    settings: {
      defaultView: 'kanban',
      enableTimeTracking: true,
      enableStoryPoints: false,
    },
  },

  // ==================== 6. STANDARD OPERATING PROCEDURES ====================
  {
    name: 'SOP Development',
    slug: 'sop-development',
    description:
      'Create and maintain Standard Operating Procedures. Document processes for consistency and compliance.',
    category: 'operations',
    icon: 'FileText',
    color: '#EC4899',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'draft', name: 'Draft', order: 0, color: '#6B7280' },
      { id: 'review', name: 'Review', order: 1, color: '#3B82F6' },
      { id: 'approval', name: 'Approval', order: 2, color: '#F59E0B' },
      { id: 'active', name: 'Active', order: 3, color: '#10B981' },
      { id: 'archived', name: 'Archived', order: 4, color: '#8B5CF6' },
    ],
    customFields: [
      {
        name: 'SOP Number',
        type: 'text',
        description: 'Unique SOP identifier',
        isRequired: true,
      },
      {
        name: 'Department',
        type: 'text',
        description: 'Owning department',
        isRequired: true,
      },
      {
        name: 'Version',
        type: 'text',
        description: 'Document version',
        isRequired: true,
      },
      {
        name: 'Effective Date',
        type: 'date',
        description: 'Date SOP becomes effective',
        isRequired: false,
      },
      {
        name: 'Review Date',
        type: 'date',
        description: 'Next scheduled review',
        isRequired: false,
      },
      {
        name: 'Owner',
        type: 'text',
        description: 'Document owner',
        isRequired: false,
      },
    ],
    structure: {
      sections: [
        {
          name: 'SOP Framework',
          description: 'Set up SOP management system',
          tasks: [
            {
              title: 'Create SOP template',
              description: 'Develop standard SOP format.',
              assigneeRole: 'lead',
              dueOffset: 0,
              priority: 'high',
              labels: ['setup', 'templates'],
              subtasks: [
                { title: 'Define header format' },
                { title: 'Create section structure' },
                { title: 'Add revision history table' },
                { title: 'Include approval signatures' },
              ],
            },
            {
              title: 'Define review process',
              description: 'Document SOP review and approval workflow.',
              assigneeRole: 'lead',
              dueOffset: 3,
              priority: 'high',
              labels: ['process'],
            },
            {
              title: 'Set up document control',
              description: 'Establish version control and storage.',
              assigneeRole: 'member',
              dueOffset: 5,
              priority: 'high',
              labels: ['setup'],
            },
          ],
        },
        {
          name: 'Sample SOPs',
          description: 'Example SOPs to create',
          tasks: [
            {
              title: 'SOP: Employee Onboarding',
              description: 'Document employee onboarding process.',
              assigneeRole: 'member',
              dueOffset: 10,
              priority: 'high',
              labels: ['hr', 'sop'],
            },
            {
              title: 'SOP: Customer Complaint Handling',
              description: 'Document complaint resolution process.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['customer-service', 'sop'],
            },
            {
              title: 'SOP: Data Backup Procedures',
              description: 'Document IT backup procedures.',
              assigneeRole: 'member',
              dueOffset: 17,
              priority: 'high',
              labels: ['it', 'sop'],
            },
          ],
        },
        {
          name: 'Maintenance',
          description: 'Ongoing SOP maintenance',
          tasks: [
            {
              title: 'Annual SOP review',
              description: 'Review all SOPs for accuracy.',
              assigneeRole: 'lead',
              dueOffset: 365,
              priority: 'high',
              labels: ['review', 'annual'],
            },
            {
              title: 'Training on updated SOPs',
              description: 'Train staff on SOP changes.',
              assigneeRole: 'member',
              dueOffset: 14,
              priority: 'high',
              labels: ['training'],
            },
          ],
        },
      ],
    },
    settings: {
      defaultView: 'table',
      enableTimeTracking: false,
      enableStoryPoints: false,
    },
  },

  // ==================== 7. PROCESS DOCUMENTATION ====================
  {
    name: 'Process Documentation',
    slug: 'process-documentation',
    description:
      'Document business processes with flowcharts, procedures, and work instructions for operational clarity.',
    category: 'operations',
    icon: 'FileText',
    color: '#6366F1',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'identified', name: 'Identified', order: 0, color: '#6B7280' },
      { id: 'documenting', name: 'Documenting', order: 1, color: '#3B82F6' },
      { id: 'review', name: 'Review', order: 2, color: '#F59E0B' },
      { id: 'approved', name: 'Approved', order: 3, color: '#10B981' },
      { id: 'published', name: 'Published', order: 4, color: '#8B5CF6' },
    ],
    customFields: [
      { name: 'Process ID', type: 'text', description: 'Unique process identifier', isRequired: true },
      { name: 'Process Owner', type: 'text', description: 'Person responsible for the process', isRequired: true },
      { name: 'Department', type: 'text', description: 'Owning department', isRequired: false },
      { name: 'Version', type: 'text', description: 'Document version number', isRequired: false },
      { name: 'Last Updated', type: 'date', description: 'Last modification date', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Process Discovery',
          description: 'Identify and scope processes to document',
          tasks: [
            { title: 'Identify key business processes', description: 'List all critical processes needing documentation.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['discovery'] },
            { title: 'Prioritize processes by impact', description: 'Rank processes by business criticality.', assigneeRole: 'lead', dueOffset: 3, priority: 'high', labels: ['planning'] },
            { title: 'Assign process owners', description: 'Designate owners for each process.', assigneeRole: 'lead', dueOffset: 5, priority: 'medium', labels: ['assignment'] },
            { title: 'Create documentation timeline', description: 'Set deadlines for each process documentation.', assigneeRole: 'member', dueOffset: 7, priority: 'medium', labels: ['planning'] },
          ],
        },
        {
          name: 'Documentation Standards',
          description: 'Establish documentation framework',
          tasks: [
            { title: 'Create process template', description: 'Develop standard process documentation format.', assigneeRole: 'lead', dueOffset: 3, priority: 'high', labels: ['templates'] },
            { title: 'Define flowchart symbols', description: 'Standardize flowchart notation and symbols.', assigneeRole: 'member', dueOffset: 5, priority: 'medium', labels: ['standards'] },
            { title: 'Establish naming conventions', description: 'Create consistent naming for processes and documents.', assigneeRole: 'member', dueOffset: 7, priority: 'medium', labels: ['standards'] },
          ],
        },
        {
          name: 'Documentation Execution',
          description: 'Create process documents',
          tasks: [
            { title: 'Interview process participants', description: 'Gather information from process stakeholders.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['research'] },
            { title: 'Create process flowcharts', description: 'Develop visual process maps.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['documentation'] },
            { title: 'Write detailed procedures', description: 'Document step-by-step procedures.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['documentation'] },
            { title: 'Review and validate with stakeholders', description: 'Verify accuracy with process participants.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['review'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 8. WORKFLOW OPTIMIZATION ====================
  {
    name: 'Workflow Optimization',
    slug: 'workflow-optimization',
    description:
      'Analyze and improve business workflows to eliminate bottlenecks and increase efficiency.',
    category: 'operations',
    icon: 'Zap',
    color: '#F59E0B',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'analysis', name: 'Analysis', order: 0, color: '#6B7280' },
      { id: 'design', name: 'Design', order: 1, color: '#3B82F6' },
      { id: 'implementation', name: 'Implementation', order: 2, color: '#F59E0B' },
      { id: 'monitoring', name: 'Monitoring', order: 3, color: '#8B5CF6' },
      { id: 'optimized', name: 'Optimized', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Workflow Name', type: 'text', description: 'Name of the workflow', isRequired: true },
      { name: 'Current Cycle Time', type: 'text', description: 'Current process duration', isRequired: false },
      { name: 'Target Cycle Time', type: 'text', description: 'Desired process duration', isRequired: false },
      { name: 'Improvement %', type: 'number', description: 'Percentage improvement achieved', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Current State Analysis',
          description: 'Analyze existing workflows',
          tasks: [
            { title: 'Map current workflow', description: 'Document the existing process flow.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['analysis'] },
            { title: 'Identify bottlenecks', description: 'Find process constraints and delays.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['analysis'] },
            { title: 'Gather cycle time data', description: 'Measure current process timing.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['metrics'] },
            { title: 'Interview process participants', description: 'Collect feedback on pain points.', assigneeRole: 'member', dueOffset: 10, priority: 'medium', labels: ['research'] },
          ],
        },
        {
          name: 'Future State Design',
          description: 'Design optimized workflow',
          tasks: [
            { title: 'Design improved workflow', description: 'Create optimized process flow.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['design'] },
            { title: 'Eliminate non-value activities', description: 'Remove waste from the process.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['optimization'] },
            { title: 'Define automation opportunities', description: 'Identify tasks for automation.', assigneeRole: 'member', dueOffset: 21, priority: 'medium', labels: ['automation'] },
            { title: 'Get stakeholder approval', description: 'Present and approve new workflow.', assigneeRole: 'lead', dueOffset: 25, priority: 'high', labels: ['approval'] },
          ],
        },
        {
          name: 'Implementation',
          description: 'Deploy optimized workflow',
          tasks: [
            { title: 'Create implementation plan', description: 'Plan the rollout of changes.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['planning'] },
            { title: 'Train team on new workflow', description: 'Educate staff on process changes.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['training'] },
            { title: 'Monitor and measure results', description: 'Track improvement metrics.', assigneeRole: 'lead', dueOffset: 45, priority: 'high', labels: ['monitoring'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 9. PROCESS AUTOMATION ====================
  {
    name: 'Process Automation',
    slug: 'process-automation',
    description:
      'Automate manual business processes using technology to improve efficiency and reduce errors.',
    category: 'operations',
    icon: 'Cpu',
    color: '#8B5CF6',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'assessment', name: 'Assessment', order: 0, color: '#6B7280' },
      { id: 'design', name: 'Design', order: 1, color: '#3B82F6' },
      { id: 'development', name: 'Development', order: 2, color: '#F59E0B' },
      { id: 'testing', name: 'Testing', order: 3, color: '#8B5CF6' },
      { id: 'deployed', name: 'Deployed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Process Name', type: 'text', description: 'Name of process to automate', isRequired: true },
      { name: 'Automation Tool', type: 'text', description: 'Tool or platform used', isRequired: false },
      { name: 'Hours Saved Weekly', type: 'number', description: 'Estimated weekly time savings', isRequired: false },
      { name: 'ROI', type: 'text', description: 'Return on investment', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Automation Assessment',
          description: 'Evaluate automation opportunities',
          tasks: [
            { title: 'Identify automation candidates', description: 'List processes suitable for automation.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['assessment'] },
            { title: 'Analyze automation feasibility', description: 'Evaluate technical and business feasibility.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['analysis'] },
            { title: 'Calculate ROI', description: 'Estimate return on investment for automation.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['financial'] },
            { title: 'Prioritize automation projects', description: 'Rank projects by value and effort.', assigneeRole: 'lead', dueOffset: 10, priority: 'high', labels: ['planning'] },
          ],
        },
        {
          name: 'Automation Design',
          description: 'Design automated workflows',
          tasks: [
            { title: 'Document current process', description: 'Map existing manual process.', assigneeRole: 'member', dueOffset: 12, priority: 'high', labels: ['documentation'] },
            { title: 'Design automated workflow', description: 'Create automation blueprint.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['design'] },
            { title: 'Select automation tools', description: 'Choose appropriate technology platform.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['technology'] },
            { title: 'Define success metrics', description: 'Set KPIs for automation success.', assigneeRole: 'lead', dueOffset: 24, priority: 'medium', labels: ['metrics'] },
          ],
        },
        {
          name: 'Development and Testing',
          description: 'Build and test automation',
          tasks: [
            { title: 'Develop automation scripts', description: 'Build automated workflows.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['development'] },
            { title: 'Test in sandbox environment', description: 'Validate automation in test environment.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['testing'] },
            { title: 'User acceptance testing', description: 'Get user sign-off on automation.', assigneeRole: 'lead', dueOffset: 49, priority: 'high', labels: ['testing'] },
          ],
        },
        {
          name: 'Deployment',
          description: 'Roll out automation',
          tasks: [
            { title: 'Deploy to production', description: 'Launch automation in live environment.', assigneeRole: 'lead', dueOffset: 55, priority: 'high', labels: ['deployment'] },
            { title: 'Monitor automation performance', description: 'Track automation metrics.', assigneeRole: 'member', dueOffset: 60, priority: 'high', labels: ['monitoring'] },
            { title: 'Document and train users', description: 'Create user guides and training.', assigneeRole: 'member', dueOffset: 65, priority: 'medium', labels: ['training'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 10. QUALITY MANAGEMENT ====================
  {
    name: 'Quality Management',
    slug: 'quality-management',
    description:
      'Implement and maintain quality management systems to ensure consistent product and service quality.',
    category: 'operations',
    icon: 'Award',
    color: '#10B981',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'implementation', name: 'Implementation', order: 1, color: '#3B82F6' },
      { id: 'monitoring', name: 'Monitoring', order: 2, color: '#F59E0B' },
      { id: 'improvement', name: 'Improvement', order: 3, color: '#8B5CF6' },
      { id: 'certified', name: 'Certified', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Quality Standard', type: 'text', description: 'ISO or other standard', isRequired: false },
      { name: 'Scope', type: 'text', description: 'QMS scope and boundaries', isRequired: false },
      { name: 'Certification Date', type: 'date', description: 'Target certification date', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'QMS Planning',
          description: 'Plan quality management system',
          tasks: [
            { title: 'Define quality policy', description: 'Establish organizational quality policy.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['policy'] },
            { title: 'Set quality objectives', description: 'Define measurable quality goals.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['objectives'] },
            { title: 'Identify stakeholder requirements', description: 'Document customer and regulatory requirements.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['requirements'] },
            { title: 'Map core processes', description: 'Identify and document key processes.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['processes'] },
          ],
        },
        {
          name: 'Documentation',
          description: 'Create QMS documentation',
          tasks: [
            { title: 'Create quality manual', description: 'Develop quality management manual.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['documentation'] },
            { title: 'Document procedures', description: 'Write quality procedures.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['documentation'] },
            { title: 'Create work instructions', description: 'Develop detailed work instructions.', assigneeRole: 'member', dueOffset: 45, priority: 'medium', labels: ['documentation'] },
            { title: 'Establish record forms', description: 'Create quality record templates.', assigneeRole: 'member', dueOffset: 50, priority: 'medium', labels: ['templates'] },
          ],
        },
        {
          name: 'Implementation',
          description: 'Deploy quality system',
          tasks: [
            { title: 'Train employees on QMS', description: 'Conduct quality awareness training.', assigneeRole: 'lead', dueOffset: 55, priority: 'high', labels: ['training'] },
            { title: 'Implement quality processes', description: 'Roll out quality procedures.', assigneeRole: 'member', dueOffset: 65, priority: 'high', labels: ['implementation'] },
            { title: 'Conduct internal audits', description: 'Perform internal quality audits.', assigneeRole: 'lead', dueOffset: 80, priority: 'high', labels: ['audit'] },
            { title: 'Management review', description: 'Conduct management review of QMS.', assigneeRole: 'lead', dueOffset: 90, priority: 'high', labels: ['review'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 11. QUALITY AUDIT ====================
  {
    name: 'Quality Audit',
    slug: 'quality-audit',
    description:
      'Plan and execute quality audits to verify compliance with standards and identify improvements.',
    category: 'operations',
    icon: 'Search',
    color: '#EF4444',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'preparation', name: 'Preparation', order: 1, color: '#3B82F6' },
      { id: 'execution', name: 'Execution', order: 2, color: '#F59E0B' },
      { id: 'reporting', name: 'Reporting', order: 3, color: '#8B5CF6' },
      { id: 'closed', name: 'Closed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Audit Number', type: 'text', description: 'Unique audit identifier', isRequired: true },
      { name: 'Audit Type', type: 'select', description: 'Type of audit', options: ['Internal', 'External', 'Supplier', 'Regulatory'], isRequired: true },
      { name: 'Lead Auditor', type: 'text', description: 'Lead auditor name', isRequired: false },
      { name: 'Findings Count', type: 'number', description: 'Number of findings', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Audit Planning',
          description: 'Plan the audit',
          tasks: [
            { title: 'Define audit scope', description: 'Determine what will be audited.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Select audit team', description: 'Assign auditors to the audit.', assigneeRole: 'lead', dueOffset: 3, priority: 'high', labels: ['planning'] },
            { title: 'Review previous audit findings', description: 'Check status of prior findings.', assigneeRole: 'member', dueOffset: 5, priority: 'medium', labels: ['review'] },
            { title: 'Notify auditees', description: 'Send audit notification.', assigneeRole: 'member', dueOffset: 7, priority: 'medium', labels: ['communication'] },
          ],
        },
        {
          name: 'Audit Preparation',
          description: 'Prepare audit materials',
          tasks: [
            { title: 'Create audit checklist', description: 'Develop audit questions and checklist.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['preparation'] },
            { title: 'Review documentation', description: 'Review relevant procedures and records.', assigneeRole: 'member', dueOffset: 12, priority: 'high', labels: ['preparation'] },
            { title: 'Conduct opening meeting', description: 'Hold audit kick-off meeting.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['meeting'] },
          ],
        },
        {
          name: 'Audit Execution',
          description: 'Conduct the audit',
          tasks: [
            { title: 'Conduct interviews', description: 'Interview process participants.', assigneeRole: 'member', dueOffset: 15, priority: 'high', labels: ['audit'] },
            { title: 'Review records and evidence', description: 'Examine objective evidence.', assigneeRole: 'member', dueOffset: 16, priority: 'high', labels: ['audit'] },
            { title: 'Document findings', description: 'Record audit findings and observations.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['findings'] },
            { title: 'Conduct closing meeting', description: 'Present preliminary findings.', assigneeRole: 'lead', dueOffset: 18, priority: 'high', labels: ['meeting'] },
          ],
        },
        {
          name: 'Reporting and Follow-up',
          description: 'Report and close audit',
          tasks: [
            { title: 'Write audit report', description: 'Prepare formal audit report.', assigneeRole: 'lead', dueOffset: 25, priority: 'high', labels: ['reporting'] },
            { title: 'Request corrective actions', description: 'Get action plans for findings.', assigneeRole: 'member', dueOffset: 30, priority: 'high', labels: ['corrective-action'] },
            { title: 'Verify corrective actions', description: 'Confirm effectiveness of actions.', assigneeRole: 'lead', dueOffset: 60, priority: 'high', labels: ['verification'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 12. CONTINUOUS IMPROVEMENT ====================
  {
    name: 'Continuous Improvement',
    slug: 'continuous-improvement',
    description:
      'Drive ongoing improvement initiatives using structured methodologies to enhance operations.',
    category: 'operations',
    icon: 'TrendingUp',
    color: '#06B6D4',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'idea', name: 'Idea', order: 0, color: '#6B7280' },
      { id: 'analysis', name: 'Analysis', order: 1, color: '#3B82F6' },
      { id: 'implementation', name: 'Implementation', order: 2, color: '#F59E0B' },
      { id: 'verification', name: 'Verification', order: 3, color: '#8B5CF6' },
      { id: 'standardized', name: 'Standardized', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Improvement ID', type: 'text', description: 'Unique improvement identifier', isRequired: true },
      { name: 'Category', type: 'select', description: 'Type of improvement', options: ['Cost Reduction', 'Quality', 'Efficiency', 'Safety', 'Customer Satisfaction'], isRequired: false },
      { name: 'Estimated Savings', type: 'number', description: 'Projected cost savings', isRequired: false },
      { name: 'Sponsor', type: 'text', description: 'Initiative sponsor', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Idea Generation',
          description: 'Collect improvement ideas',
          tasks: [
            { title: 'Set up suggestion system', description: 'Create process for collecting ideas.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['setup'] },
            { title: 'Review improvement suggestions', description: 'Evaluate submitted ideas.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['review'] },
            { title: 'Prioritize improvements', description: 'Rank ideas by impact and effort.', assigneeRole: 'lead', dueOffset: 10, priority: 'high', labels: ['prioritization'] },
          ],
        },
        {
          name: 'Analysis Phase',
          description: 'Analyze root causes',
          tasks: [
            { title: 'Conduct root cause analysis', description: 'Identify underlying causes of issues.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['analysis'] },
            { title: 'Gather baseline data', description: 'Measure current performance.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['metrics'] },
            { title: 'Develop improvement plan', description: 'Create action plan for improvement.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['planning'] },
            { title: 'Get management approval', description: 'Obtain approval for resources.', assigneeRole: 'lead', dueOffset: 25, priority: 'high', labels: ['approval'] },
          ],
        },
        {
          name: 'Implementation',
          description: 'Execute improvements',
          tasks: [
            { title: 'Implement improvement actions', description: 'Execute the improvement plan.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['implementation'] },
            { title: 'Monitor implementation progress', description: 'Track implementation status.', assigneeRole: 'lead', dueOffset: 42, priority: 'high', labels: ['monitoring'] },
            { title: 'Verify results', description: 'Measure improvement effectiveness.', assigneeRole: 'lead', dueOffset: 50, priority: 'high', labels: ['verification'] },
            { title: 'Standardize successful changes', description: 'Document and standardize improvements.', assigneeRole: 'member', dueOffset: 55, priority: 'medium', labels: ['standardization'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 13. LEAN IMPLEMENTATION ====================
  {
    name: 'Lean Implementation',
    slug: 'lean-implementation',
    description:
      'Implement Lean manufacturing principles to eliminate waste and improve operational efficiency.',
    category: 'operations',
    icon: 'Minimize2',
    color: '#22C55E',
    projectType: 'kanban',
    isFeatured: true,
    kanbanStages: [
      { id: 'assessment', name: 'Assessment', order: 0, color: '#6B7280' },
      { id: 'training', name: 'Training', order: 1, color: '#3B82F6' },
      { id: 'implementation', name: 'Implementation', order: 2, color: '#F59E0B' },
      { id: 'sustaining', name: 'Sustaining', order: 3, color: '#8B5CF6' },
      { id: 'mature', name: 'Mature', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Lean Tool', type: 'select', description: 'Lean methodology used', options: ['5S', 'Kaizen', 'Kanban', 'Value Stream Mapping', 'SMED', 'TPM', 'Poka-Yoke'], isRequired: false },
      { name: 'Area/Cell', type: 'text', description: 'Implementation area', isRequired: false },
      { name: 'Waste Eliminated', type: 'text', description: 'Type of waste addressed', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Lean Assessment',
          description: 'Assess current state',
          tasks: [
            { title: 'Conduct value stream mapping', description: 'Map current value stream.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['vsm'] },
            { title: 'Identify 7 wastes', description: 'Find waste in current processes.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['waste'] },
            { title: 'Calculate current metrics', description: 'Measure baseline performance.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['metrics'] },
            { title: 'Prioritize improvement areas', description: 'Select areas for Lean implementation.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['planning'] },
          ],
        },
        {
          name: 'Lean Training',
          description: 'Train the organization',
          tasks: [
            { title: 'Lean awareness training', description: 'Train all employees on Lean basics.', assigneeRole: 'lead', dueOffset: 17, priority: 'high', labels: ['training'] },
            { title: 'Train Lean champions', description: 'Develop internal Lean experts.', assigneeRole: 'lead', dueOffset: 24, priority: 'high', labels: ['training'] },
            { title: 'Train supervisors', description: 'Equip supervisors with Lean skills.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['training'] },
          ],
        },
        {
          name: 'Lean Tools Implementation',
          description: 'Deploy Lean tools',
          tasks: [
            { title: 'Implement 5S', description: 'Deploy 5S workplace organization.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['5s'] },
            { title: 'Establish visual management', description: 'Create visual workplace.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['visual'] },
            { title: 'Implement Kanban system', description: 'Set up pull production system.', assigneeRole: 'member', dueOffset: 50, priority: 'high', labels: ['kanban'] },
            { title: 'Conduct Kaizen events', description: 'Run improvement workshops.', assigneeRole: 'lead', dueOffset: 60, priority: 'high', labels: ['kaizen'] },
          ],
        },
        {
          name: 'Sustaining',
          description: 'Sustain improvements',
          tasks: [
            { title: 'Establish daily management', description: 'Implement daily Lean routines.', assigneeRole: 'lead', dueOffset: 70, priority: 'high', labels: ['daily-mgmt'] },
            { title: 'Conduct Lean audits', description: 'Regular audits to sustain gains.', assigneeRole: 'member', dueOffset: 80, priority: 'high', labels: ['audit'] },
            { title: 'Recognize achievements', description: 'Celebrate Lean successes.', assigneeRole: 'lead', dueOffset: 90, priority: 'medium', labels: ['recognition'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 14. SIX SIGMA PROJECT ====================
  {
    name: 'Six Sigma Project',
    slug: 'six-sigma-project',
    description:
      'Execute Six Sigma DMAIC projects to reduce process variation and improve quality.',
    category: 'operations',
    icon: 'Target',
    color: '#3B82F6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'define', name: 'Define', order: 0, color: '#6B7280' },
      { id: 'measure', name: 'Measure', order: 1, color: '#3B82F6' },
      { id: 'analyze', name: 'Analyze', order: 2, color: '#F59E0B' },
      { id: 'improve', name: 'Improve', order: 3, color: '#8B5CF6' },
      { id: 'control', name: 'Control', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Project Name', type: 'text', description: 'Six Sigma project name', isRequired: true },
      { name: 'Belt Level', type: 'select', description: 'Project lead belt level', options: ['Yellow Belt', 'Green Belt', 'Black Belt', 'Master Black Belt'], isRequired: false },
      { name: 'Sigma Level', type: 'number', description: 'Current sigma level', isRequired: false },
      { name: 'Target Sigma', type: 'number', description: 'Target sigma level', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Define Phase',
          description: 'Define the problem',
          tasks: [
            { title: 'Create project charter', description: 'Document project scope and goals.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['define'] },
            { title: 'Define CTQ requirements', description: 'Identify critical to quality factors.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['define'] },
            { title: 'Create SIPOC diagram', description: 'Map process at high level.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['define'] },
            { title: 'Conduct stakeholder analysis', description: 'Identify project stakeholders.', assigneeRole: 'lead', dueOffset: 10, priority: 'medium', labels: ['define'] },
          ],
        },
        {
          name: 'Measure Phase',
          description: 'Measure current performance',
          tasks: [
            { title: 'Create data collection plan', description: 'Define data collection strategy.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['measure'] },
            { title: 'Validate measurement system', description: 'Conduct MSA study.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['measure'] },
            { title: 'Collect baseline data', description: 'Gather current performance data.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['measure'] },
            { title: 'Calculate process capability', description: 'Determine Cp, Cpk, sigma level.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['measure'] },
          ],
        },
        {
          name: 'Analyze Phase',
          description: 'Analyze root causes',
          tasks: [
            { title: 'Create cause and effect diagram', description: 'Fishbone diagram analysis.', assigneeRole: 'member', dueOffset: 40, priority: 'high', labels: ['analyze'] },
            { title: 'Conduct hypothesis testing', description: 'Statistical analysis of causes.', assigneeRole: 'member', dueOffset: 47, priority: 'high', labels: ['analyze'] },
            { title: 'Verify root causes', description: 'Confirm vital few causes.', assigneeRole: 'lead', dueOffset: 52, priority: 'high', labels: ['analyze'] },
          ],
        },
        {
          name: 'Improve Phase',
          description: 'Develop and implement solutions',
          tasks: [
            { title: 'Generate improvement solutions', description: 'Brainstorm potential solutions.', assigneeRole: 'member', dueOffset: 56, priority: 'high', labels: ['improve'] },
            { title: 'Evaluate and select solutions', description: 'Use decision matrix to select.', assigneeRole: 'lead', dueOffset: 60, priority: 'high', labels: ['improve'] },
            { title: 'Pilot improvements', description: 'Test solutions on small scale.', assigneeRole: 'member', dueOffset: 70, priority: 'high', labels: ['improve'] },
            { title: 'Implement full-scale', description: 'Roll out validated improvements.', assigneeRole: 'lead', dueOffset: 80, priority: 'high', labels: ['improve'] },
          ],
        },
        {
          name: 'Control Phase',
          description: 'Sustain improvements',
          tasks: [
            { title: 'Create control plan', description: 'Document control procedures.', assigneeRole: 'lead', dueOffset: 85, priority: 'high', labels: ['control'] },
            { title: 'Implement control charts', description: 'Set up SPC monitoring.', assigneeRole: 'member', dueOffset: 90, priority: 'high', labels: ['control'] },
            { title: 'Update SOPs', description: 'Document new standard procedures.', assigneeRole: 'member', dueOffset: 95, priority: 'high', labels: ['control'] },
            { title: 'Close project', description: 'Complete project documentation.', assigneeRole: 'lead', dueOffset: 100, priority: 'medium', labels: ['control'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 15. KAIZEN EVENT ====================
  {
    name: 'Kaizen Event',
    slug: 'kaizen-event',
    description:
      'Plan and execute rapid improvement events to achieve breakthrough improvements in a focused area.',
    category: 'operations',
    icon: 'Zap',
    color: '#F97316',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'preparation', name: 'Preparation', order: 1, color: '#3B82F6' },
      { id: 'event', name: 'Event Week', order: 2, color: '#F59E0B' },
      { id: 'follow_up', name: 'Follow-up', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Event Name', type: 'text', description: 'Kaizen event title', isRequired: true },
      { name: 'Target Area', type: 'text', description: 'Area of focus', isRequired: true },
      { name: 'Event Dates', type: 'text', description: 'Event week dates', isRequired: false },
      { name: 'Improvement Target', type: 'text', description: 'Target improvement metric', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Event Planning',
          description: 'Plan the Kaizen event',
          tasks: [
            { title: 'Define event scope', description: 'Determine focus area and goals.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['planning'] },
            { title: 'Select Kaizen team', description: 'Identify team members.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['team'] },
            { title: 'Set improvement targets', description: 'Define measurable objectives.', assigneeRole: 'lead', dueOffset: 7, priority: 'high', labels: ['targets'] },
            { title: 'Schedule event week', description: 'Block calendars for event.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['scheduling'] },
          ],
        },
        {
          name: 'Pre-Event Preparation',
          description: 'Prepare for the event',
          tasks: [
            { title: 'Collect baseline data', description: 'Gather current state metrics.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['data'] },
            { title: 'Map current process', description: 'Document existing process.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['mapping'] },
            { title: 'Prepare training materials', description: 'Create Kaizen training content.', assigneeRole: 'lead', dueOffset: 19, priority: 'medium', labels: ['training'] },
            { title: 'Arrange logistics', description: 'Set up room, materials, supplies.', assigneeRole: 'member', dueOffset: 20, priority: 'medium', labels: ['logistics'] },
          ],
        },
        {
          name: 'Event Execution',
          description: 'Run the Kaizen event',
          tasks: [
            { title: 'Day 1: Training and current state', description: 'Train team, analyze current state.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['event'] },
            { title: 'Day 2: Root cause analysis', description: 'Identify improvement opportunities.', assigneeRole: 'lead', dueOffset: 22, priority: 'high', labels: ['event'] },
            { title: 'Day 3: Develop solutions', description: 'Design future state and solutions.', assigneeRole: 'lead', dueOffset: 23, priority: 'high', labels: ['event'] },
            { title: 'Day 4-5: Implement changes', description: 'Execute improvements.', assigneeRole: 'member', dueOffset: 25, priority: 'high', labels: ['event'] },
          ],
        },
        {
          name: 'Follow-up',
          description: 'Sustain and verify results',
          tasks: [
            { title: 'Complete 30-day action items', description: 'Finish remaining actions.', assigneeRole: 'member', dueOffset: 55, priority: 'high', labels: ['follow-up'] },
            { title: 'Verify improvements', description: 'Measure post-event metrics.', assigneeRole: 'lead', dueOffset: 60, priority: 'high', labels: ['verification'] },
            { title: 'Standardize changes', description: 'Update procedures and training.', assigneeRole: 'member', dueOffset: 65, priority: 'high', labels: ['standardization'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 16. 5S IMPLEMENTATION ====================
  {
    name: '5S Implementation',
    slug: '5s-implementation',
    description:
      'Implement the 5S workplace organization methodology to create a clean, efficient, and safe work environment.',
    category: 'operations',
    icon: 'Layout',
    color: '#14B8A6',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'sort', name: 'Sort', order: 0, color: '#EF4444' },
      { id: 'set_in_order', name: 'Set in Order', order: 1, color: '#F59E0B' },
      { id: 'shine', name: 'Shine', order: 2, color: '#3B82F6' },
      { id: 'standardize', name: 'Standardize', order: 3, color: '#8B5CF6' },
      { id: 'sustain', name: 'Sustain', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Area Name', type: 'text', description: 'Work area for 5S', isRequired: true },
      { name: 'Department', type: 'text', description: 'Department responsible', isRequired: false },
      { name: 'Score', type: 'number', description: '5S audit score', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Sort (Seiri)',
          description: 'Remove unnecessary items',
          tasks: [
            { title: 'Red tag unnecessary items', description: 'Identify items not needed in the area.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['sort'] },
            { title: 'Dispose of red tagged items', description: 'Remove or relocate tagged items.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['sort'] },
            { title: 'Document disposal actions', description: 'Record items removed and disposition.', assigneeRole: 'member', dueOffset: 7, priority: 'medium', labels: ['sort'] },
          ],
        },
        {
          name: 'Set in Order (Seiton)',
          description: 'Organize remaining items',
          tasks: [
            { title: 'Define item locations', description: 'Determine best location for each item.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['set-in-order'] },
            { title: 'Create visual labels', description: 'Label storage locations and items.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['set-in-order'] },
            { title: 'Implement shadow boards', description: 'Create tool outlines for easy identification.', assigneeRole: 'member', dueOffset: 17, priority: 'medium', labels: ['set-in-order'] },
            { title: 'Mark floor areas', description: 'Use floor tape to define zones.', assigneeRole: 'member', dueOffset: 21, priority: 'medium', labels: ['set-in-order'] },
          ],
        },
        {
          name: 'Shine (Seiso)',
          description: 'Clean the work area',
          tasks: [
            { title: 'Deep clean work area', description: 'Thoroughly clean entire area.', assigneeRole: 'member', dueOffset: 24, priority: 'high', labels: ['shine'] },
            { title: 'Identify contamination sources', description: 'Find root causes of dirt and mess.', assigneeRole: 'member', dueOffset: 26, priority: 'medium', labels: ['shine'] },
            { title: 'Create cleaning schedule', description: 'Establish regular cleaning routine.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['shine'] },
          ],
        },
        {
          name: 'Standardize and Sustain',
          description: 'Create standards and maintain gains',
          tasks: [
            { title: 'Document 5S standards', description: 'Create visual standards for the area.', assigneeRole: 'lead', dueOffset: 32, priority: 'high', labels: ['standardize'] },
            { title: 'Create 5S audit checklist', description: 'Develop audit criteria for the area.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['standardize'] },
            { title: 'Train team on standards', description: 'Educate all employees on 5S standards.', assigneeRole: 'lead', dueOffset: 40, priority: 'high', labels: ['sustain'] },
            { title: 'Schedule regular audits', description: 'Set up ongoing 5S audit schedule.', assigneeRole: 'lead', dueOffset: 45, priority: 'high', labels: ['sustain'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 17. ROOT CAUSE ANALYSIS ====================
  {
    name: 'Root Cause Analysis',
    slug: 'root-cause-analysis',
    description:
      'Conduct systematic root cause analysis to identify and address the underlying causes of problems.',
    category: 'operations',
    icon: 'Search',
    color: '#DC2626',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'problem_definition', name: 'Problem Definition', order: 0, color: '#6B7280' },
      { id: 'data_collection', name: 'Data Collection', order: 1, color: '#3B82F6' },
      { id: 'analysis', name: 'Analysis', order: 2, color: '#F59E0B' },
      { id: 'solutions', name: 'Solutions', order: 3, color: '#8B5CF6' },
      { id: 'closed', name: 'Closed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Problem ID', type: 'text', description: 'Unique problem identifier', isRequired: true },
      { name: 'RCA Method', type: 'select', description: 'Analysis method used', options: ['5 Whys', 'Fishbone', 'Fault Tree', 'Pareto', 'FMEA'], isRequired: false },
      { name: 'Root Cause', type: 'text', description: 'Identified root cause', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Problem Definition',
          description: 'Define and scope the problem',
          tasks: [
            { title: 'Write problem statement', description: 'Clearly define the problem.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['definition'] },
            { title: 'Quantify the impact', description: 'Measure the business impact.', assigneeRole: 'member', dueOffset: 3, priority: 'high', labels: ['definition'] },
            { title: 'Form RCA team', description: 'Assemble cross-functional team.', assigneeRole: 'lead', dueOffset: 5, priority: 'high', labels: ['team'] },
          ],
        },
        {
          name: 'Data Collection',
          description: 'Gather evidence and data',
          tasks: [
            { title: 'Collect incident data', description: 'Gather facts about the problem.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['data'] },
            { title: 'Interview stakeholders', description: 'Talk to people involved.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['interviews'] },
            { title: 'Review documentation', description: 'Examine relevant records.', assigneeRole: 'member', dueOffset: 12, priority: 'medium', labels: ['documentation'] },
            { title: 'Create timeline', description: 'Build sequence of events.', assigneeRole: 'member', dueOffset: 14, priority: 'medium', labels: ['timeline'] },
          ],
        },
        {
          name: 'Root Cause Analysis',
          description: 'Analyze and identify root causes',
          tasks: [
            { title: 'Conduct 5 Whys analysis', description: 'Ask why repeatedly to find root cause.', assigneeRole: 'lead', dueOffset: 17, priority: 'high', labels: ['analysis'] },
            { title: 'Create fishbone diagram', description: 'Map potential causes by category.', assigneeRole: 'member', dueOffset: 19, priority: 'high', labels: ['analysis'] },
            { title: 'Verify root causes', description: 'Validate identified causes with data.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['verification'] },
          ],
        },
        {
          name: 'Corrective Actions',
          description: 'Develop and implement solutions',
          tasks: [
            { title: 'Develop corrective actions', description: 'Create solutions for root causes.', assigneeRole: 'lead', dueOffset: 24, priority: 'high', labels: ['solutions'] },
            { title: 'Assign action owners', description: 'Designate responsible persons.', assigneeRole: 'lead', dueOffset: 26, priority: 'high', labels: ['assignment'] },
            { title: 'Implement corrective actions', description: 'Execute the solutions.', assigneeRole: 'member', dueOffset: 40, priority: 'high', labels: ['implementation'] },
            { title: 'Verify effectiveness', description: 'Confirm problem is resolved.', assigneeRole: 'lead', dueOffset: 55, priority: 'high', labels: ['verification'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 18. CAPACITY PLANNING ====================
  {
    name: 'Capacity Planning',
    slug: 'capacity-planning',
    description:
      'Analyze and plan production or service capacity to meet demand requirements efficiently.',
    category: 'operations',
    icon: 'BarChart2',
    color: '#7C3AED',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'demand_analysis', name: 'Demand Analysis', order: 0, color: '#6B7280' },
      { id: 'capacity_assessment', name: 'Capacity Assessment', order: 1, color: '#3B82F6' },
      { id: 'gap_analysis', name: 'Gap Analysis', order: 2, color: '#F59E0B' },
      { id: 'planning', name: 'Planning', order: 3, color: '#8B5CF6' },
      { id: 'implemented', name: 'Implemented', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Planning Period', type: 'text', description: 'Time period for planning', isRequired: true },
      { name: 'Current Capacity', type: 'text', description: 'Current capacity level', isRequired: false },
      { name: 'Required Capacity', type: 'text', description: 'Needed capacity level', isRequired: false },
      { name: 'Capacity Gap', type: 'text', description: 'Shortfall or excess', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Demand Forecasting',
          description: 'Analyze demand requirements',
          tasks: [
            { title: 'Gather historical demand data', description: 'Collect past demand information.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['data'] },
            { title: 'Analyze demand trends', description: 'Identify patterns and trends.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['analysis'] },
            { title: 'Create demand forecast', description: 'Project future demand.', assigneeRole: 'lead', dueOffset: 10, priority: 'high', labels: ['forecast'] },
            { title: 'Validate with stakeholders', description: 'Confirm forecast accuracy.', assigneeRole: 'lead', dueOffset: 14, priority: 'medium', labels: ['validation'] },
          ],
        },
        {
          name: 'Capacity Assessment',
          description: 'Evaluate current capacity',
          tasks: [
            { title: 'Document current capacity', description: 'Measure existing capacity.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['assessment'] },
            { title: 'Identify capacity constraints', description: 'Find bottleneck resources.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['constraints'] },
            { title: 'Calculate capacity utilization', description: 'Determine utilization rates.', assigneeRole: 'member', dueOffset: 24, priority: 'high', labels: ['metrics'] },
          ],
        },
        {
          name: 'Gap Analysis and Planning',
          description: 'Identify gaps and plan solutions',
          tasks: [
            { title: 'Calculate capacity gaps', description: 'Compare demand vs capacity.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['gap-analysis'] },
            { title: 'Develop capacity options', description: 'Identify ways to address gaps.', assigneeRole: 'lead', dueOffset: 32, priority: 'high', labels: ['planning'] },
            { title: 'Evaluate investment requirements', description: 'Assess costs of capacity changes.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['financial'] },
            { title: 'Create capacity plan', description: 'Finalize capacity strategy.', assigneeRole: 'lead', dueOffset: 40, priority: 'high', labels: ['planning'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 19. RESOURCE ALLOCATION ====================
  {
    name: 'Resource Allocation',
    slug: 'resource-allocation',
    description:
      'Optimize the allocation of resources across projects and operations for maximum efficiency.',
    category: 'operations',
    icon: 'Users',
    color: '#0891B2',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'assessment', name: 'Assessment', order: 0, color: '#6B7280' },
      { id: 'planning', name: 'Planning', order: 1, color: '#3B82F6' },
      { id: 'allocation', name: 'Allocation', order: 2, color: '#F59E0B' },
      { id: 'monitoring', name: 'Monitoring', order: 3, color: '#8B5CF6' },
      { id: 'optimized', name: 'Optimized', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Resource Type', type: 'select', description: 'Type of resource', options: ['Personnel', 'Equipment', 'Budget', 'Space', 'Materials'], isRequired: true },
      { name: 'Available Capacity', type: 'text', description: 'Total available resources', isRequired: false },
      { name: 'Allocated', type: 'text', description: 'Resources allocated', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Resource Assessment',
          description: 'Assess resource needs and availability',
          tasks: [
            { title: 'Inventory available resources', description: 'Document all available resources.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['inventory'] },
            { title: 'Gather resource requirements', description: 'Collect needs from all projects.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['requirements'] },
            { title: 'Identify resource conflicts', description: 'Find competing demands.', assigneeRole: 'lead', dueOffset: 10, priority: 'high', labels: ['conflicts'] },
          ],
        },
        {
          name: 'Allocation Planning',
          description: 'Plan resource allocation',
          tasks: [
            { title: 'Prioritize resource requests', description: 'Rank requests by priority.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['prioritization'] },
            { title: 'Create allocation matrix', description: 'Map resources to projects.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['planning'] },
            { title: 'Resolve resource conflicts', description: 'Address competing demands.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['resolution'] },
            { title: 'Get management approval', description: 'Approve allocation plan.', assigneeRole: 'lead', dueOffset: 25, priority: 'high', labels: ['approval'] },
          ],
        },
        {
          name: 'Implementation and Monitoring',
          description: 'Execute and track allocations',
          tasks: [
            { title: 'Communicate allocations', description: 'Inform teams of resource assignments.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['communication'] },
            { title: 'Track resource utilization', description: 'Monitor actual vs planned usage.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['tracking'] },
            { title: 'Adjust allocations as needed', description: 'Rebalance based on changes.', assigneeRole: 'lead', dueOffset: 45, priority: 'medium', labels: ['adjustment'] },
            { title: 'Report on resource efficiency', description: 'Analyze allocation effectiveness.', assigneeRole: 'lead', dueOffset: 55, priority: 'medium', labels: ['reporting'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'table', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 20. SCHEDULING OPTIMIZATION ====================
  {
    name: 'Scheduling Optimization',
    slug: 'scheduling-optimization',
    description:
      'Optimize production or service schedules to maximize throughput and minimize delays.',
    category: 'operations',
    icon: 'Calendar',
    color: '#059669',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'analysis', name: 'Analysis', order: 0, color: '#6B7280' },
      { id: 'design', name: 'Design', order: 1, color: '#3B82F6' },
      { id: 'implementation', name: 'Implementation', order: 2, color: '#F59E0B' },
      { id: 'monitoring', name: 'Monitoring', order: 3, color: '#8B5CF6' },
      { id: 'optimized', name: 'Optimized', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Schedule Type', type: 'select', description: 'Type of schedule', options: ['Production', 'Workforce', 'Delivery', 'Maintenance', 'Project'], isRequired: true },
      { name: 'Current Efficiency', type: 'number', description: 'Current schedule efficiency %', isRequired: false },
      { name: 'Target Efficiency', type: 'number', description: 'Target schedule efficiency %', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Current Schedule Analysis',
          description: 'Analyze existing scheduling',
          tasks: [
            { title: 'Document current scheduling process', description: 'Map how schedules are created.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['analysis'] },
            { title: 'Identify scheduling constraints', description: 'Find limitations and rules.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['constraints'] },
            { title: 'Measure schedule performance', description: 'Calculate on-time performance.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['metrics'] },
            { title: 'Identify improvement opportunities', description: 'Find scheduling inefficiencies.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['opportunities'] },
          ],
        },
        {
          name: 'Schedule Design',
          description: 'Design optimized schedule',
          tasks: [
            { title: 'Define scheduling rules', description: 'Establish scheduling criteria.', assigneeRole: 'lead', dueOffset: 17, priority: 'high', labels: ['rules'] },
            { title: 'Evaluate scheduling tools', description: 'Assess software options.', assigneeRole: 'member', dueOffset: 21, priority: 'medium', labels: ['tools'] },
            { title: 'Design optimized schedule', description: 'Create improved scheduling approach.', assigneeRole: 'lead', dueOffset: 28, priority: 'high', labels: ['design'] },
          ],
        },
        {
          name: 'Implementation',
          description: 'Roll out new scheduling',
          tasks: [
            { title: 'Train schedulers', description: 'Educate team on new approach.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['training'] },
            { title: 'Pilot new schedule', description: 'Test in limited area.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['pilot'] },
            { title: 'Roll out organization-wide', description: 'Expand to all areas.', assigneeRole: 'lead', dueOffset: 55, priority: 'high', labels: ['rollout'] },
            { title: 'Monitor and adjust', description: 'Track performance and refine.', assigneeRole: 'lead', dueOffset: 70, priority: 'high', labels: ['monitoring'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 21. SUPPLY CHAIN OPTIMIZATION ====================
  {
    name: 'Supply Chain Optimization',
    slug: 'supply-chain-optimization',
    description:
      'Optimize end-to-end supply chain operations to reduce costs and improve service levels.',
    category: 'operations',
    icon: 'GitBranch',
    color: '#2563EB',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'assessment', name: 'Assessment', order: 0, color: '#6B7280' },
      { id: 'analysis', name: 'Analysis', order: 1, color: '#3B82F6' },
      { id: 'design', name: 'Design', order: 2, color: '#F59E0B' },
      { id: 'implementation', name: 'Implementation', order: 3, color: '#8B5CF6' },
      { id: 'optimized', name: 'Optimized', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Supply Chain Segment', type: 'select', description: 'Area of focus', options: ['Procurement', 'Manufacturing', 'Logistics', 'Distribution', 'End-to-End'], isRequired: true },
      { name: 'Cost Reduction Target', type: 'number', description: 'Target cost reduction %', isRequired: false },
      { name: 'Lead Time Target', type: 'text', description: 'Target lead time improvement', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Supply Chain Assessment',
          description: 'Assess current supply chain',
          tasks: [
            { title: 'Map end-to-end supply chain', description: 'Document entire supply chain flow.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['mapping'] },
            { title: 'Identify supply chain costs', description: 'Break down cost components.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['costs'] },
            { title: 'Measure lead times', description: 'Document cycle times throughout.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['metrics'] },
            { title: 'Assess supplier performance', description: 'Evaluate vendor reliability.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['suppliers'] },
          ],
        },
        {
          name: 'Optimization Analysis',
          description: 'Identify optimization opportunities',
          tasks: [
            { title: 'Identify bottlenecks', description: 'Find constraints in supply chain.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['analysis'] },
            { title: 'Analyze inventory levels', description: 'Optimize inventory positioning.', assigneeRole: 'member', dueOffset: 21, priority: 'high', labels: ['inventory'] },
            { title: 'Evaluate logistics network', description: 'Assess distribution efficiency.', assigneeRole: 'member', dueOffset: 25, priority: 'high', labels: ['logistics'] },
            { title: 'Benchmark against best practices', description: 'Compare to industry standards.', assigneeRole: 'lead', dueOffset: 30, priority: 'medium', labels: ['benchmarking'] },
          ],
        },
        {
          name: 'Implementation',
          description: 'Implement optimizations',
          tasks: [
            { title: 'Develop optimization roadmap', description: 'Plan implementation sequence.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['planning'] },
            { title: 'Implement quick wins', description: 'Execute immediate improvements.', assigneeRole: 'member', dueOffset: 45, priority: 'high', labels: ['implementation'] },
            { title: 'Deploy long-term changes', description: 'Implement structural changes.', assigneeRole: 'lead', dueOffset: 70, priority: 'high', labels: ['implementation'] },
            { title: 'Measure and report results', description: 'Track optimization benefits.', assigneeRole: 'lead', dueOffset: 90, priority: 'high', labels: ['reporting'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 22. SUPPLIER EVALUATION ====================
  {
    name: 'Supplier Evaluation',
    slug: 'supplier-evaluation',
    description:
      'Evaluate and qualify suppliers to ensure they meet quality, delivery, and cost requirements.',
    category: 'operations',
    icon: 'ClipboardCheck',
    color: '#7C3AED',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'identification', name: 'Identification', order: 0, color: '#6B7280' },
      { id: 'evaluation', name: 'Evaluation', order: 1, color: '#3B82F6' },
      { id: 'qualification', name: 'Qualification', order: 2, color: '#F59E0B' },
      { id: 'approved', name: 'Approved', order: 3, color: '#10B981' },
      { id: 'rejected', name: 'Rejected', order: 4, color: '#EF4444' },
    ],
    customFields: [
      { name: 'Supplier Name', type: 'text', description: 'Supplier being evaluated', isRequired: true },
      { name: 'Category', type: 'text', description: 'Product/service category', isRequired: false },
      { name: 'Overall Score', type: 'number', description: 'Evaluation score', isRequired: false },
      { name: 'Risk Level', type: 'select', description: 'Supplier risk rating', options: ['Low', 'Medium', 'High', 'Critical'], isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Supplier Identification',
          description: 'Identify potential suppliers',
          tasks: [
            { title: 'Define supplier requirements', description: 'Document what is needed from supplier.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['requirements'] },
            { title: 'Research potential suppliers', description: 'Identify candidate suppliers.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['research'] },
            { title: 'Request supplier information', description: 'Send RFI to candidates.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['rfi'] },
          ],
        },
        {
          name: 'Supplier Evaluation',
          description: 'Evaluate supplier capabilities',
          tasks: [
            { title: 'Review supplier documentation', description: 'Assess submitted information.', assigneeRole: 'member', dueOffset: 17, priority: 'high', labels: ['review'] },
            { title: 'Conduct supplier audit', description: 'Visit and audit supplier facility.', assigneeRole: 'lead', dueOffset: 24, priority: 'high', labels: ['audit'] },
            { title: 'Evaluate quality capability', description: 'Assess quality systems.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['quality'] },
            { title: 'Assess financial stability', description: 'Review supplier financials.', assigneeRole: 'lead', dueOffset: 30, priority: 'high', labels: ['financial'] },
          ],
        },
        {
          name: 'Qualification',
          description: 'Qualify and approve suppliers',
          tasks: [
            { title: 'Complete evaluation scorecard', description: 'Score supplier on all criteria.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['scoring'] },
            { title: 'Conduct sample testing', description: 'Test supplier samples.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['testing'] },
            { title: 'Make qualification decision', description: 'Approve or reject supplier.', assigneeRole: 'lead', dueOffset: 45, priority: 'high', labels: ['decision'] },
            { title: 'Add to approved supplier list', description: 'Update supplier database.', assigneeRole: 'member', dueOffset: 47, priority: 'medium', labels: ['documentation'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 23. PROCUREMENT PROCESS ====================
  {
    name: 'Procurement Process',
    slug: 'procurement-process',
    description:
      'Manage the procurement process from requisition to purchase order and receipt.',
    category: 'operations',
    icon: 'ShoppingCart',
    color: '#0D9488',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'requisition', name: 'Requisition', order: 0, color: '#6B7280' },
      { id: 'sourcing', name: 'Sourcing', order: 1, color: '#3B82F6' },
      { id: 'negotiation', name: 'Negotiation', order: 2, color: '#F59E0B' },
      { id: 'ordering', name: 'Ordering', order: 3, color: '#8B5CF6' },
      { id: 'received', name: 'Received', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'PR Number', type: 'text', description: 'Purchase requisition number', isRequired: true },
      { name: 'Requestor', type: 'text', description: 'Person requesting', isRequired: false },
      { name: 'Budget Amount', type: 'number', description: 'Approved budget', isRequired: false },
      { name: 'PO Number', type: 'text', description: 'Purchase order number', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Process Setup',
          description: 'Establish procurement procedures',
          tasks: [
            { title: 'Define procurement policies', description: 'Document procurement rules.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['policy'] },
            { title: 'Set approval thresholds', description: 'Establish spending limits.', assigneeRole: 'lead', dueOffset: 3, priority: 'high', labels: ['approvals'] },
            { title: 'Create PR template', description: 'Develop requisition form.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['templates'] },
            { title: 'Train requestors', description: 'Educate on procurement process.', assigneeRole: 'lead', dueOffset: 10, priority: 'high', labels: ['training'] },
          ],
        },
        {
          name: 'Sourcing Process',
          description: 'Manage supplier selection',
          tasks: [
            { title: 'Create RFQ process', description: 'Establish quote request procedure.', assigneeRole: 'member', dueOffset: 14, priority: 'high', labels: ['rfq'] },
            { title: 'Define supplier selection criteria', description: 'Set evaluation factors.', assigneeRole: 'lead', dueOffset: 17, priority: 'high', labels: ['criteria'] },
            { title: 'Develop negotiation guidelines', description: 'Create negotiation protocols.', assigneeRole: 'lead', dueOffset: 21, priority: 'medium', labels: ['negotiation'] },
          ],
        },
        {
          name: 'Order Management',
          description: 'Manage purchase orders',
          tasks: [
            { title: 'Create PO template', description: 'Develop purchase order form.', assigneeRole: 'member', dueOffset: 24, priority: 'high', labels: ['templates'] },
            { title: 'Set up order tracking', description: 'Establish tracking process.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['tracking'] },
            { title: 'Define receiving process', description: 'Document goods receipt procedure.', assigneeRole: 'member', dueOffset: 32, priority: 'high', labels: ['receiving'] },
            { title: 'Establish invoice matching', description: 'Set up 3-way match process.', assigneeRole: 'lead', dueOffset: 35, priority: 'high', labels: ['invoicing'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 24. SHIPPING OPTIMIZATION ====================
  {
    name: 'Shipping Optimization',
    slug: 'shipping-optimization',
    description:
      'Optimize shipping operations to reduce costs and improve delivery performance.',
    category: 'operations',
    icon: 'Truck',
    color: '#EA580C',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'analysis', name: 'Analysis', order: 0, color: '#6B7280' },
      { id: 'planning', name: 'Planning', order: 1, color: '#3B82F6' },
      { id: 'implementation', name: 'Implementation', order: 2, color: '#F59E0B' },
      { id: 'monitoring', name: 'Monitoring', order: 3, color: '#8B5CF6' },
      { id: 'optimized', name: 'Optimized', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Shipping Region', type: 'text', description: 'Geographic area', isRequired: false },
      { name: 'Current Cost/Shipment', type: 'number', description: 'Average shipping cost', isRequired: false },
      { name: 'Target Cost/Shipment', type: 'number', description: 'Target shipping cost', isRequired: false },
      { name: 'On-Time Delivery %', type: 'number', description: 'Current OTD rate', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Shipping Analysis',
          description: 'Analyze current shipping operations',
          tasks: [
            { title: 'Analyze shipping volumes', description: 'Review shipment patterns.', assigneeRole: 'member', dueOffset: 0, priority: 'high', labels: ['analysis'] },
            { title: 'Review carrier performance', description: 'Assess carrier reliability.', assigneeRole: 'member', dueOffset: 5, priority: 'high', labels: ['carriers'] },
            { title: 'Analyze shipping costs', description: 'Break down cost components.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['costs'] },
            { title: 'Identify optimization opportunities', description: 'Find areas for improvement.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['opportunities'] },
          ],
        },
        {
          name: 'Optimization Planning',
          description: 'Plan shipping improvements',
          tasks: [
            { title: 'Negotiate carrier rates', description: 'Renegotiate shipping contracts.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['negotiation'] },
            { title: 'Optimize packaging', description: 'Reduce dimensional weight.', assigneeRole: 'member', dueOffset: 25, priority: 'medium', labels: ['packaging'] },
            { title: 'Consolidate shipments', description: 'Plan shipment consolidation.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['consolidation'] },
            { title: 'Evaluate shipping software', description: 'Assess TMS options.', assigneeRole: 'lead', dueOffset: 32, priority: 'medium', labels: ['technology'] },
          ],
        },
        {
          name: 'Implementation',
          description: 'Execute shipping optimizations',
          tasks: [
            { title: 'Implement carrier changes', description: 'Transition to optimized carriers.', assigneeRole: 'member', dueOffset: 40, priority: 'high', labels: ['implementation'] },
            { title: 'Deploy shipping software', description: 'Implement TMS solution.', assigneeRole: 'lead', dueOffset: 55, priority: 'high', labels: ['technology'] },
            { title: 'Train shipping team', description: 'Educate on new processes.', assigneeRole: 'member', dueOffset: 60, priority: 'high', labels: ['training'] },
            { title: 'Monitor performance', description: 'Track shipping KPIs.', assigneeRole: 'lead', dueOffset: 75, priority: 'high', labels: ['monitoring'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },

  // ==================== 25. WAREHOUSE MANAGEMENT ====================
  {
    name: 'Warehouse Management',
    slug: 'warehouse-management',
    description:
      'Optimize warehouse operations including receiving, storage, picking, and shipping.',
    category: 'operations',
    icon: 'Box',
    color: '#78716C',
    projectType: 'kanban',
    isFeatured: false,
    kanbanStages: [
      { id: 'planning', name: 'Planning', order: 0, color: '#6B7280' },
      { id: 'implementation', name: 'Implementation', order: 1, color: '#3B82F6' },
      { id: 'optimization', name: 'Optimization', order: 2, color: '#F59E0B' },
      { id: 'monitoring', name: 'Monitoring', order: 3, color: '#8B5CF6' },
      { id: 'completed', name: 'Completed', order: 4, color: '#10B981' },
    ],
    customFields: [
      { name: 'Warehouse Location', type: 'text', description: 'Facility location', isRequired: true },
      { name: 'Square Footage', type: 'number', description: 'Warehouse size', isRequired: false },
      { name: 'SKU Count', type: 'number', description: 'Number of SKUs managed', isRequired: false },
    ],
    structure: {
      sections: [
        {
          name: 'Warehouse Setup',
          description: 'Set up warehouse operations',
          tasks: [
            { title: 'Design warehouse layout', description: 'Plan storage zones and flow.', assigneeRole: 'lead', dueOffset: 0, priority: 'high', labels: ['layout'] },
            { title: 'Define location system', description: 'Create bin/location structure.', assigneeRole: 'member', dueOffset: 7, priority: 'high', labels: ['locations'] },
            { title: 'Set up receiving process', description: 'Document receiving procedures.', assigneeRole: 'member', dueOffset: 10, priority: 'high', labels: ['receiving'] },
            { title: 'Establish picking methods', description: 'Define picking strategies.', assigneeRole: 'lead', dueOffset: 14, priority: 'high', labels: ['picking'] },
          ],
        },
        {
          name: 'Technology Implementation',
          description: 'Deploy warehouse technology',
          tasks: [
            { title: 'Evaluate WMS options', description: 'Assess warehouse management systems.', assigneeRole: 'lead', dueOffset: 21, priority: 'high', labels: ['wms'] },
            { title: 'Implement barcode scanning', description: 'Deploy scanning technology.', assigneeRole: 'member', dueOffset: 28, priority: 'high', labels: ['technology'] },
            { title: 'Set up inventory tracking', description: 'Enable real-time inventory.', assigneeRole: 'member', dueOffset: 35, priority: 'high', labels: ['inventory'] },
          ],
        },
        {
          name: 'Operations Optimization',
          description: 'Optimize warehouse operations',
          tasks: [
            { title: 'Optimize product slotting', description: 'Place fast movers optimally.', assigneeRole: 'member', dueOffset: 42, priority: 'high', labels: ['slotting'] },
            { title: 'Implement cycle counting', description: 'Establish count program.', assigneeRole: 'lead', dueOffset: 49, priority: 'high', labels: ['counting'] },
            { title: 'Train warehouse staff', description: 'Educate on procedures.', assigneeRole: 'lead', dueOffset: 55, priority: 'high', labels: ['training'] },
            { title: 'Establish KPIs', description: 'Define performance metrics.', assigneeRole: 'lead', dueOffset: 60, priority: 'high', labels: ['metrics'] },
          ],
        },
      ],
    },
    settings: { defaultView: 'kanban', enableTimeTracking: true, enableStoryPoints: false },
  },
];
