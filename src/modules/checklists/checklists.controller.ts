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
import { ChecklistsService } from './checklists.service';
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { ChangeChecklistStatusDto } from './dto/change-checklist-status.dto';

@ApiTags('Checklists')
@Controller()
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  // ── Create Checklist (project-scoped) ──

  @Post('projects/:projectId/checklists')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new checklist in a project' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiBody({ type: CreateChecklistDto })
  @ApiResponse({ status: 201, description: 'Checklist created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or business rule violation' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: CreateChecklistDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checklistsService.create(projectId, dto, user.id);
  }

  // ── Get Checklists (project-scoped) ──

  @Get('projects/:projectId/checklists')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all checklists for a project' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of checklists returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  async findAll(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checklistsService.findAll(projectId, user.id);
  }

  // ── Get Checklist Detail ──

  @Get('checklists/:checklistId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get checklist details with task counts' })
  @ApiParam({ name: 'checklistId', type: Number, description: 'Checklist ID' })
  @ApiResponse({ status: 200, description: 'Checklist details returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  @ApiResponse({ status: 404, description: 'Checklist not found' })
  async findOne(
    @Param('checklistId', ParseIntPipe) checklistId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checklistsService.findOne(checklistId, user.id);
  }

  // ── Update Checklist ──

  @Put('checklists/:checklistId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a checklist (manager or creator only)' })
  @ApiParam({ name: 'checklistId', type: Number, description: 'Checklist ID' })
  @ApiBody({ type: UpdateChecklistDto })
  @ApiResponse({ status: 200, description: 'Checklist updated successfully' })
  @ApiResponse({ status: 400, description: 'Checklist is deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a manager or creator' })
  @ApiResponse({ status: 404, description: 'Checklist not found' })
  async update(
    @Param('checklistId', ParseIntPipe) checklistId: number,
    @Body() dto: UpdateChecklistDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checklistsService.update(checklistId, dto, user.id);
  }

  // ── Change Checklist Status ──

  @Patch('checklists/:checklistId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change checklist status (OPEN → IN_PROGRESS → DONE)',
  })
  @ApiParam({ name: 'checklistId', type: Number, description: 'Checklist ID' })
  @ApiBody({ type: ChangeChecklistStatusDto })
  @ApiResponse({ status: 200, description: 'Status changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  @ApiResponse({ status: 404, description: 'Checklist not found' })
  async changeStatus(
    @Param('checklistId', ParseIntPipe) checklistId: number,
    @Body() dto: ChangeChecklistStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checklistsService.changeStatus(checklistId, dto, user.id);
  }

  // ── Delete Checklist ──

  @Delete('checklists/:checklistId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft delete a checklist (manager or creator only, must have no incomplete tasks)',
  })
  @ApiParam({ name: 'checklistId', type: Number, description: 'Checklist ID' })
  @ApiResponse({ status: 200, description: 'Checklist deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a manager or creator' })
  @ApiResponse({ status: 404, description: 'Checklist not found' })
  @ApiResponse({ status: 409, description: 'Checklist has incomplete tasks' })
  async remove(
    @Param('checklistId', ParseIntPipe) checklistId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checklistsService.remove(checklistId, user.id);
  }
}
