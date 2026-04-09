// src/lib/api/blog-api.ts
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';

// Types
export interface PublicBlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  images?: string[];
  publishedAt: string;
  isFeatured?: boolean;
  author: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
  };
  tags: PublicBlogTag[];
  categories: PublicBlogCategory[];
  seoMeta?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogImage?: string;
  };
  readTime: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  ratingCount: number;
  ratingAverage: number;
}

export interface PublicBlogTag {
  id: string;
  name: string;
  slug: string;
  color?: string;
  description?: string;
  postCount: number;
}

export interface PublicBlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  parent?: PublicBlogCategory;
  children?: PublicBlogCategory[];
  postCount: number;
}

export interface BlogComment {
  id: string;
  content: string;
  author: {
    name: string;
    avatar?: string;
    email: string;
  };
  parentId?: string;
  replies?: BlogComment[];
  createdAt: string;
  isApproved: boolean;
}

export interface CreateCommentData {
  content: string;
  authorName: string;
  authorEmail: string;
  parentId?: string;
}

export interface BlogRating {
  id: string;
  postId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  rating: number; // 1-5
  review?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRatingData {
  rating: number;
  review?: string;
  userName?: string;
  userEmail?: string;
}

export interface BlogQuery {
  page?: number;
  limit?: number;
  search?: string;
  categorySlug?: string;
  tagSlug?: string;
  authorId?: string;
  sortBy?: 'publishedAt' | 'viewCount' | 'likeCount' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BlogStats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  popularTags: PublicBlogTag[];
  popularCategories: PublicBlogCategory[];
  recentPosts: PublicBlogPost[];
  featuredPosts: PublicBlogPost[];
}

// Query Keys
export const blogKeys = {
  all: ['blog'] as const,
  posts: () => [...blogKeys.all, 'posts'] as const,
  post: (slug: string) => [...blogKeys.posts(), slug] as const,
  categories: () => [...blogKeys.all, 'categories'] as const,
  tags: () => [...blogKeys.all, 'tags'] as const,
  comments: (postId: string) => [...blogKeys.all, 'comments', postId] as const,
  stats: () => [...blogKeys.all, 'stats'] as const,
  featured: () => [...blogKeys.all, 'featured'] as const,
  recent: () => [...blogKeys.all, 'recent'] as const,
  popular: () => [...blogKeys.all, 'popular'] as const,
};

// API Functions
export const blogApi = {
  async getBlogPosts(query?: BlogQuery): Promise<PaginatedResponse<PublicBlogPost>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);

