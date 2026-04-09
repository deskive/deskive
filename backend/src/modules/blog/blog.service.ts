import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateBlogPostDto, UpdateBlogPostDto, CreateCommentDto } from './dto/blog.dto';
import { camelCase } from 'change-case';
import * as sharp from 'sharp';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(private readonly db: DatabaseService) {}

  // Generate slug from title
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Generate a unique slug by checking for duplicates and appending a number if needed
   */
  private async generateUniqueSlug(title: string, excludePostId?: string): Promise<string> {
    const baseSlug = this.generateSlug(title);
    let slug = baseSlug;
    let counter = 1;

    // Keep checking until we find a unique slug
    while (true) {
      const existingResult = await this.db.findMany('blog_posts', { slug });
      const existingPosts = Array.isArray(existingResult.data) ? existingResult.data : [];

      // Filter out the post being updated (if excludePostId is provided)
      const conflicts = excludePostId
        ? existingPosts.filter(p => p.id !== excludePostId)
        : existingPosts;

      if (conflicts.length === 0) {
        // Slug is unique, use it
        return slug;
      }

      // Slug exists, append counter and try again
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
  }

  // Calculate read time from content (words per minute = 200)
  private calculateReadTime(content: string): number {
    const words = content.split(/\s+/).length;
    return Math.ceil(words / 200);
  }

  // Transform to camelCase
  private transformToCamelCase(obj: any): any {
    if (!obj) return obj;
    const transformed: any = {};
    for (const key in obj) {
      transformed[camelCase(key)] = obj[key];
    }
    return transformed;
  }

  // Enrich post with categories, tags, and author
  private async enrichPost(post: any): Promise<any> {
    const enriched = this.transformToCamelCase(post);

    // Get categories
    const categoryResults = await this.db
      .table('blog_post_categories')
      .select('*')
      .where('post_id', '=', post.id)
      .execute();
    const postCategories = (categoryResults as any).data || categoryResults;

    const categories = [];
    for (const pc of postCategories) {
      const category = await this.db.findOne('blog_categories', { id: pc.category_id });
      if (category) {
        categories.push(this.transformToCamelCase(category));
      }
    }

    // Get tags
    const tagResults = await this.db
      .table('blog_post_tags')
      .select('*')
      .where('post_id', '=', post.id)
      .execute();
    const postTags = (tagResults as any).data || tagResults;

    const tags = [];
    for (const pt of postTags) {
      const tag = await this.db.findOne('blog_tags', { id: pt.tag_id });
      if (tag) {
        tags.push(this.transformToCamelCase(tag));
      }
    }

    // Get author (from auth service)
    let author = null;
    if (post.author_id) {
      try {
        const user = await this.db.getUserById(post.author_id);
        if (user) {
          const metadata = user.metadata || {};
          author = {
            id: user.id,
            name: metadata.name || (user as any).fullName || (user as any).name || user.email?.split('@')[0] || 'Anonymous',
            email: user.email,
            avatar: user.avatar_url || metadata.avatarUrl || null,
          };
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch author for post ${post.id}:`, error);
      }
    }

    return {
      ...enriched,
      categories: categories || [],
      tags: tags || [],
      author: author || { id: post.author_id, name: 'Anonymous', email: null, avatar: null },
    };
  }

  // ==================== BLOG POSTS ====================

  async createPost(authorId: string, dto: CreateBlogPostDto) {
    try {
      const slug = await this.generateUniqueSlug(dto.title);
      const readTime = this.calculateReadTime(dto.content);

      const postData = {
        title: dto.title,
        slug,
        content: dto.content,
        excerpt: dto.excerpt || null,
        featured_image: dto.featuredImage || null,
        images: JSON.stringify(dto.images || []),
        author_id: authorId,
        status: dto.publish ? 'published' : 'draft',
        published_at: dto.publish ? new Date().toISOString() : null,
        read_time: readTime,
        seo_meta_title: dto.seoMetaTitle || null,
        seo_meta_description: dto.seoMetaDescription || null,
        is_featured: dto.isFeatured || false,
      };

      const post = await this.db.insert('blog_posts', postData);

      // Add categories
      if (dto.categoryIds && dto.categoryIds.length > 0) {
        for (const categoryId of dto.categoryIds) {
          await this.db.insert('blog_post_categories', {
            post_id: post.id,
            category_id: categoryId,
          });
        }
      }

      // Add tags
      if (dto.tags && dto.tags.length > 0) {
        for (const tagName of dto.tags) {
          const tag = await this.getOrCreateTag(tagName);
          await this.db.insert('blog_post_tags', {
            post_id: post.id,
            tag_id: tag.id,
          });
        }
      }

      return this.enrichPost(post);
    } catch (error) {
      this.logger.error('Failed to create blog post:', error);
      throw new BadRequestException('Failed to create blog post');
    }
  }

  async updatePost(postId: string, authorId: string, dto: UpdateBlogPostDto) {
    try {
      const updateData: any = { updated_at: new Date().toISOString() };

      if (dto.title) {
        updateData.title = dto.title;
        updateData.slug = await this.generateUniqueSlug(dto.title, postId);
      }
      if (dto.content) {
        updateData.content = dto.content;
        updateData.read_time = this.calculateReadTime(dto.content);
      }
      if (dto.excerpt !== undefined) updateData.excerpt = dto.excerpt;
      if (dto.featuredImage !== undefined) updateData.featured_image = dto.featuredImage;
      if (dto.images !== undefined) updateData.images = JSON.stringify(dto.images);
      if (dto.seoMetaTitle !== undefined) updateData.seo_meta_title = dto.seoMetaTitle;
      if (dto.seoMetaDescription !== undefined) updateData.seo_meta_description = dto.seoMetaDescription;
      if (dto.isFeatured !== undefined) updateData.is_featured = dto.isFeatured;
      if (dto.publish !== undefined) {
        updateData.status = dto.publish ? 'published' : 'draft';
        if (dto.publish && !updateData.published_at) {
          updateData.published_at = new Date().toISOString();
        }
      }
      if (dto.status) {
        updateData.status = dto.status;
        if (dto.status === 'published' && !updateData.published_at) {
          updateData.published_at = new Date().toISOString();
        }
      }

      await this.db.update('blog_posts', { id: postId, author_id: authorId }, updateData);

      return this.getPostById(postId);
    } catch (error) {
      this.logger.error('Failed to update blog post:', error);
      throw new BadRequestException('Failed to update blog post');
    }
  }

  async deletePost(postId: string, authorId: string) {
    await this.db.update('blog_posts', { id: postId, author_id: authorId }, {
      is_deleted: true,
      updated_at: new Date().toISOString(),
    });
  }

  async getPublishedPosts(page = 1, limit = 12, search?: string) {
    const offset = (page - 1) * limit;

    let query = this.db
      .table('blog_posts')
      .select('*')
      .where('status', '=', 'published')
      .where('is_deleted', '=', false)
      .orderBy('published_at', 'DESC')
      .limit(limit)
      .offset(offset);

    if (search) {
      // Note: This is a simplified search, consider using full-text search in production
      query = query.where('title', 'LIKE', `%${search}%`);
    }

    const result = await query.execute();
    const posts = (result as any).data || result;

    return Promise.all(posts.map((p: any) => this.enrichPost(p)));
  }

  async getFeaturedPosts(limit = 5) {
    const result = await this.db
      .table('blog_posts')
      .select('*')
      .where('status', '=', 'published')
      .where('is_deleted', '=', false)
      .where('is_featured', '=', true)
      .orderBy('published_at', 'DESC')
      .limit(limit)
      .execute();

    const posts = (result as any).data || result;
    return Promise.all(posts.map((p: any) => this.enrichPost(p)));
  }

  async getPostBySlug(slug: string) {
    const result = await this.db.findOne('blog_posts', {
      slug,
      status: 'published',
      is_deleted: false,
    });

    if (!result) {
      throw new NotFoundException('Post not found');
    }

    // Increment view count
    await this.db.update('blog_posts', { id: result.id }, {
      view_count: (result.view_count || 0) + 1,
    });

    return this.enrichPost(result);
  }

  async getPostById(postId: string) {
    const result = await this.db.findOne('blog_posts', { id: postId });
    if (!result) throw new NotFoundException('Post not found');
    return this.enrichPost(result);
  }

  async getPostsByAuthor(authorId: string) {
    const results = await this.db
      .table('blog_posts')
      .select('*')
      .where('author_id', '=', authorId)
      .where('is_deleted', '=', false)
      .orderBy('created_at', 'DESC')
      .execute();

    const posts = (results as any).data || results;
    return Promise.all(posts.map((p: any) => this.enrichPost(p)));
  }

  async getRelatedPosts(postId: string, limit = 4) {
    // Get the current post to find related posts based on categories/tags
    const currentPost = await this.db.findOne('blog_posts', { id: postId });
    if (!currentPost) return [];

    // Get category IDs for current post
    const categoryResults = await this.db
      .table('blog_post_categories')
      .select('*')
      .where('post_id', '=', postId)
      .execute();
    const categoryIds = ((categoryResults as any).data || categoryResults).map((c: any) => c.category_id);

    let relatedPosts = [];

    if (categoryIds.length > 0) {
      // Find posts with same categories
      const relatedByCategoryResults = await this.db
        .table('blog_post_categories')
        .select('post_id')
        .execute();

      const allPostCategories = (relatedByCategoryResults as any).data || relatedByCategoryResults;
      const relatedPostIds = allPostCategories
        .filter((pc: any) => categoryIds.includes(pc.category_id) && pc.post_id !== postId)
        .map((pc: any) => pc.post_id);

      if (relatedPostIds.length > 0) {
        const postsResults = await this.db
          .table('blog_posts')
          .select('*')
          .where('status', '=', 'published')
          .where('is_deleted', '=', false)
          .orderBy('published_at', 'DESC')
          .limit(limit)
          .execute();

        const allPosts = (postsResults as any).data || postsResults;
        relatedPosts = allPosts.filter((p: any) => relatedPostIds.includes(p.id));
      }
    }

    // If not enough related posts, get recent posts
    if (relatedPosts.length < limit) {
      const recentResults = await this.db
        .table('blog_posts')
        .select('*')
        .where('status', '=', 'published')
        .where('is_deleted', '=', false)
        .orderBy('published_at', 'DESC')
        .limit(limit)
        .execute();

      const recentPosts = (recentResults as any).data || recentResults;
      const filteredRecent = recentPosts.filter((p: any) => p.id !== postId);

      // Combine and deduplicate
      const postIds = new Set(relatedPosts.map((p: any) => p.id));
      for (const post of filteredRecent) {
        if (!postIds.has(post.id) && relatedPosts.length < limit) {
          relatedPosts.push(post);
          postIds.add(post.id);
        }
      }
    }

    return Promise.all(relatedPosts.slice(0, limit).map((p: any) => this.enrichPost(p)));
  }

  // ==================== TAGS ====================

  async getOrCreateTag(tagName: string) {
    const slug = this.generateSlug(tagName);

    const existing = await this.db.findOne('blog_tags', { slug });
    if (existing) return existing;

    return await this.db.insert('blog_tags', {
      name: tagName,
      slug,
    });
  }

  async getAllTags() {
    const results = await this.db
      .table('blog_tags')
      .select('*')
      .orderBy('post_count', 'DESC')
      .execute();

    const tags = (results as any).data || results;
    return tags.map((t: any) => this.transformToCamelCase(t));
  }

  // ==================== CATEGORIES ====================

  async getAllCategories() {
    const results = await this.db
      .table('blog_categories')
      .select('*')
      .execute();

    const categories = (results as any).data || results;
    return categories.map((c: any) => this.transformToCamelCase(c));
  }

  async createCategory(name: string) {
    const slug = this.generateSlug(name);

    try {
      const category = await this.db.insert('blog_categories', {
        name,
        slug,
        post_count: 0
      });

      this.logger.log(`✅ Created category: ${name}`);
      return this.transformToCamelCase(category);
    } catch (error) {
      this.logger.error(`Failed to create category ${name}:`, error);
      throw new BadRequestException(`Failed to create category: ${error.message}`);
    }
  }

  private async seedDefaultCategories() {
    const defaultCategories = [
      { name: 'Technology', slug: 'technology' },
      { name: 'Marketing', slug: 'marketing' },
      { name: 'Social Media', slug: 'social-media' },
      { name: 'Business', slug: 'business' },
      { name: 'Development', slug: 'development' },
      { name: 'Design', slug: 'design' },
      { name: 'Growth', slug: 'growth' },
      { name: 'News', slug: 'news' },
      { name: 'Tips', slug: 'tips' },
    ];

    for (const category of defaultCategories) {
      try {
        await this.db.insert('blog_categories', category);
      } catch (error) {
        // Ignore duplicate errors
        this.logger.warn(`Category ${category.name} might already exist`);
      }
    }

    this.logger.log('✅ Default categories seeded');
  }

  // ==================== COMMENTS ====================

  async createComment(postId: string, dto: CreateCommentDto) {
    const comment = await this.db.insert('blog_comments', {
      post_id: postId,
      parent_id: dto.parentId || null,
      author_name: dto.authorName,
      author_email: dto.authorEmail,
      content: dto.content,
      is_approved: true, // Auto-approve comments for blog
    });

    // Update comment count
    await this.incrementCommentCount(postId);

    return this.transformToCamelCase(comment);
  }

  async getComments(postId: string) {
    const results = await this.db
      .table('blog_comments')
      .select('*')
      .where('post_id', '=', postId)
      .where('is_approved', '=', true)
      .orderBy('created_at', 'DESC')
      .execute();

    const allComments = (results as any).data || results;

    // Transform and structure comments
    const commentsMap = new Map();
    const transformedComments = allComments.map((c: any) => {
      const transformed = this.transformToCamelCase(c);
      const comment = {
        ...transformed,
        author: {
          name: c.author_name,
          email: c.author_email,
        },
        replies: [],
      };
      commentsMap.set(c.id, comment);
      return comment;
    });

    // Build nested structure
    const topLevelComments = [];
    for (const comment of transformedComments) {
      if (comment.parentId) {
        const parent = commentsMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        topLevelComments.push(comment);
      }
    }

    return topLevelComments;
  }

  // ==================== STATS ====================

  private async incrementCommentCount(postId: string) {
    const post = await this.db.findOne('blog_posts', { id: postId });
    if (post) {
      await this.db.update('blog_posts', { id: postId }, {
        comment_count: (post.comment_count || 0) + 1,
      });
    }
  }

  async toggleLike(postId: string, ipAddress: string) {
    const existing = await this.db.findOne('blog_post_likes', {
      post_id: postId,
      ip_address: ipAddress,
    });

    if (existing) {
      // Unlike
      await this.db
        .table('blog_post_likes')
        .delete()
        .where('post_id', '=', postId)
        .where('ip_address', '=', ipAddress)
        .execute();

      const post = await this.db.findOne('blog_posts', { id: postId });
      const newCount = Math.max(0, (post.like_count || 0) - 1);
      await this.db.update('blog_posts', { id: postId }, { like_count: newCount });

      return { liked: false, likeCount: newCount };
    } else {
      // Like
      await this.db.insert('blog_post_likes', {
        post_id: postId,
        ip_address: ipAddress,
      });

      const post = await this.db.findOne('blog_posts', { id: postId });
      const newCount = (post.like_count || 0) + 1;
      await this.db.update('blog_posts', { id: postId }, { like_count: newCount });

      return { liked: true, likeCount: newCount };
    }
  }

  // ==================== RATINGS ====================

  async createRating(postId: string, dto: any, userId?: string, ipAddress?: string) {
    try {
      // Check if user/IP already rated this post
      const existingRating = userId
        ? await this.db.findOne('blog_ratings', { post_id: postId, user_id: userId })
        : await this.db.findOne('blog_ratings', { post_id: postId, ip_address: ipAddress });

      let rating;
      if (existingRating) {
        // Update existing rating
        rating = await this.db.update(
          'blog_ratings',
          { id: existingRating.id },
          {
            rating: dto.rating,
            review: dto.review || null,
            updated_at: new Date().toISOString(),
          }
        );
      } else {
        // Create new rating
        rating = await this.db.insert('blog_ratings', {
          post_id: postId,
          user_id: userId || null,
          user_email: dto.userEmail || null,
          user_name: dto.userName || null,
          rating: dto.rating,
          review: dto.review || null,
          ip_address: ipAddress || null,
        });
      }

      // Recalculate average rating
      await this.recalculateRating(postId);

      return this.transformToCamelCase(rating);
    } catch (error) {
      this.logger.error('Failed to create rating:', error);
      throw new BadRequestException('Failed to create rating');
    }
  }

  async getRatings(postId: string) {
    const results = await this.db
      .table('blog_ratings')
      .select('*')
      .where('post_id', '=', postId)
      .orderBy('created_at', 'DESC')
      .execute();

    const ratings = (results as any).data || results;
    return ratings.map((r: any) => this.transformToCamelCase(r));
  }

  async getUserRating(postId: string, userId?: string, ipAddress?: string) {
    // Only check by userId if authenticated
    if (!userId) {
      return null;
    }

    const rating = await this.db.findOne('blog_ratings', {
      post_id: postId,
      user_id: userId
    });

    return rating ? this.transformToCamelCase(rating) : null;
  }

  private async recalculateRating(postId: string) {
    const results = await this.db
      .table('blog_ratings')
      .select('*')
      .where('post_id', '=', postId)
      .execute();

    const ratings = (results as any).data || results;
    const count = ratings.length;
    const sum = ratings.reduce((acc: number, r: any) => acc + r.rating, 0);
    const average = count > 0 ? (sum / count).toFixed(2) : 0;

    await this.db.update('blog_posts', { id: postId }, {
      rating_count: count,
      rating_average: average,
    });
  }

  // ==================== IMAGE UPLOAD ====================

  async uploadImage(file: Express.Multer.File): Promise<{ url: string; name: string }> {
    try {
      // Resize and optimize image
      const optimizedBuffer = await sharp(file.buffer)
        .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const filename = `blog-${timestamp}-${randomString}.jpg`;

      // Upload to storage service
      const result = await /* TODO: use StorageService */ this.db.client.storage.upload(
        optimizedBuffer,
        `blog/images/${filename}`,
        {
          contentType: 'image/jpeg',
          metadata: { type: 'blog_image' }
        }
      );

      this.logger.log(`✅ Blog image uploaded: ${filename}`);

      return {
        url: result.url,
        name: filename,
      };
    } catch (error) {
      this.logger.error('Failed to upload blog image:', error);
      throw new BadRequestException('Failed to upload image');
    }
  }
}
