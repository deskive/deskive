export type PostStatus = 'draft' | 'published' | 'archived';
export type BlogType = 'latest' | 'popular' | 'featured' | 'all';

export interface BlogPost {
  id: string;
  userId: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  imageUrls: string[];
  status: PostStatus;
  category?: string;
  tags: string[];
  featured: boolean;
  metaTitle?: string;
  metaDescription?: string;
  author: string;
  rating: number;
  ratingCount: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  userHasLiked?: boolean;
  userRating?: number;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
}

export interface BlogComment {
  id: string;
  postId: string;
  userId: string;
  parentCommentId?: string;
  content: string;
  authorName: string;
  authorEmail?: string;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
  replies?: BlogComment[];
}

export interface CreateBlogPostData {
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  featured?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  imageUrls?: string[];
}

export interface UpdateBlogPostData extends Partial<CreateBlogPostData> {
  status?: PostStatus;
}

export interface CreateCommentData {
  postId: string;
  content: string;
  parentCommentId?: string;
}

export interface BlogQueryParams {
  type?: BlogType;
  category?: string;
  search?: string;
  status?: PostStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedBlogPosts {
  data: BlogPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedComments {
  data: BlogComment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