    const response = await api.get<PaginatedResponse<PublicBlogPost>>(`/public/blog/posts?${params}`, { requireAuth: false });
    return response;
  },

  async getBlogPost(slug: string): Promise<PublicBlogPost> {
    const response = await api.get<PublicBlogPost>(`/public/blog/posts/${slug}`, { requireAuth: false });
    return response;
  },

  async getBlogPostById(postId: string): Promise<PublicBlogPost> {
    const response = await api.get<PublicBlogPost>(`/public/blog/admin/posts/${postId}`);
    return response;
  },

  async createBlogPost(data: {
    title: string;
    content: string;
    excerpt?: string;
    featuredImage?: string;
    categoryIds?: string[];
    tags?: string[];
    seoMetaTitle?: string;
    seoMetaDescription?: string;
    isFeatured?: boolean;
    publish?: boolean;
  }): Promise<PublicBlogPost> {
    return api.post<PublicBlogPost>('/public/blog/admin/posts', data);
  },

  async updateBlogPost(postId: string, data: {
    title?: string;
    content?: string;
    excerpt?: string;
    featuredImage?: string;
    categoryIds?: string[];
    tags?: string[];
    seoMetaTitle?: string;
    seoMetaDescription?: string;
    isFeatured?: boolean;
    status?: string;
  }): Promise<PublicBlogPost> {
    return api.put<PublicBlogPost>(`/public/blog/admin/posts/${postId}`, data);
  },

  async deleteBlogPost(postId: string): Promise<void> {
    await api.delete(`/public/blog/admin/posts/${postId}`);
  },

  async getMyPosts(): Promise<PublicBlogPost[]> {
    const response = await api.get<{ data: PublicBlogPost[] }>('/public/blog/admin/my-posts');
    return response.data;
  },

  async getPostsByAuthor(authorId: string, query?: BlogQuery): Promise<PaginatedResponse<PublicBlogPost>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);
    if (query?.sortBy) params.append('sortBy', query.sortBy);
    if (query?.sortOrder) params.append('sortOrder', query.sortOrder);

    return api.get<PaginatedResponse<PublicBlogPost>>(`/public/blog/author/${authorId}?${params}`, { requireAuth: false });
  },

  async getPostsByCategory(categorySlug: string, query?: BlogQuery): Promise<PaginatedResponse<PublicBlogPost>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);
    if (query?.sortBy) params.append('sortBy', query.sortBy);
    if (query?.sortOrder) params.append('sortOrder', query.sortOrder);

    return api.get<PaginatedResponse<PublicBlogPost>>(`/public/blog/category/${categorySlug}?${params}`, { requireAuth: false });
  },

  async getPostsByTag(tagSlug: string, query?: BlogQuery): Promise<PaginatedResponse<PublicBlogPost>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);
    if (query?.sortBy) params.append('sortBy', query.sortBy);
    if (query?.sortOrder) params.append('sortOrder', query.sortOrder);

    return api.get<PaginatedResponse<PublicBlogPost>>(`/public/blog/tag/${tagSlug}?${params}`, { requireAuth: false });
  },

  async getRelatedPosts(postId: string, limit = 4): Promise<PublicBlogPost[]> {
    const response = await api.get<{ data: PublicBlogPost[] }>(`/public/blog/posts/${postId}/related?limit=${limit}`, { requireAuth: false });
    return response.data;
  },

  async getBlogCategories(): Promise<PublicBlogCategory[]> {
    const response = await api.get<{ data: PublicBlogCategory[] }>('/public/blog/categories', { requireAuth: false });
    return response.data;
  },

  async createCategory(name: string): Promise<PublicBlogCategory> {
    return api.post<PublicBlogCategory>('/public/blog/admin/categories', { name });
  },

  async getBlogTags(): Promise<PublicBlogTag[]> {
    const response = await api.get<{ data: PublicBlogTag[] }>('/public/blog/tags', { requireAuth: false });
    return response.data;
  },

  async uploadBlogImage(file: File): Promise<{ url: string; name: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return api.post<{ url: string; name: string }>('/public/blog/admin/upload-image', formData);
  },

  async getBlogStats(): Promise<BlogStats> {
    return api.get<BlogStats>('/public/blog/stats', { requireAuth: false });
  },

  async getFeaturedPosts(limit = 5): Promise<PublicBlogPost[]> {
    const response = await api.get<{ data: PublicBlogPost[] }>(`/public/blog/posts/featured?limit=${limit}`, { requireAuth: false });
    return response.data;
  },

  async getRecentPosts(limit = 5): Promise<PublicBlogPost[]> {
    const response = await api.get<{ data: PublicBlogPost[] }>(`/public/blog/recent?limit=${limit}`, { requireAuth: false });
    return response.data;
  },

  async getPopularPosts(limit = 5, timeframe: 'week' | 'month' | 'year' | 'all' = 'month'): Promise<PublicBlogPost[]> {
    return api.get<PublicBlogPost[]>(`/public/blog/popular?limit=${limit}&timeframe=${timeframe}`, { requireAuth: false });
  },

  async incrementViewCount(postId: string): Promise<void> {
    await api.post(`/public/blog/posts/${postId}/view`, null, { requireAuth: false });
  },

  async toggleLike(postId: string): Promise<{ liked: boolean; likeCount: number }> {
    return api.post(`/public/blog/posts/${postId}/like`, null, { requireAuth: false, silentAuthFailure: true });
  },

  async getComments(postId: string, page = 1, limit = 20): Promise<PaginatedResponse<BlogComment>> {
    const response = await api.get<{ data: BlogComment[] }>(`/public/blog/posts/${postId}/comments?page=${page}&limit=${limit}`, { requireAuth: false });
    return {
      data: response.data,
      pagination: {
        total: response.data.length,
        page,
        limit,
        totalPages: 1,
      },
    };
  },

  async createComment(postId: string, data: CreateCommentData): Promise<BlogComment> {
    return api.post<BlogComment>(`/public/blog/posts/${postId}/comments`, data, { requireAuth: false, silentAuthFailure: true });
  },

  async subscribeToNewsletter(email: string): Promise<{ message: string }> {
    return api.post('/public/blog/newsletter/subscribe', { email }, { requireAuth: false });
  },

  // Rating methods
  async createRating(postId: string, data: CreateRatingData): Promise<BlogRating> {
    return api.post(`/public/blog/posts/${postId}/ratings`, data, { requireAuth: false, silentAuthFailure: true });
  },

  async getRatings(postId: string): Promise<BlogRating[]> {
    const response = await api.get<{ data: BlogRating[] }>(`/public/blog/posts/${postId}/ratings`, { requireAuth: false });
    return response.data;
  },

  async getUserRating(postId: string): Promise<BlogRating | null> {
    try {
      const result = await api.get<BlogRating>(`/public/blog/posts/${postId}/ratings/me`, { requireAuth: true, silentAuthFailure: true });
      // If result is empty object or has no rating property, return null
      if (!result || typeof result !== 'object' || !('rating' in result) || !result.rating) {
        return null;
      }
      return result;
    } catch (error) {
      return null;
    }
  },

  // Utility methods
  formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', options ?? {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  generateShareUrls(post: { title: string; slug: string }, baseUrl = window.location.origin) {
    const postUrl = `${baseUrl}/blog/${post.slug}`;
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedTitle = encodeURIComponent(post.title);

    return {
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
      copy: postUrl,
    };
  },
};

