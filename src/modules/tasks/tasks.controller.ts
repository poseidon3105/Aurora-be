import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
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
import { TasksService } from './tasks.service';
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { ChangeTaskStatusDto } from './dto/change-task-status.dto';
import { ReorderTaskDto } from './dto/reorder-task.dto';

@ApiTags('Tasks')
@Controller()
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ── Create Task (checklist-scoped) ──

  @Post('checklists/:checklistId/tasks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task in a checklist' })
  @ApiParam({ name: 'checklistId', type: Number, description: 'Checklist ID' })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or business rule violation' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Checklist not found' })
  async create(
    @Param('checklistId', ParseIntPipe) checklistId: number,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.create(checklistId, dto, user.id);
  }

  // ── Get Tasks (by checklist) ──

  @Get('checklists/:checklistId/tasks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all tasks for a checklist' })
  @ApiParam({ name: 'checklistId', type: Number, description: 'Checklist ID' })
  @ApiResponse({ status: 200, description: 'List of tasks returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Checklist not found' })
  async findAll(
    @Param('checklistId', ParseIntPipe) checklistId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.findAll(checklistId, user.id);
  }

  // ── Get Task Detail ──

  @Get('tasks/:taskId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get task details with assignee, status, tags, counts' })
  @ApiParam({ name: 'taskId', type: Number, description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task details returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.findOne(taskId, user.id);
  }

  // ── Update Task ──

  @Put('tasks/:taskId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a task (manager or assignee only)' })
  @ApiParam({ name: 'taskId', type: Number, description: 'Task ID' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or deleted task' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async update(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.update(taskId, dto, user.id);
  }

  // ── Assign Task ──

  @Patch('tasks/:taskId/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a task to a project member' })
  @ApiParam({ name: 'taskId', type: Number, description: 'Task ID' })
  @ApiBody({ type: AssignTaskDto })
  @ApiResponse({ status: 200, description: 'Task assigned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid assignee' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async assign(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: AssignTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.assign(taskId, dto, user.id);
  }

  // ── Change Task Status ──

  @Patch('tasks/:taskId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change task status (auto-updates checklist status)' })
  @ApiParam({ name: 'taskId', type: Number, description: 'Task ID' })
  @ApiBody({ type: ChangeTaskStatusDto })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async changeStatus(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: ChangeTaskStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.changeStatus(taskId, dto, user.id);
  }

  // ── Reorder Tasks ──

  @Patch('tasks/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder tasks within a checklist' })
  @ApiBody({ type: ReorderTaskDto })
  @ApiResponse({ status: 200, description: 'Tasks reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid position' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async reorder(
    @Body() dto: ReorderTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.reorder(dto, user.id);
  }

  // ── Delete Task ──

  @Delete('tasks/:taskId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a task (manager or creator only)' })
  @ApiParam({ name: 'taskId', type: Number, description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async remove(
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.remove(taskId, user.id);
  }

  // ── Task Summary (Dashboard) ──

  @Get('projects/:projectId/task-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get task summary/dashboard statistics for a project' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Task summary returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getTaskSummary(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.getTaskSummary(projectId, user.id);
  }
}
