import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ActivityLogService } from './activity-log.service';
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';

@ApiTags('Activity Logs')
@Controller()
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  // ── Get My Activities ──

  @Get('activities/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get activity logs for the authenticated user' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Records per page' })
  @ApiResponse({ status: 200, description: 'Paginated activity logs returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMyActivities(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', ParseIntPipe) page?: number,
    @Query('limit', ParseIntPipe) limit?: number,
  ) {
    // ParseIntPipe with optional params returns NaN when not provided
    const safePage = page && !isNaN(page) ? page : undefined;
    const safeLimit = limit && !isNaN(limit) ? limit : undefined;
    return this.activityLogService.findMyActivities(user.id, {
      page: safePage,
      limit: safeLimit,
    });
  }

  // ── Get Project Activities ──

  @Get('projects/:projectId/activities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get activity logs related to a project' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Records per page' })
  @ApiResponse({ status: 200, description: 'Paginated project activity logs returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  async findProjectActivities(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', ParseIntPipe) page?: number,
    @Query('limit', ParseIntPipe) limit?: number,
  ) {
    const safePage = page && !isNaN(page) ? page : undefined;
    const safeLimit = limit && !isNaN(limit) ? limit : undefined;
    return this.activityLogService.findProjectActivities(projectId, user.id, {
      page: safePage,
      limit: safeLimit,
    });
  }

  // ── Get Task Activities ──

  @Get('tasks/:taskId/activities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get activity logs related to a task' })
  @ApiParam({ name: 'taskId', type: Number, description: 'Task ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Records per page' })
  @ApiResponse({ status: 200, description: 'Paginated task activity logs returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findTaskActivities(
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', ParseIntPipe) page?: number,
    @Query('limit', ParseIntPipe) limit?: number,
  ) {
    const safePage = page && !isNaN(page) ? page : undefined;
    const safeLimit = limit && !isNaN(limit) ? limit : undefined;
    return this.activityLogService.findTaskActivities(taskId, user.id, {
      page: safePage,
      limit: safeLimit,
    });
  }
}