// React Query Hooks
export const useBlogPosts = (query?: BlogQuery) => {
  return useQuery({
    queryKey: [...blogKeys.posts(), query],
    queryFn: () => blogApi.getBlogPosts(query),
    retry: 1,
  });
};

export const useMyBlogPosts = () => {
  return useQuery({
    queryKey: [...blogKeys.all, 'my-posts'],
    queryFn: () => blogApi.getMyPosts(),
  });
};

export const useCreateBlogPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blogApi.createBlogPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.posts() });
      queryClient.invalidateQueries({ queryKey: [...blogKeys.all, 'my-posts'] });
    },
  });
};

export const useUpdateBlogPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, data }: { postId: string; data: any }) => blogApi.updateBlogPost(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.posts() });
      queryClient.invalidateQueries({ queryKey: [...blogKeys.all, 'my-posts'] });
    },
  });
};

export const useDeleteBlogPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blogApi.deleteBlogPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.posts() });
      queryClient.invalidateQueries({ queryKey: [...blogKeys.all, 'my-posts'] });
    },
  });
};

export const useBlogPost = (slug: string) => {
  return useQuery({
    queryKey: blogKeys.post(slug),
    queryFn: () => blogApi.getBlogPost(slug),
    enabled: !!slug,
  });
};

export const useRelatedPosts = (postId: string, limit = 4) => {
  return useQuery({
    queryKey: [...blogKeys.post(postId), 'related', limit],
    queryFn: () => blogApi.getRelatedPosts(postId, limit),
    enabled: !!postId,
  });
};

export const useBlogCategories = () => {
  return useQuery({
    queryKey: blogKeys.categories(),
    queryFn: blogApi.getBlogCategories,
  });
};

export const useBlogTags = () => {
  return useQuery({
    queryKey: blogKeys.tags(),
    queryFn: blogApi.getBlogTags,
  });
};

export const useBlogStats = () => {
  return useQuery({
    queryKey: blogKeys.stats(),
    queryFn: blogApi.getBlogStats,
  });
};

export const useFeaturedPosts = (limit = 5) => {
  return useQuery({
    queryKey: [...blogKeys.featured(), limit],
    queryFn: () => blogApi.getFeaturedPosts(limit),
  });
};

export const useRecentPosts = (limit = 5) => {
  return useQuery({
    queryKey: [...blogKeys.recent(), limit],
    queryFn: () => blogApi.getRecentPosts(limit),
  });
};

export const usePopularPosts = (limit = 5, timeframe: 'week' | 'month' | 'year' | 'all' = 'month') => {
  return useQuery({
    queryKey: [...blogKeys.popular(), limit, timeframe],
    queryFn: () => blogApi.getPopularPosts(limit, timeframe),
  });
};

export const useIncrementViewCount = () => {
  return useMutation({
    mutationFn: blogApi.incrementViewCount,
  });
};

export const useToggleLike = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: blogApi.toggleLike,
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: blogKeys.post(postId) });
    },
  });
};

export const useBlogComments = (postId: string, page = 1, limit = 20) => {
  return useQuery({
    queryKey: [...blogKeys.comments(postId), page, limit],
    queryFn: () => blogApi.getComments(postId, page, limit),
    enabled: !!postId,
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, data }: { postId: string; data: CreateCommentData }) =>
      blogApi.createComment(postId, data),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: blogKeys.comments(postId) });
      queryClient.invalidateQueries({ queryKey: blogKeys.post(postId) });
    },
  });
};

export const useSubscribeToNewsletter = () => {
  return useMutation({
    mutationFn: blogApi.subscribeToNewsletter,
  });
};

// Rating hooks
export const useBlogRatings = (postId: string) => {
  return useQuery({
    queryKey: [...blogKeys.all, 'ratings', postId],
    queryFn: () => blogApi.getRatings(postId),
    enabled: !!postId,
  });
};

export const useUserRating = (postId: string) => {
  return useQuery({
    queryKey: [...blogKeys.all, 'user-rating', postId],
    queryFn: () => blogApi.getUserRating(postId),
    enabled: !!postId,
  });
};

export const useCreateRating = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, data }: { postId: string; data: CreateRatingData }) =>
      blogApi.createRating(postId, data),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: [...blogKeys.all, 'ratings', postId] });
      queryClient.invalidateQueries({ queryKey: [...blogKeys.all, 'user-rating', postId] });
      queryClient.invalidateQueries({ queryKey: blogKeys.post(postId) });
    },
  });
};

// Backward compatibility: export as blogService
export const blogService = blogApi;
