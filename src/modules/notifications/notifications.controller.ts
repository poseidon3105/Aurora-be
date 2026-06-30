import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
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
import { NotificationsService } from './notifications.service';
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── Get My Notifications (paginated) ──

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get notifications for the current user (paginated)' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiQuery({ name: 'isRead', type: Boolean, required: false, description: 'Filter by read/unread status' })
  @ApiResponse({ status: 200, description: 'Paginated list of notifications' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('isRead') isRead?: string,
  ) {
    const isReadFilter =
      isRead === 'true' ? true : isRead === 'false' ? false : undefined;

    return this.notificationsService.findAll(user.id, {
      page,
      limit,
      isRead: isReadFilter,
    });
  }

  // ── Get Unread Notification Count ──

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get unread notification count for the current user' })
  @ApiResponse({ status: 200, description: 'Unread notification count' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  // ── Mark Notification as Read ──

  @Patch(':notificationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'notificationId', type: Number, description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your notification' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.markAsRead(notificationId, user.id);
  }

  // ── Mark All Notifications as Read ──

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read for the current user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  // ── Delete Notification ──

  @Delete(':notificationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'notificationId', type: Number, description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your notification' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async remove(
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.remove(notificationId, user.id);
  }
}
