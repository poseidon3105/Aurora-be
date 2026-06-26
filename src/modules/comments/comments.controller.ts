import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CommentsService } from './comments.service';
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('Task Comments')
@Controller()
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // ── Create Comment (task-scoped) ──

  @Post('tasks/:taskId/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a comment to a task (supports @username mentions)' })
  @ApiParam({ name: 'taskId', type: Number, description: 'Task ID' })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or task is deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async create(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.create(taskId, dto, user.id);
  }

  // ── Get Comments (by task) ──

  @Get('tasks/:taskId/comments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all comments for a task (oldest first)' })
  @ApiParam({ name: 'taskId', type: Number, description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'List of comments returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findAll(
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.findAll(taskId, user.id);
  }

  // ── Update Comment ──

  @Put('comments/:commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a comment (owner only)' })
  @ApiParam({ name: 'commentId', type: Number, description: 'Comment ID' })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update a deleted comment' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the comment owner' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async update(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.update(commentId, dto, user.id);
  }

  // ── Delete Comment ──

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft delete a comment (owner or project manager only)',
  })
  @ApiParam({ name: 'commentId', type: Number, description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the owner or manager' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async remove(
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.remove(commentId, user.id);
  }
}
