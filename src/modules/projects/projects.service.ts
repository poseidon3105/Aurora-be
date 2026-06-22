import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
      },
    });
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

    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.ARCHIVED },
    });
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

    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.COMPLETED },
    });
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
    return this.prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });
  }
}
