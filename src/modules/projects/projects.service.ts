import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { ProjectStatus, ChecklistStatus, ProjectMemberStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PROJECT_REDIS_KEYS } from './projects.constants';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ───────────────────────────
  //  Helper: Ensure a ProjectRole exists
  // ───────────────────────────

  private async ensureProjectRole(name: string): Promise<{ id: number; name: string }> {
    let role = await this.prisma.projectRole.findUnique({ where: { name } });
    if (!role) {
      role = await this.prisma.projectRole.create({ data: { name } });
    }
    return role;
  }

  // ───────────────────────────
  //  Helper: Check if user has an elevated system role (SUPER_ADMIN or ADMIN)
  // ───────────────────────────

  private async hasElevatedRole(userId: number): Promise<boolean> {
    const elevatedRoles = ['SUPER_ADMIN', 'ADMIN'];

    const roles = await this.prisma.systemRole.findMany({
      where: { name: { in: elevatedRoles } },
    });

    if (roles.length === 0) return false;

    const roleIds = roles.map((r) => r.id);

    const assignment = await this.prisma.userSystemRole.findFirst({
      where: { userId, roleId: { in: roleIds } },
    });

    return !!assignment;
  }

  // ───────────────────────────
  //  Helper: Check if user is a Project Member with a specific role
  // ───────────────────────────

  private async hasProjectRole(
    projectId: number,
    userId: number,
    roleName: string,
  ): Promise<boolean> {
    const role = await this.prisma.projectRole.findUnique({ where: { name: roleName } });
    if (!role) return false;

    const membership = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, roleId: role.id },
    });
    return !!membership;
  }

  // ───────────────────────────
  //  Helper: Find project or throw
  // ───────────────────────────

  private async findProjectOrThrow(projectId: number) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  // ───────────────────────────
  //  Helper: Validate project is not deleted and is ACTIVE
  // ───────────────────────────

  private async validateProjectActive(projectId: number) {
    const project = await this.findProjectOrThrow(projectId);
    if (project.deletedAt) {
      throw new BadRequestException('Project has been deleted');
    }
    if (project.status !== ProjectStatus.ACTIVE) {
      throw new BadRequestException('Project is not active');
    }
    return project;
  }

  // ───────────────────────────
  //  3. Create Project
  // ───────────────────────────

  async create(dto: CreateProjectDto, userId: number) {
    const { name, description, startDate, endDate } = dto;

    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate && new Date(startDate) < today) {
      throw new BadRequestException('Start date must be greater than or equal to today\'s date');
    }

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      throw new BadRequestException('End date must be later than start date');
    }

    // Create project
    const project = await this.prisma.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        ownerId: userId,
        status: ProjectStatus.ACTIVE,
      },
    });

    // Add owner as PROJECT_MANAGER member
    const managerRole = await this.ensureProjectRole('PROJECT_MANAGER');
    await this.prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId,
        roleId: managerRole.id,
      },
    });

    // Activity Log: PROJECT_CREATED
    await this.activityLogService.create(
      userId,
      'PROJECT_CREATED',
      'PROJECT',
      project.id,
      null,
      JSON.stringify({ name, description }),
    ).catch(() => {});

    return project;
  }

  // ───────────────────────────
  //  4. Get My Projects
  // ───────────────────────────

  async findAll(userId: number) {
    return this.prisma.project.findMany({
      where: {
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, fullName: true, email: true },
        },
        _count: {
          select: { members: true, checklists: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ───────────────────────────
  //  5. Get Project Detail
  // ───────────────────────────

  async findOne(projectId: number, userId: number) {
    const project = await this.findProjectOrThrow(projectId);

    // Authorization: must be a member, SUPER_ADMIN, or ADMIN
    const isMember = await this.prisma.projectMember.findFirst({
      where: { projectId, userId },
    });
    const isElevated = await this.hasElevatedRole(userId);

    if (!isMember && !isElevated) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Fetch full detail with counts
    return this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        _count: {
          select: { members: true, checklists: true },
        },
      },
    });
  }

  // ───────────────────────────
  //  6. Update Project
  // ───────────────────────────

  async update(projectId: number, dto: UpdateProjectDto, userId: number) {
    const project = await this.findProjectOrThrow(projectId);

    // Cannot modify deleted projects
    if (project.deletedAt) {
      throw new BadRequestException('Cannot modify a deleted project');
    }

    // Authorization: PROJECT_MANAGER, SUPER_ADMIN, or ADMIN
    const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
    const isElevated = await this.hasElevatedRole(userId);

    if (!isManager && !isElevated) {
      throw new ForbiddenException('Only a project manager, super admin, or admin can update this project');
    }

    // Validate endDate against the existing project startDate
    const endDate = dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : project.endDate;

    if (project.startDate && endDate && endDate <= project.startDate) {
      throw new BadRequestException('End date must be later than start date');
    }

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
      },
    });

    // Activity Log: PROJECT_UPDATED
    const oldVal = JSON.stringify({
      name: project.name,
      description: project.description,
    });
    const newVal = JSON.stringify({
      name: dto.name ?? project.name,
      description: dto.description !== undefined ? dto.description : project.description,
    });
    await this.activityLogService.create(
      userId,
      'PROJECT_UPDATED',
      'PROJECT',
      projectId,
      oldVal,
      newVal,
    ).catch(() => {});

    return updated;
  }

  // ───────────────────────────
  //  7. Archive Project
  // ───────────────────────────

  async archive(projectId: number, userId: number) {
    const project = await this.findProjectOrThrow(projectId);

    // Authorization: PROJECT_MANAGER
    const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
    if (!isManager) {
      throw new ForbiddenException('Only a project manager can archive this project');
    }

    // Status must be ACTIVE
    if (project.status !== ProjectStatus.ACTIVE) {
      throw new ConflictException('Only active projects can be archived');
    }

    const archived = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.ARCHIVED },
    });

    // Activity Log: PROJECT_ARCHIVED
    await this.activityLogService.create(
      userId,
      'PROJECT_ARCHIVED',
      'PROJECT',
      projectId,
    ).catch(() => {});

    return archived;
  }

  // ───────────────────────────
  //  8. Complete Project
  // ───────────────────────────

  async complete(projectId: number, userId: number) {
    const project = await this.findProjectOrThrow(projectId);

    // Authorization: PROJECT_MANAGER
    const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
    if (!isManager) {
      throw new ForbiddenException('Only a project manager can complete this project');
    }

    // Status must be ACTIVE
    if (project.status !== ProjectStatus.ACTIVE) {
      throw new ConflictException('Only active projects can be completed');
    }

    const completed = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.COMPLETED },
    });

    // Activity Log: PROJECT_COMPLETED
    await this.activityLogService.create(
      userId,
      'PROJECT_COMPLETED',
      'PROJECT',
      projectId,
    ).catch(() => {});

    return completed;
  }

  // ───────────────────────────
  //  9. Delete Project (Soft Delete)
  // ───────────────────────────

  async remove(projectId: number, userId: number) {
    const project = await this.findProjectOrThrow(projectId);

    // Authorization: PROJECT_MANAGER, SUPER_ADMIN, or ADMIN
    const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
    const isElevated = await this.hasElevatedRole(userId);

    if (!isManager && !isElevated) {
      throw new ForbiddenException('Only a project manager, super admin, or admin can delete this project');
    }

    // Soft delete
    const deleted = await this.prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });

    // Activity Log: PROJECT_DELETED
    await this.activityLogService.create(
      userId,
      'PROJECT_DELETED',
      'PROJECT',
      projectId,
      JSON.stringify({ name: project.name, status: project.status }),
    ).catch(() => {});

    return deleted;
  }

  // ═══════════════════════════════════════════════
  //  PROJECT MEMBER & INVITATION METHODS
  // ═══════════════════════════════════════════════

  // ───────────────────────────
  //  3.1 Invite Member
  // ───────────────────────────

  async inviteMember(projectId: number, dto: InviteMemberDto, userId: number) {
    const { email, roleId } = dto;

    // Validate project is active
    const project = await this.validateProjectActive(projectId);

    // Authorization: PROJECT_MANAGER
    const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
    if (!isManager) {
      throw new ForbiddenException('Only a project manager can invite members');
    }

    // Validate role exists
    const role = await this.prisma.projectRole.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new BadRequestException('Role not found');
    }

    // Find invitee user
    const invitee = await this.prisma.user.findUnique({ where: { email } });
    if (!invitee) {
      // We still allow inviting non-registered users - they'll register and then accept
      // But we need to validate the owner check
    }

    // Cannot invite project owner
    if (invitee && invitee.id === project.ownerId) {
      throw new BadRequestException('Cannot invite the project owner');
    }

    // Check existing membership — allow re-invite if status is INACTIVE
    if (invitee) {
      const existingMember = await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: invitee.id } },
      });
      if (existingMember) {
        if (existingMember.status === ProjectMemberStatus.ACTIVE) {
          throw new ConflictException('User is already a member of this project');
        }
        // If INACTIVE (previously removed/left), allow resend
      }
    }

    // Generate invitation token
    const token = crypto.randomBytes(16).toString('hex');

    // Store in Redis
    const invitationTtl = Number(this.configService.get<number>('INVITATION_TTL', 604800));
    const inviteData = JSON.stringify({ projectId, email, roleId });
    await this.redisService.set(`${PROJECT_REDIS_KEYS.INVITE}${token}`, inviteData, invitationTtl);

    // Send invitation email
    await this.mailService.sendInvitationEmail(email, token);

    return { message: 'Invitation sent successfully' };
  }

  // ───────────────────────────
  //  3.2 Accept Invitation
  // ───────────────────────────

  async acceptInvitation(dto: AcceptInviteDto, authUser: { id: number; email: string }) {
    const { token } = dto;

    // Get invitation from Redis
    const inviteData = await this.redisService.get(`${PROJECT_REDIS_KEYS.INVITE}${token}`);
    if (!inviteData) {
      throw new BadRequestException('Invitation not found or has expired');
    }

    let parsed: { projectId: number; email: string; roleId: number };
    try {
      parsed = JSON.parse(inviteData);
    } catch {
      throw new BadRequestException('Invalid invitation data');
    }

    const { projectId, email, roleId } = parsed;

    // Email must match the invited email
    if (authUser.email !== email) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }

    // Validate role still exists
    const role = await this.prisma.projectRole.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new BadRequestException('The assigned role no longer exists');
    }

    // Validate project exists and is active
    const project = await this.validateProjectActive(projectId);

    // Check existing membership — reactivate if INACTIVE
    const existingMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: authUser.id } },
    });
    let memberId: number;
    if (existingMember) {
      if (existingMember.status === ProjectMemberStatus.ACTIVE) {
        // Clean up stale invitation
        await this.redisService.del(`${PROJECT_REDIS_KEYS.INVITE}${token}`);
        throw new ConflictException('You are already a member of this project');
      }
      // Reactivate existing member record
      await this.prisma.projectMember.update({
        where: { id: existingMember.id },
        data: {
          status: ProjectMemberStatus.ACTIVE,
          roleId,
          deletedAt: null,
          joinedAt: new Date(),
        },
      });
      memberId = existingMember.id;
    } else {
      // Create new member record
      const newMember = await this.prisma.projectMember.create({
        data: {
          projectId,
          userId: authUser.id,
          roleId,
        },
      });
      memberId = newMember.id;
    }

    // Delete invitation from Redis
    await this.redisService.del(`${PROJECT_REDIS_KEYS.INVITE}${token}`);

    // Notification: User added to project
    await this.notificationsService.create(
      authUser.id,
      'Added to Project',
      `You have been added to project "${project.name}".`,
    ).catch(() => {
      // Silently fail — notification should not block acceptance
    });

    // Activity Log: MEMBER_ADDED
    await this.activityLogService.create(
      authUser.id,
      'MEMBER_ADDED',
      'PROJECT_MEMBER',
      memberId,
      null,
      JSON.stringify({ role: role.name }),
    ).catch(() => {});

    return { message: 'Joined project successfully' };
  }

  // ───────────────────────────
  //  4. Get Project Members
  // ───────────────────────────

  async getMembers(projectId: number, userId: number) {
    const project = await this.findProjectOrThrow(projectId);

    // Authorization: Must be an active member of the project
    const isMember = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, status: ProjectMemberStatus.ACTIVE },
    });
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    // Fetch all active members with user and role info
    const members = await this.prisma.projectMember.findMany({
      where: { projectId, status: ProjectMemberStatus.ACTIVE },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
        role: {
          select: { id: true, name: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    // Flatten response to match API contract
    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      fullName: m.user.fullName,
      email: m.user.email,
      role: m.role.name,
      joinedAt: m.joinedAt,
    }));
  }

  // ───────────────────────────
  //  5. Get Member Detail
  // ───────────────────────────

  async getMemberDetail(projectId: number, memberId: number, userId: number) {
    const project = await this.findProjectOrThrow(projectId);

    // Authorization: Must be an active member of the project
    const isMember = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, status: ProjectMemberStatus.ACTIVE },
    });
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId, status: ProjectMemberStatus.ACTIVE },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        role: {
          select: { id: true, name: true },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this project');
    }

    // Flatten response
    return {
      id: member.id,
      userId: member.userId,
      fullName: member.user.fullName,
      email: member.user.email,
      avatarUrl: member.user.avatarUrl,
      role: member.role.name,
      roleId: member.role.id,
      joinedAt: member.joinedAt,
    };
  }

  // ───────────────────────────
  //  6. Update Member Role
  // ───────────────────────────

  async updateMemberRole(projectId: number, memberId: number, dto: UpdateMemberRoleDto, userId: number) {
    // Authorization: PROJECT_MANAGER
    const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
    if (!isManager) {
      throw new ForbiddenException('Only a project manager can update member roles');
    }

    // Member must belong to the project and be active
    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId, status: ProjectMemberStatus.ACTIVE },
      include: { project: { select: { ownerId: true } } },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this project');
    }

    // Cannot update the project owner's role
    if (member.userId === member.project.ownerId) {
      throw new BadRequestException('Cannot change the project owner\'s role');
    }

    // Role must exist
    const newRole = await this.prisma.projectRole.findUnique({ where: { id: dto.roleId } });
    if (!newRole) {
      throw new BadRequestException('Role not found');
    }

    // Cannot update to the same role
    if (member.roleId === dto.roleId) {
      throw new BadRequestException('Member already has this role');
    }

    // Update role
    await this.prisma.projectMember.update({
      where: { id: memberId },
      data: { roleId: dto.roleId },
    });

    // Fetch project name for notification
    const roleChangeProject = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    // Notification: User's role has changed
    await this.notificationsService.create(
      member.userId,
      'Role Changed',
      `Your role has been changed to ${newRole.name} in project "${roleChangeProject?.name || 'Unknown'}".`,
    ).catch(() => {
      // Silently fail
    });

    // Activity Log: MEMBER_ROLE_UPDATED
    await this.activityLogService.create(
      userId,
      'MEMBER_ROLE_UPDATED',
      'PROJECT_MEMBER',
      member.id,
      JSON.stringify({ role: member.roleId }),
      JSON.stringify({ role: dto.roleId }),
    ).catch(() => {});

    return { message: 'Role updated successfully' };
  }

  // ───────────────────────────
  //  7. Remove Member
  // ───────────────────────────

  async removeMember(projectId: number, memberId: number, userId: number) {
    const project = await this.findProjectOrThrow(projectId);

    // Authorization: PROJECT_MANAGER, ADMIN, or SUPER_ADMIN
    const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
    const isElevated = await this.hasElevatedRole(userId);

    if (!isManager && !isElevated) {
      throw new ForbiddenException('Only a project manager, admin, or super admin can remove members');
    }

    // Member must belong to the project
    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
    });
    if (!member) {
      throw new NotFoundException('Member not found in this project');
    }

    // Cannot remove the project owner
    if (member.userId === project.ownerId) {
      throw new BadRequestException('Cannot remove the project owner');
    }

    // A user cannot remove themselves
    if (member.userId === userId) {
      throw new BadRequestException('You cannot remove yourself. Use the leave endpoint instead');
    }

    // Cannot remove a member with incomplete tasks
    const incompleteTaskStatuses = [ChecklistStatus.OPEN, ChecklistStatus.IN_PROGRESS];
    const activeTasks = await this.prisma.checklistItem.findFirst({
      where: {
        assigneeId: member.userId,
        checklist: { projectId },
        status: { name: { in: incompleteTaskStatuses } },
      },
    });
    if (activeTasks) {
      throw new ConflictException('Member has active tasks');
    }

    // Soft delete: set status to INACTIVE and deleted_at
    await this.prisma.projectMember.update({
      where: { id: memberId },
      data: { status: ProjectMemberStatus.INACTIVE, deletedAt: new Date() },
    });

    // Activity Log: MEMBER_REMOVED
    await this.activityLogService.create(
      userId,
      'MEMBER_REMOVED',
      'PROJECT_MEMBER',
      member.id,
      JSON.stringify({ userId: member.userId }),
    ).catch(() => {});

    return { message: 'Member removed successfully' };
  }

  // ───────────────────────────
  //  8. Leave Project
  // ───────────────────────────

  async leaveProject(projectId: number, userId: number) {
    const project = await this.findProjectOrThrow(projectId);

    // Must be a current member
    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId },
    });
    if (!member) {
      throw new BadRequestException('You are not a member of this project');
    }

    // PROJECT_MANAGER cannot leave if they are the last remaining manager
    const managerRole = await this.prisma.projectRole.findUnique({ where: { name: 'PROJECT_MANAGER' } });
    if (managerRole && member.roleId === managerRole.id) {
      const managerCount = await this.prisma.projectMember.count({
        where: { projectId, roleId: managerRole.id },
      });
      if (managerCount <= 1) {
        throw new BadRequestException('Cannot leave the project as the last remaining manager');
      }
    }

    // Cannot leave if they have incomplete tasks
    const activeTasks = await this.prisma.checklistItem.findFirst({
      where: {
        assigneeId: userId,
        checklist: { projectId },
        status: { name: { in: [ChecklistStatus.OPEN, ChecklistStatus.IN_PROGRESS] } },
      },
    });
    if (activeTasks) {
      throw new ConflictException('You have active tasks. Please complete or reassign them before leaving');
    }

    // Soft delete: set status to INACTIVE and deleted_at
    await this.prisma.projectMember.update({
      where: { id: member.id },
      data: { status: ProjectMemberStatus.INACTIVE, deletedAt: new Date() },
    });

    return { message: 'Left project successfully' };
  }
}
