import { Controller, Get, Query, UseGuards, Param, Delete, Body, Post, Put, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { SearchService } from './search.service';
import { SemanticSearchService, IndexableContentType } from './semantic-search.service';
import { ContentIndexerService } from './content-indexer.service';
import { SearchProviderService } from '../search-provider/search-provider.service';
import {
  SearchQueryDto,
  GetRecentSearchesDto,
  ClearSearchHistoryDto,
  SearchHistoryResponseDto,
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
  ShareSavedSearchDto,
  SavedSearchResponseDto
} from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('search')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/search')
@UseGuards(AuthGuard, WorkspaceGuard)
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly semanticSearchService: SemanticSearchService,
    private readonly contentIndexerService: ContentIndexerService,
    private readonly searchProviderService: SearchProviderService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Universal search across all content types' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Param('workspaceId') workspaceId: string,
    @Query() searchParams: SearchQueryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.searchService.universalSearch(workspaceId, searchParams, userId);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Search suggestions' })
  async getSuggestions(
    @Param('workspaceId') workspaceId: string,
    @Query('q') query: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.searchService.getSearchSuggestions(workspaceId, query, userId);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent search history for the current user' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Recent search history',
    type: [SearchHistoryResponseDto]
  })
  async getRecentSearches(
    @Param('workspaceId') workspaceId: string,
    @Query() dto: GetRecentSearchesDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.searchService.getRecentSearches(workspaceId, userId, dto.limit);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular searches across the workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Popular search queries' })
  async getPopularSearches(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.getPopularSearches(workspaceId, limit || 10);
  }

  @Delete('recent')
  @ApiOperation({ summary: 'Clear search history' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Search history cleared' })
  async clearSearchHistory(
    @Param('workspaceId') workspaceId: string,
    @Query() dto: ClearSearchHistoryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.searchService.clearSearchHistory(workspaceId, userId, dto.query);
  }

  // ==================== SAVED SEARCHES ENDPOINTS ====================

  @Post('saved')
  @ApiOperation({ summary: 'Save a search with results' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 201,
    description: 'Search saved successfully',
    type: SavedSearchResponseDto
  })
  async createSavedSearch(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateSavedSearchDto,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    // Use raw request body to preserve resultsSnapshot
    const data = {
      ...dto,
      resultsSnapshot: (req.body as any).resultsSnapshot || dto.resultsSnapshot
    };
    return this.searchService.createSavedSearch(workspaceId, userId, data);
  }

  @Get('saved')
  @ApiOperation({ summary: 'Get all saved searches for the current user' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'List of saved searches',
    type: [SavedSearchResponseDto]
  })
  async getSavedSearches(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.searchService.getSavedSearches(workspaceId, userId);
  }

  @Get('saved/shared')
  @ApiOperation({ summary: 'Get saved searches shared with the current user' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'List of shared saved searches',
    type: [SavedSearchResponseDto]
  })
  async getSharedSavedSearches(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.searchService.getSharedSavedSearches(workspaceId, userId);
  }

  @Get('saved/:searchId')
  @ApiOperation({ summary: 'Get a specific saved search by ID' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'searchId', description: 'Saved search ID' })
  @ApiResponse({
    status: 200,
    description: 'Saved search details',
    type: SavedSearchResponseDto
  })
  async getSavedSearchById(
    @Param('workspaceId') workspaceId: string,
    @Param('searchId') searchId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.searchService.getSavedSearchById(workspaceId, userId, searchId);
  }

  @Put('saved/:searchId')
  @ApiOperation({ summary: 'Update a saved search' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'searchId', description: 'Saved search ID' })
  @ApiResponse({ status: 200, description: 'Saved search updated successfully' })
  async updateSavedSearch(
    @Param('workspaceId') workspaceId: string,
    @Param('searchId') searchId: string,
    @Body() dto: UpdateSavedSearchDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.searchService.updateSavedSearch(workspaceId, userId, searchId, dto);
  }

  @Delete('saved/:searchId')
  @ApiOperation({ summary: 'Delete a saved search' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'searchId', description: 'Saved search ID' })
  @ApiResponse({ status: 200, description: 'Saved search deleted successfully' })
  async deleteSavedSearch(
    @Param('workspaceId') workspaceId: string,
    @Param('searchId') searchId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.searchService.deleteSavedSearch(workspaceId, userId, searchId);
  }

  @Post('saved/:searchId/share')
  @ApiOperation({ summary: 'Share a saved search with other users' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'searchId', description: 'Saved search ID' })
  @ApiResponse({ status: 200, description: 'Saved search shared successfully' })
  async shareSavedSearch(
    @Param('workspaceId') workspaceId: string,
    @Param('searchId') searchId: string,
    @Body() dto: ShareSavedSearchDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.searchService.shareSavedSearch(workspaceId, userId, searchId, dto.userIds);
  }

  // ==================== SEMANTIC SEARCH ENDPOINTS ====================

  @Get('semantic')
  @ApiOperation({ summary: 'Semantic search using AI embeddings' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({ name: 'types', description: 'Content types to search (comma-separated: note,message,file,task,meeting_transcript)', required: false })
  @ApiQuery({ name: 'limit', description: 'Max results', required: false })
  @ApiQuery({ name: 'minScore', description: 'Minimum similarity score (0-1)', required: false })
  @ApiResponse({ status: 200, description: 'Semantic search results' })
  async semanticSearch(
    @Param('workspaceId') workspaceId: string,
    @Query('q') query: string,
    @Query('types') types?: string,
    @Query('limit') limit?: number,
    @Query('minScore') minScore?: number,
    @CurrentUser('sub') userId?: string,
  ) {
    const contentTypes = types
      ? (types.split(',') as IndexableContentType[])
      : undefined;

    return this.semanticSearchService.search(query, workspaceId, {
      contentTypes,
      limit: limit || 20,
      minScore: minScore || 0.5,
      userId,
    });
  }

  @Get('semantic/similar/:contentType/:contentId')
  @ApiOperation({ summary: 'Find similar content using AI embeddings' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'contentType', description: 'Content type (note, message, file, task, meeting_transcript)' })
  @ApiParam({ name: 'contentId', description: 'Content ID to find similar items for' })
  @ApiQuery({ name: 'limit', description: 'Max results', required: false })
  @ApiResponse({ status: 200, description: 'Similar content results' })
  async findSimilar(
    @Param('workspaceId') workspaceId: string,
    @Param('contentType') contentType: IndexableContentType,
    @Param('contentId') contentId: string,
    @Query('limit') limit?: number,
  ) {
    return this.semanticSearchService.findSimilar(
      contentType,
      contentId,
      workspaceId,
      limit || 5,
    );
  }

  @Get('semantic/stats')
  @ApiOperation({ summary: 'Get semantic search index statistics' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Index statistics' })
  async getSemanticStats(@Param('workspaceId') workspaceId: string) {
    const isReady = this.semanticSearchService.isReady();
    const stats = await this.semanticSearchService.getIndexStats(workspaceId);

    return {
      enabled: isReady,
      ...stats,
    };
  }

  @Post('semantic/index')
  @ApiOperation({ summary: 'Index content for semantic search' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Content indexed successfully' })
  async indexContent(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: {
      contentType: IndexableContentType;
      contentId: string;
      title?: string;
      content: string;
      metadata?: Record<string, any>;
    },
  ) {
    const vectorId = await this.semanticSearchService.indexContent({
      content_type: dto.contentType,
      content_id: dto.contentId,
      workspace_id: workspaceId,
      title: dto.title,
      content: dto.content,
      metadata: dto.metadata,
    });

    return {
      success: !!vectorId,
      vectorId,
    };
  }

  @Delete('semantic/index/:contentType/:contentId')
  @ApiOperation({ summary: 'Remove content from semantic index' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'contentType', description: 'Content type' })
  @ApiParam({ name: 'contentId', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Content removed from index' })
  async removeFromIndex(
    @Param('contentType') contentType: IndexableContentType,
    @Param('contentId') contentId: string,
  ) {
    const success = await this.semanticSearchService.removeContent(
      contentType,
      contentId,
    );

    return { success };
  }

  @Post('semantic/index-workspace')
  @ApiOperation({ summary: 'Index all content in workspace for semantic search (admin operation)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workspace indexing complete' })
  async indexWorkspace(@Param('workspaceId') workspaceId: string) {
    const stats = await this.contentIndexerService.indexWorkspace(workspaceId);
    return {
      success: true,
      message: 'Workspace indexing complete',
      indexed: stats,
    };
  }
}