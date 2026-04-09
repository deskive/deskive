import 'package:flutter/material.dart';
import 'note_editor_screen.dart';
import 'notes_screen.dart';

class TemplatesScreen extends StatefulWidget {
  const TemplatesScreen({super.key});

  @override
  State<TemplatesScreen> createState() => _TemplatesScreenState();
}

class _TemplatesScreenState extends State<TemplatesScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  final List<TemplateCategory> _templateCategories = [
    TemplateCategory(
      title: 'Task Templates',
      icon: Icons.task_alt,
      color: Colors.green,
      templates: [
        Template(
          title: 'Task List',
          description: 'Simple task list with checkboxes and priorities',
          icon: '✅',
          blocks: 7,
          tags: ['task', 'todo', 'checklist'],
          content: '''# Task List

## High Priority
- [ ] Task 1
- [ ] Task 2

## Medium Priority
- [ ] Task 3
- [ ] Task 4

## Low Priority
- [ ] Task 5
- [ ] Task 6

## Notes
Add any additional notes here...''',
        ),
        Template(
          title: 'Project Tasks',
          description: 'Task breakdown for project management',
          icon: '📋',
          blocks: 7,
          tags: ['task', 'project', 'management'],
          content: '''# Project Tasks

## Project Overview
**Project Name:** [Enter project name]
**Due Date:** [Enter due date]
**Team Members:** [List team members]

## Tasks Breakdown

### Phase 1: Planning
- [ ] Define requirements
- [ ] Create timeline
- [ ] Assign responsibilities

### Phase 2: Development
- [ ] Setup development environment
- [ ] Implement core features
- [ ] Testing and debugging

### Phase 3: Deployment
- [ ] Final testing
- [ ] Deploy to production
- [ ] Documentation

## Notes
[Add project notes and updates here]''',
        ),
      ],
    ),
    TemplateCategory(
      title: 'General Templates',
      icon: Icons.description,
      color: Colors.blue,
      templates: [
        Template(
          title: 'Meeting Notes',
          description: 'Template for taking meeting notes with agenda and action items',
          icon: '🤝',
          blocks: 7,
          tags: ['meeting', 'agenda', 'notes'],
          content: '''# Meeting Notes

**Date:** [Meeting date]
**Time:** [Meeting time]
**Attendees:** [List attendees]
**Meeting Type:** [Type of meeting]

## Agenda
1. [Agenda item 1]
2. [Agenda item 2]
3. [Agenda item 3]

## Discussion Points
- [Discussion point 1]
- [Discussion point 2]
- [Discussion point 3]

## Action Items
- [ ] [Action item 1] - Assigned to: [Name] - Due: [Date]
- [ ] [Action item 2] - Assigned to: [Name] - Due: [Date]
- [ ] [Action item 3] - Assigned to: [Name] - Due: [Date]

## Next Meeting
**Date:** [Next meeting date]
**Focus:** [Next meeting focus]''',
        ),
        Template(
          title: 'Daily Journal',
          description: 'Simple daily journal template for reflection and planning',
          icon: '📖',
          blocks: 7,
          tags: ['journal', 'daily', 'reflection'],
          content: '''# Daily Journal - [Date]

## Today's Goals
- [Goal 1]
- [Goal 2]
- [Goal 3]

## What Happened Today
[Write about your day here...]

## Accomplishments
- [Accomplishment 1]
- [Accomplishment 2]
- [Accomplishment 3]

## Challenges
- [Challenge 1]
- [Challenge 2]

## Lessons Learned
[What did you learn today?]

## Tomorrow's Priorities
- [Priority 1]
- [Priority 2]
- [Priority 3]

## Gratitude
- [Something you're grateful for]
- [Something else you're grateful for]''',
        ),
      ],
    ),
    TemplateCategory(
      title: 'Brainstorming Templates',
      icon: Icons.lightbulb,
      color: Colors.purple,
      templates: [
        Template(
          title: 'Mind Map',
          description: 'Visual mind mapping template for organizing ideas',
          icon: '🧠',
          blocks: 9,
          tags: ['brainstorming', 'mind-map', 'ideas'],
          content: '''# Mind Map - [Topic]

## Central Topic: [Main idea]

### Branch 1: [Sub-topic 1]
- [Idea 1.1]
- [Idea 1.2]
- [Idea 1.3]

### Branch 2: [Sub-topic 2]
- [Idea 2.1]
- [Idea 2.2]
- [Idea 2.3]

### Branch 3: [Sub-topic 3]
- [Idea 3.1]
- [Idea 3.2]
- [Idea 3.3]

### Branch 4: [Sub-topic 4]
- [Idea 4.1]
- [Idea 4.2]
- [Idea 4.3]

## Connections
- [How ideas connect]
- [Relationships between topics]

## Next Steps
- [Action from brainstorming]
- [Follow-up ideas]''',
        ),
        Template(
          title: 'Idea Collection',
          description: 'Template for collecting and organizing creative ideas',
          icon: '💡',
          blocks: 10,
          tags: ['brainstorming', 'ideas', 'creativity'],
          content: '''# Idea Collection - [Topic/Project]

## Quick Ideas
- [Idea 1]
- [Idea 2]
- [Idea 3]
- [Idea 4]
- [Idea 5]

## Detailed Ideas

### Idea A: [Title]
**Description:** [Detailed description]
**Pros:** [Advantages]
**Cons:** [Disadvantages]
**Resources needed:** [What's required]

### Idea B: [Title]
**Description:** [Detailed description]
**Pros:** [Advantages]
**Cons:** [Disadvantages]
**Resources needed:** [What's required]

### Idea C: [Title]
**Description:** [Detailed description]
**Pros:** [Advantages]
**Cons:** [Disadvantages]
**Resources needed:** [What's required]

## Top 3 Ideas
1. [Best idea]
2. [Second best]
3. [Third best]

## Next Steps
- [What to do with these ideas]
- [Research needed]
- [People to talk to]''',
        ),
      ],
    ),
  ];

  List<Template> get _filteredTemplates {
    if (_searchQuery.isEmpty) {
      return _templateCategories.expand((category) => category.templates).toList();
    }
    
    return _templateCategories
        .expand((category) => category.templates)
        .where((template) =>
            template.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
            template.description.toLowerCase().contains(_searchQuery.toLowerCase()) ||
            template.tags.any((tag) => tag.toLowerCase().contains(_searchQuery.toLowerCase())))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        title: const Text(
          'Create Note from Template',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        centerTitle: false,
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Choose a template to quickly create a new note with pre-formatted content',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _searchController,
                  onChanged: (value) {
                    setState(() {
                      _searchQuery = value;
                    });
                  },
                  style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                  decoration: InputDecoration(
                    hintText: 'Search templates by name, description, or tags...',
                    hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                    prefixIcon: Icon(Icons.search, color: Theme.of(context).colorScheme.onSurfaceVariant),
                    filled: true,
                    fillColor: isDarkMode ? const Color(0xFF1E2139) : Theme.of(context).colorScheme.surfaceContainerHighest,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                // Start from Scratch option
                Container(
                  margin: const EdgeInsets.only(bottom: 24),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(5),
                  ),
                  child: InkWell(
                    onTap: () async {
                      // Navigate to create note screen
                      final result = await Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => const NoteEditorScreen(
                            initialMode: NoteEditorMode.create,
                          ),
                        ),
                      );
                      
                      // If a note was created, navigate back to All Notes tab
                      if (result != null && mounted) {
                        // Find the parent widget that contains the TabController
                        final notesScreenState = context.findAncestorStateOfType<NotesScreenState>();
                        if (notesScreenState != null) {
                          notesScreenState.navigateToAllNotesTab(); // Navigate to All Notes tab and refresh
                        }
                      }
                    },
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surfaceContainerHighest,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.add,
                            color: Theme.of(context).colorScheme.onSurface,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Start from Scratch',
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.onSurface,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Create a blank note and build your content from the ground up',
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Row(
                          children: [
                            Icon(Icons.star_border, color: Theme.of(context).colorScheme.onSurfaceVariant, size: 16),
                            const SizedBox(width: 4),
                            Text(
                              'Most flexible',
                              style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 12),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                
                // Template categories
                if (_searchQuery.isEmpty) ...[
                  for (final category in _templateCategories) ...[
                    _buildCategorySection(category),
                    const SizedBox(height: 24),
                  ],
                ] else ...[
                  // Search results
                  if (_filteredTemplates.isNotEmpty) ...[
                    Text(
                      'Search Results',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 16),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                        childAspectRatio: 0.85,
                      ),
                      itemCount: _filteredTemplates.length,
                      itemBuilder: (context, index) {
                        final template = _filteredTemplates[index];
                        return _buildTemplateCard(template, Colors.blue);
                      },
                    ),
                  ] else ...[
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32.0),
                        child: Text(
                          'No templates found matching your search',
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategorySection(TemplateCategory category) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(category.icon, color: category.color, size: 20),
            const SizedBox(width: 8),
            Text(
              category.title,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            Text(
              '${category.templates.length} template${category.templates.length == 1 ? '' : 's'}',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontSize: 12,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 0.85,
          ),
          itemCount: category.templates.length,
          itemBuilder: (context, index) {
            final template = category.templates[index];
            return _buildTemplateCard(template, category.color);
          },
        ),
      ],
    );
  }

  Widget _buildTemplateCard(Template template, Color categoryColor) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    
    return InkWell(
      onTap: () async {
        // Navigate to Note Create Screen with template data
        final result = await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => NoteEditorScreen(
              initialMode: NoteEditorMode.create,
              templateData: {
                'title': template.title,
                'content': template.content,
                'icon': template.icon,
                'description': template.description,
                'tags': template.tags,
              },
            ),
          ),
        );
        
        // If a note was created, navigate back to All Notes tab
        if (result != null && mounted) {
          // Find the parent widget that contains the TabController
          final notesScreenState = context.findAncestorStateOfType<NotesScreenState>();
          if (notesScreenState != null) {
            notesScreenState.navigateToAllNotesTab(); // Navigate to All Notes tab and refresh
          }
        }
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDarkMode ? const Color(0xFF1E2139) : Theme.of(context).colorScheme.surfaceContainer,
          borderRadius: BorderRadius.circular(5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: categoryColor.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(5),
                  ),
                  child: Center(
                    child: Text(
                      template.icon,
                      style: const TextStyle(fontSize: 16),
                    ),
                  ),
                ),
                const Spacer(),
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: categoryColor,
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              template.title,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              template.description,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontSize: 12,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const Spacer(),
            Wrap(
              spacing: 4,
              runSpacing: 4,
              children: template.tags.take(2).map((tag) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  tag,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontSize: 10,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              )).toList(),
            ),
          ],
        ),
      ),
    );
  }

}

class TemplateCategory {
  final String title;
  final IconData icon;
  final Color color;
  final List<Template> templates;

  TemplateCategory({
    required this.title,
    required this.icon,
    required this.color,
    required this.templates,
  });
}

class Template {
  final String title;
  final String description;
  final String icon;
  final int blocks;
  final List<String> tags;
  final String content;

  Template({
    required this.title,
    required this.description,
    required this.icon,
    required this.blocks,
    required this.tags,
    required this.content,
  });
}