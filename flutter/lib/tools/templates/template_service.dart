import 'package:flutter/foundation.dart';
import '../../api/services/template_api_service.dart';
import '../../models/template/project_template.dart';
import '../../models/project.dart';
import '../../config/app_config.dart';
import 'template_constants.dart';

/// Service for managing project templates with caching and state management
class TemplateService extends ChangeNotifier {
  static TemplateService? _instance;
  final TemplateApiService _apiService = TemplateApiService.instance;

  // Pagination constants
  static const int templatesPerPage = 20;

  // Cache
  List<ProjectTemplate> _templates = [];
  List<ProjectTemplate> _featuredTemplates = [];
  Map<String, List<ProjectTemplate>> _templatesByCategory = {};
  Map<String, int> _categoryCounts = {};
  String? _currentWorkspaceId;

  // State
  bool _isLoading = false;
  bool _isLoadingMore = false;
  String? _error;
  String? _selectedCategory;
  String _searchQuery = '';

  // Pagination state
  int _currentPage = 1;
  int _totalPages = 1;
  int _totalTemplates = 0;
  bool _hasMore = false;

  TemplateService._();

  static TemplateService get instance => _instance ??= TemplateService._();

  // Getters
  List<ProjectTemplate> get templates => _templates;
  List<ProjectTemplate> get featuredTemplates => _featuredTemplates;
  Map<String, int> get categoryCounts => _categoryCounts;
  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  String? get error => _error;
  String? get selectedCategory => _selectedCategory;
  String get searchQuery => _searchQuery;

  // Pagination getters
  int get currentPage => _currentPage;
  int get totalPages => _totalPages;
  int get totalTemplates => _totalTemplates;
  bool get hasMore => _hasMore;
  bool get hasPrevious => _currentPage > 1;

  /// Get filtered templates based on current selection
  List<ProjectTemplate> get filteredTemplates {
    var result = _templates;

    // Filter by category
    if (_selectedCategory != null && _selectedCategory!.isNotEmpty) {
      result = result
          .where((t) => t.category.toLowerCase() == _selectedCategory!.toLowerCase())
          .toList();
    }

    // Filter by search
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      result = result.where((t) {
        return t.name.toLowerCase().contains(query) ||
            (t.description?.toLowerCase().contains(query) ?? false) ||
            t.category.toLowerCase().contains(query);
      }).toList();
    }

