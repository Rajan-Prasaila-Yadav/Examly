// apps/api/src/modules/community/community.controller.ts
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiProperty } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CommunityService } from './community.service';
import { CurrentUser, CurrentUserPayload } from '@/platform/rbac/decorators/current-user.decorator';
import { ReactionType } from '@prisma/client';
import { IsNotEmpty, IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ example: '📢 Thermodynamics Mock Revision Notes' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: '<p>Dear students, please revise Carnot engine formula $\\eta = 1 - T_2/T_1$</p>' })
  @IsString()
  @IsNotEmpty()
  contentHtml: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiProperty({ required: false, example: ['https://pub-xxxx.r2.dev/images/chart.png'] })
  @IsOptional()
  @IsArray()
  imageUrls?: string[];

  @ApiProperty({ required: false, example: 'https://pub-xxxx.r2.dev/notes/thermo.pdf' })
  @IsOptional()
  @IsString()
  pdfAttachmentUrl?: string;

  @ApiProperty({ required: false, example: { question: 'Which chapter next?', options: ['Optics', 'Modern Physics'] } })
  @IsOptional()
  poll?: { question: string; isMultiChoice?: boolean; options: string[] };
}

export class ReactPostDto {
  @ApiProperty({ example: 'LIKE', enum: ['LIKE', 'LOVE', 'HELPFUL', 'BRAVO', 'CELEBRATE'] })
  @IsEnum(ReactionType)
  reactionType: ReactionType;
}

export class AddCommentDto {
  @ApiProperty({ example: 'Sir, will entropy questions be included?' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;
}

@ApiTags('In-App Community Feed & Polls')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('feed')
  @ApiOperation({ summary: 'Get community feed posts' })
  @ApiQuery({ name: 'batchId', required: false })
  async getFeed(@CurrentUser() user: CurrentUserPayload, @Query('batchId') batchId?: string) {
    return this.communityService.getFeed(user.instituteId!, batchId);
  }

  @Post('posts')
  @ApiOperation({ summary: 'Create community announcement / poll (Admin & Teacher)' })
  async createPost(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreatePostDto) {
    return this.communityService.createPost(user.userId, user.instituteId!, dto);
  }

  @Post('posts/:id/react')
  @ApiOperation({ summary: 'React to a post (1 Reaction per user)' })
  async reactToPost(
    @Param('id') postId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ReactPostDto,
  ) {
    return this.communityService.reactToPost(postId, user.userId, dto.reactionType);
  }

  @Post('polls/:pollId/vote')
  @ApiOperation({ summary: 'Vote on an interactive batch poll' })
  async votePoll(
    @Param('pollId') pollId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body('optionId') optionId: string,
  ) {
    return this.communityService.votePoll(pollId, optionId, user.userId);
  }

  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'Get threaded comments for a post' })
  async getComments(@Param('id') postId: string) {
    return this.communityService.getComments(postId);
  }

  @Post('posts/:id/comments')
  @ApiOperation({ summary: 'Add a comment or reply to a post' })
  async addComment(
    @Param('id') postId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AddCommentDto,
  ) {
    return this.communityService.addComment(postId, user.userId, dto.content, dto.parentId);
  }
}
