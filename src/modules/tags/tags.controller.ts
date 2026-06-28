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
import { TagsService } from './tags.service';
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { AssignTagDto } from './dto/assign-tag.dto';

@ApiTags('Tags')
@Controller()
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  // ── Create Tag ──

  @Post('projects/:projectId/tags')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tag in a project (manager, admin, or super admin only)' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiBody({ type: CreateTagDto })
  @ApiResponse({ status: 201, description: 'Tag created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or project is deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'Tag name already exists in this project' })
  async create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: CreateTagDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tagsService.create(projectId, dto, user.id);
  }

  // ── Get Project Tags ──

  @Get('projects/:projectId/tags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all tags for a project' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of tags returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  async findAll(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tagsService.findAll(projectId, user.id);
  }

  // ── Update Tag ──

  @Put('tags/:tagId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a tag (manager, admin, or super admin only)' })
  @ApiParam({ name: 'tagId', type: Number, description: 'Tag ID' })
  @ApiBody({ type: UpdateTagDto })
  @ApiResponse({ status: 200, description: 'Tag updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  @ApiResponse({ status: 409, description: 'Tag name already exists in this project' })
  async update(
    @Param('tagId', ParseIntPipe) tagId: number,
    @Body() dto: UpdateTagDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tagsService.update(tagId, dto, user.id);
  }

  // ── Delete Tag ──

  @Delete('tags/:tagId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hard delete a tag and all its task associations (manager, admin, or super admin only)' })
  @ApiParam({ name: 'tagId', type: Number, description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async remove(
    @Param('tagId', ParseIntPipe) tagId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tagsService.remove(tagId, user.id);
  }

  // ── Assign Tag to Task ──

  @Post('tasks/:taskId/tags')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a tag to a task' })
  @ApiParam({ name: 'taskId', type: Number, description: 'Task ID' })
  @ApiBody({ type: AssignTagDto })
  @ApiResponse({ status: 201, description: 'Tag assigned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or tag does not belong to project' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  @ApiResponse({ status: 404, description: 'Task or tag not found' })
  @ApiResponse({ status: 409, description: 'Tag already assigned to this task' })
  async assignToTask(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: AssignTagDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tagsService.assignToTask(taskId, dto, user.id);
  }

  // ── Remove Tag from Task ──

  @Delete('tasks/:taskId/tags/:tagId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a tag from a task' })
  @ApiParam({ name: 'taskId', type: Number, description: 'Task ID' })
  @ApiParam({ name: 'tagId', type: Number, description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag removed from task successfully' })
  @ApiResponse({ status: 400, description: 'Tag not assigned to task' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async removeFromTask(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('tagId', ParseIntPipe) tagId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tagsService.removeFromTask(taskId, tagId, user.id);
  }

  // ── Get Task Tags ──

  @Get('tasks/:taskId/tags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all tags assigned to a task' })
  @ApiParam({ name: 'taskId', type: Number, description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'List of task tags returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTaskTags(
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tagsService.getTaskTags(taskId, user.id);
  }
}