    return result;
  }

  /// Get categories with updated counts (from API or computed from templates)
  List<TemplateCategory> get categoriesWithCounts {
    // If we have API counts, use them
    if (_categoryCounts.isNotEmpty) {
      return TemplateConstants.categories.map((cat) {
        return cat.copyWith(count: _categoryCounts[cat.id] ?? 0);
      }).toList();
    }

    // Otherwise, compute from loaded templates (fallback)
    final counts = <String, int>{};
    for (final template in _templates) {
      final category = _normalizeCategoryId(template.category);
      counts[category] = (counts[category] ?? 0) + 1;
    }

    return TemplateConstants.categories.map((cat) {
      return cat.copyWith(count: counts[cat.id] ?? 0);
    }).toList();
  }

  /// Load templates with pagination
  Future<void> loadTemplates({bool forceRefresh = false, int? page}) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null || workspaceId.isEmpty) {
      throw Exception('No workspace selected');
    }

    final targetPage = page ?? _currentPage;

    // Return cached data if available and not forcing refresh
    if (!forceRefresh && _templates.isNotEmpty && _currentWorkspaceId == workspaceId && page == null) {
      // Still load category counts if they're empty
      if (_categoryCounts.isEmpty && _selectedCategory == null && _searchQuery.isEmpty) {
        loadCategoryCounts();
      }
      return;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.getTemplatesPaginated(
        workspaceId: workspaceId,
        category: _selectedCategory,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
        page: targetPage,
        limit: templatesPerPage,
      );

      _templates = response.templates;
      _currentPage = response.pagination.page;
      _totalPages = response.pagination.totalPages;
      _totalTemplates = response.pagination.total;
      _hasMore = response.pagination.hasMore;
      _currentWorkspaceId = workspaceId;

      // Load category counts from API (only on first load without filters)
      if (targetPage == 1 && _selectedCategory == null && _searchQuery.isEmpty) {
        loadCategoryCounts();
      }

      // Load featured templates (only on first load)
      if (targetPage == 1) {
        _featuredTemplates = _templates.where((t) => t.isFeatured).toList();
      }

      _isLoading = false;
      _error = null;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  /// Go to next page
  Future<void> nextPage() async {
    if (!_hasMore || _isLoading) return;
    await loadTemplates(page: _currentPage + 1, forceRefresh: true);
  }

  /// Go to previous page
  Future<void> previousPage() async {
    if (_currentPage <= 1 || _isLoading) return;
    await loadTemplates(page: _currentPage - 1, forceRefresh: true);
  }

  /// Go to specific page
  Future<void> goToPage(int page) async {
    if (page < 1 || page > _totalPages || page == _currentPage || _isLoading) return;
    await loadTemplates(page: page, forceRefresh: true);
  }

  /// Reset pagination and reload
  Future<void> resetAndLoad() async {
    _currentPage = 1;
    await loadTemplates(forceRefresh: true);
  }

  /// Load featured templates
  Future<void> loadFeaturedTemplates() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null || workspaceId.isEmpty) {
      return; // Silently return if no workspace
    }

    try {
      _featuredTemplates = await _apiService.getFeaturedTemplates(
        workspaceId: workspaceId,
        limit: 10,
      );
      notifyListeners();
    } catch (e) {
      // Featured templates are optional, don't throw
    }
  }

  /// Set selected category and reset pagination
  void setCategory(String? category) {
    if (_selectedCategory == category) return;
    _selectedCategory = category;
    _currentPage = 1;
    notifyListeners();
    // Reload with new filter
    loadTemplates(forceRefresh: true);
  }

  /// Set search query and reset pagination
  /// If the search query matches a category name, it will filter by that category
  void setSearchQuery(String query) {
    if (_searchQuery == query) return;

    // Check if search query matches a category name
    final matchedCategory = _findMatchingCategory(query);
    if (matchedCategory != null && query.isNotEmpty) {
      // If searching for a category name, filter by category instead
      _searchQuery = '';
      _selectedCategory = matchedCategory;
    } else {
      _searchQuery = query;
      // Only clear category if there's no explicit selection
    }

    _currentPage = 1;
    notifyListeners();
    // Reload with new search
    loadTemplates(forceRefresh: true);
  }

  /// Find a category that matches the search query
  String? _findMatchingCategory(String query) {
    if (query.isEmpty) return null;

    final lowerQuery = query.toLowerCase().trim();
    if (lowerQuery.length < 2) return null; // Don't match very short queries

    // Check against category names and IDs
    for (final cat in TemplateConstants.categories) {
      if (cat.name.toLowerCase().contains(lowerQuery) ||
          cat.id.toLowerCase().contains(lowerQuery)) {
        return cat.id;
      }
    }

    // Also check common abbreviations
    final abbreviations = {
      'dev': 'software_development',
      'software': 'software_development',
      'code': 'software_development',
      'hr': 'hr',
      'people': 'hr',
      'design': 'design',
      'creative': 'design',
      'mkt': 'marketing',
      'market': 'marketing',
      'biz': 'business',
      'ops': 'operations',
      'it': 'it_support',
      'tech': 'it_support',
      'edu': 'education',
      'learn': 'education',
    };

    for (final entry in abbreviations.entries) {
      if (lowerQuery == entry.key || lowerQuery.startsWith(entry.key)) {
        return entry.value;
      }
    }

    return null;
  }

  /// Clear filters
  void clearFilters() {
    _selectedCategory = null;
    _searchQuery = '';
    notifyListeners();
  }

  /// Get template by ID or slug
  Future<ProjectTemplate> getTemplateById(String idOrSlug) async {
    // Check cache first
    try {
      final cached = _templates.firstWhere(
        (t) => t.id == idOrSlug || t.slug == idOrSlug,
      );
      return cached;
    } catch (_) {
      // Not in cache, fetch from API
    }

    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null || workspaceId.isEmpty) {
      throw Exception('No workspace selected');
    }
    return _apiService.getTemplateById(
      workspaceId: workspaceId,
      idOrSlug: idOrSlug,
    );
  }

  /// Create project from template
  Future<Project> createProjectFromTemplate({
    required String templateIdOrSlug,
    required String projectName,
    String? description,
    DateTime? startDate,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null || workspaceId.isEmpty) {
      throw Exception('No workspace selected');
    }

    final project = await _apiService.createProjectFromTemplate(
      workspaceId: workspaceId,
      templateIdOrSlug: templateIdOrSlug,
      projectName: projectName,
      description: description,
      startDate: startDate,
    );

    // Optionally refresh templates to update usage counts
    // await loadTemplates(forceRefresh: true);

    return project;
  }

  /// Search templates
  Future<List<ProjectTemplate>> searchTemplates(String query) async {
    if (query.isEmpty) {
      return filteredTemplates;
    }

    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null || workspaceId.isEmpty) {
      // Fall back to local filtering if no workspace
      _searchQuery = query;
      notifyListeners();
      return filteredTemplates;
    }

    try {
      return await _apiService.searchTemplates(
        workspaceId: workspaceId,
        query: query,
        category: _selectedCategory,
      );
    } catch (e) {
      // Fall back to local filtering
      _searchQuery = query;
      notifyListeners();
      return filteredTemplates;
    }
  }

  /// Load category counts from API
  Future<void> loadCategoryCounts() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null || workspaceId.isEmpty) {
      return;
    }

    try {
      final counts = await _apiService.getTemplateCategories(workspaceId: workspaceId);
      _categoryCounts = counts;
      notifyListeners();
    } catch (e) {
      // Fall back to counting from current page if API fails
      _updateCategoryCountsFromTemplates();
    }
  }

  /// Update category counts from loaded templates (fallback)
  void _updateCategoryCountsFromTemplates() {
    _categoryCounts.clear();
    for (final template in _templates) {
      final category = _normalizeCategoryId(template.category);
      _categoryCounts[category] = (_categoryCounts[category] ?? 0) + 1;
    }
  }

  /// Normalize category string to match TemplateConstants category IDs
  String _normalizeCategoryId(String category) {
    // First try lowercase with spaces replaced by underscores
    String normalized = category.toLowerCase().replaceAll(' ', '_');

    // Handle special cases where display names don't directly map to IDs
    // e.g., 'HR & People' → 'hr', 'Design & Creative' → 'design'
    final mappings = {
      'hr_&_people': 'hr',
      'design_&_creative': 'design',
      'business_&_operations': 'business',
      'events_&_webinars': 'events',
      'research_&_analysis': 'research',
      'personal_&_productivity': 'personal',
      'media_&_entertainment': 'media',
    };

    return mappings[normalized] ?? normalized;
  }

  /// Clear cache
  void clearCache() {
    _templates = [];
    _featuredTemplates = [];
    _templatesByCategory = {};
    _categoryCounts = {};
    _currentWorkspaceId = null;
    _selectedCategory = null;
    _searchQuery = '';
    notifyListeners();
  }

  @override
  void dispose() {
    clearCache();
    super.dispose();
  }
}
