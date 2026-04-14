import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Ip,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BlogService } from './blog.service';
import {
  CreateBlogPostDto,
  UpdateBlogPostDto,
  CreateCommentDto,
  CreateRatingDto,
} from './dto/blog.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as multer from 'multer';

@ApiTags('Blog')
@Controller('public/blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('posts')
  @ApiOperation({ summary: 'Get published blog posts' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getPosts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const posts = await this.blogService.getPublishedPosts(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 12,
      search,
    );

    return {
      data: posts,
      pagination: {
        total: posts.length,
        page: parseInt(page || '1'),
        limit: parseInt(limit || '12'),
        totalPages: 1,
      },
    };
  }

  @Get('posts/featured')
  @ApiOperation({ summary: 'Get featured blog posts' })
  @ApiQuery({ name: 'limit', required: false })
  async getFeaturedPosts(@Query('limit') limit?: string) {
    const posts = await this.blogService.getFeaturedPosts(limit ? parseInt(limit) : 5);
    return { data: posts };
  }

  @Get('posts/:slug')
  @ApiOperation({ summary: 'Get blog post by slug' })
  async getPostBySlug(@Param('slug') slug: string) {
    return this.blogService.getPostBySlug(slug);
  }

  @Get('posts/:postId/related')
  @ApiOperation({ summary: 'Get related posts' })
  @ApiQuery({ name: 'limit', required: false })
  async getRelatedPosts(@Param('postId') postId: string, @Query('limit') limit?: string) {
    const posts = await this.blogService.getRelatedPosts(postId, limit ? parseInt(limit) : 4);
    return { data: posts };
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all tags' })
  async getTags() {
    const tags = await this.blogService.getAllTags();
    return { data: tags };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  async getCategories() {
    const categories = await this.blogService.getAllCategories();
    return { data: categories };
  }

  @Post('admin/categories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category (Admin only)' })
  async createCategory(@Req() req, @Body() body: { name: string }) {
    if (!body.name) {
      throw new BadRequestException('Category name is required');
    }
    return this.blogService.createCategory(body.name);
  }

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  async getComments(@Param('postId') postId: string) {
    const comments = await this.blogService.getComments(postId);
    return { data: comments };
  }

  @Post('posts/:postId/comments')
  @ApiOperation({ summary: 'Add comment to post' })
  async createComment(@Param('postId') postId: string, @Body() dto: CreateCommentDto) {
    return this.blogService.createComment(postId, dto);
  }

  @Post('posts/:postId/like')
  @ApiOperation({ summary: 'Toggle like on post' })
  async toggleLike(@Param('postId') postId: string, @Ip() ip: string) {
    return this.blogService.toggleLike(postId, ip);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Post('admin/posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create blog post (Admin only)' })
  async createPost(@Req() req, @Body() dto: CreateBlogPostDto) {
    const authorId = req.user.sub || req.user.userId;
    return this.blogService.createPost(authorId, dto);
  }

  @Put('admin/posts/:postId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update blog post (Admin only)' })
  async updatePost(@Req() req, @Param('postId') postId: string, @Body() dto: UpdateBlogPostDto) {
    const authorId = req.user.sub || req.user.userId;
    return this.blogService.updatePost(postId, authorId, dto);
  }

  @Delete('admin/posts/:postId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete blog post (Admin only)' })
  async deletePost(@Req() req, @Param('postId') postId: string) {
    const authorId = req.user.sub || req.user.userId;
    await this.blogService.deletePost(postId, authorId);
    return { message: 'Post deleted successfully' };
  }

  @Get('admin/my-posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my blog posts (Admin only)' })
  async getMyPosts(@Req() req) {
    const authorId = req.user.sub || req.user.userId;
    const posts = await this.blogService.getPostsByAuthor(authorId);
    return { data: posts };
  }

  @Get('admin/posts/:postId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get blog post by ID for editing (Admin only)' })
  async getPostById(@Req() req, @Param('postId') postId: string) {
    return this.blogService.getPostById(postId);
  }

  @Post('admin/upload-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload blog image (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Only image files allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.blogService.uploadImage(file);
  }

  // ==================== RATINGS ====================

  @Post('posts/:postId/ratings')
  @ApiOperation({ summary: 'Add or update rating for a post' })
  async createRating(
    @Param('postId') postId: string,
    @Body() dto: CreateRatingDto,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    const userId = req.user?.sub || req.user?.userId;
    return this.blogService.createRating(postId, dto, userId, ip);
  }

  @Get('posts/:postId/ratings')
  @ApiOperation({ summary: 'Get all ratings for a post' })
  async getRatings(@Param('postId') postId: string) {
    const ratings = await this.blogService.getRatings(postId);
    return { data: ratings };
  }

  @Get('posts/:postId/ratings/me')
  @ApiOperation({ summary: 'Get my rating for a post' })
  async getUserRating(@Param('postId') postId: string, @Req() req: any, @Ip() ip: string) {
    const userId = req.user?.sub || req.user?.userId;
    return this.blogService.getUserRating(postId, userId, ip);
  }
}
