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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ProjectsService } from './projects.service';
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ── Project CRUD ──

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or end date before start date' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.create(dto, user.id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all projects owned by or shared with the user' })
  @ApiResponse({ status: 200, description: 'List of projects returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.findAll(user.id);
  }

  @Get(':projectId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get project details by ID' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project details returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a member, super admin, or admin' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.findOne(projectId, user.id);
  }

  @Put(':projectId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiBody({ type: UpdateProjectDto })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or project is deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a manager, super admin, or admin' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.update(projectId, dto, user.id);
  }

  @Patch(':projectId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a project (manager only)' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project archived successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project manager' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'Project is not active' })
  async archive(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.archive(projectId, user.id);
  }

  @Patch(':projectId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a project (manager only)' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project completed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project manager' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'Project is not active' })
  async complete(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.complete(projectId, user.id);
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a project (manager, super admin, or admin)' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a manager, super admin, or admin' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async remove(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.remove(projectId, user.id);
  }

  // ═══════════════════════════════════════
  //  PROJECT MEMBER & INVITATION ENDPOINTS
  // ═══════════════════════════════════════

  @Post(':projectId/invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invite a user to join the project (manager only)' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiBody({ type: InviteMemberDto })
  @ApiResponse({ status: 200, description: 'Invitation sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or business rule violation' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project manager' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  async inviteMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.inviteMember(projectId, dto, user.id);
  }

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a project invitation' })
  @ApiBody({ type: AcceptInviteDto })
  @ApiResponse({ status: 200, description: 'Joined project successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired invitation' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Email does not match the invitation' })
  @ApiResponse({ status: 409, description: 'Already a member' })
  async acceptInvitation(
    @Body() dto: AcceptInviteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.acceptInvitation(dto, user);
  }

  @Get(':projectId/members')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all members of a project' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of project members' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getMembers(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.getMembers(projectId, user.id);
  }

  @Get(':projectId/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get member details' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiParam({ name: 'memberId', type: Number, description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  @ApiResponse({ status: 404, description: 'Project or member not found' })
  async getMemberDetail(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.getMemberDetail(projectId, memberId, user.id);
  }

  @Patch(':projectId/members/:memberId/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a member\'s role (manager only)' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiParam({ name: 'memberId', type: Number, description: 'Member ID' })
  @ApiBody({ type: UpdateMemberRoleDto })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid role or cannot update owner' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project manager' })
  @ApiResponse({ status: 404, description: 'Project or member not found' })
  async updateMemberRole(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.updateMemberRole(projectId, memberId, dto, user.id);
  }

  @Delete(':projectId/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from the project (manager, admin, or super admin)' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiParam({ name: 'memberId', type: Number, description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot remove owner or self' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Project or member not found' })
  @ApiResponse({ status: 409, description: 'Member has active tasks' })
  async removeMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.removeMember(projectId, memberId, user.id);
  }

  @Post(':projectId/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a project' })
  @ApiParam({ name: 'projectId', type: Number, description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Left project successfully' })
  @ApiResponse({ status: 400, description: 'Cannot leave as last manager or has active tasks' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async leaveProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.leaveProject(projectId, user.id);
  }
}
