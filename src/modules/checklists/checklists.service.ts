import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { ChangeChecklistStatusDto } from './dto/change-checklist-status.dto';
import { ChecklistStatus, ProjectStatus, ProjectMemberStatus } from '@prisma/client';

@Injectable()
export class ChecklistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ───────────────────────────
  //  Helper: Find checklist or throw 404
  // ───────────────────────────

  private async findChecklistOrThrow(checklistId: number) {
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: checklistId },
    });
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }
    return checklist;
  }

  // ───────────────────────────
  //  Helper: Check if user is an active project member
  // ───────────────────────────

  private async isProjectMember(projectId: number, userId: number): Promise<boolean> {
    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, status: ProjectMemberStatus.ACTIVE },
    });
    return !!member;
  }

  // ───────────────────────────
  //  Helper: Check if user has a specific project role (active membership)
  // ───────────────────────────

  private async hasProjectRole(
    projectId: number,
    userId: number,
    roleName: string,
  ): Promise<boolean> {
    const role = await this.prisma.projectRole.findUnique({ where: { name: roleName } });
    if (!role) return false;
    const membership = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, roleId: role.id, status: ProjectMemberStatus.ACTIVE },
    });
    return !!membership;
  }

  // ───────────────────────────
  //  3. Create Checklist
  // ───────────────────────────

  async create(projectId: number, dto: CreateChecklistDto, userId: number) {
    // Validate project exists
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.deletedAt) {
      throw new BadRequestException('Project has been deleted');
    }
    if (project.status !== ProjectStatus.ACTIVE) {
      throw new BadRequestException('Project must be ACTIVE to create checklists');
    }

    // Authorization: PROJECT_MANAGER or PROJECT_MEMBER
    const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
    const isMember = await this.hasProjectRole(projectId, userId, 'PROJECT_MEMBER');
    if (!isManager && !isMember) {
      throw new ForbiddenException(
        'Only a project manager or project member can create checklists',
      );
    }

    const { title, description, dueDate } = dto;

    // Validate dueDate
    if (dueDate) {
      const due = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (due < today) {
        throw new BadRequestException('Due date must be greater than or equal to today');
      }
      if (project.endDate && due >= project.endDate) {
        throw new BadRequestException('Due date must be before the project end date');
      }
    }

    // Create checklist
    const checklist = await this.prisma.checklist.create({
      data: {
        projectId,
        title,
        description,
        createdById: userId,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: ChecklistStatus.OPEN,
      },
    });

    // Activity Log: CHECKLIST_CREATED
    await this.activityLogService.create(
      userId,
      'CHECKLIST_CREATED',
      'CHECKLIST',
      checklist.id,
      null,
      JSON.stringify({ title, description }),
    ).catch(() => {});

    return checklist;
  }

  // ───────────────────────────
  //  4. Get Checklists (by project)
  // ───────────────────────────

  async findAll(projectId: number, userId: number) {
    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    return this.prisma.checklist.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      orderBy: { id: 'desc' },
    });
  }

  // ───────────────────────────
  //  5. Get Checklist Detail
  // ───────────────────────────

  async findOne(checklistId: number, userId: number) {
    const checklist = await this.findChecklistOrThrow(checklistId);

    // Authorization: Must be a member of the checklist's project
    const isMember = await this.isProjectMember(checklist.projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    // Task counts
    const taskCount = await this.prisma.checklistItem.count({
      where: { checklistId, deletedAt: null },
    });

    const doneStatus = await this.prisma.taskStatus.findFirst({
      where: { name: 'DONE' },
    });

    const completedTaskCount = doneStatus
      ? await this.prisma.checklistItem.count({
          where: {
            checklistId,
            deletedAt: null,
            statusId: doneStatus.id,
          },
        })
      : 0;

    return {
      ...checklist,
      taskCount,
      completedTaskCount,
    };
  }

  // ───────────────────────────
  //  6. Update Checklist
  // ───────────────────────────

  async update(checklistId: number, dto: UpdateChecklistDto, userId: number) {
    const checklist = await this.findChecklistOrThrow(checklistId);

    // Cannot update deleted checklists
    if (checklist.deletedAt) {
      throw new BadRequestException('Cannot update a deleted checklist');
    }

    // Authorization: PROJECT_MANAGER or Checklist Creator
    const isManager = await this.hasProjectRole(checklist.projectId, userId, 'PROJECT_MANAGER');
    const isCreator = checklist.createdById === userId;

    if (!isManager && !isCreator) {
      throw new ForbiddenException(
        'Only a project manager or the checklist creator can update this checklist',
      );
    }

    // Validate dueDate with same rules as create
    if (dto.dueDate) {
      const project = await this.prisma.project.findUnique({
        where: { id: checklist.projectId },
      });
      if (project) {
        const due = new Date(dto.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (due < today) {
          throw new BadRequestException('Due date must be greater than or equal to today');
        }
        if (project.endDate && due >= project.endDate) {
          throw new BadRequestException('Due date must be before the project end date');
        }
      }
    }

    const updated = await this.prisma.checklist.update({
      where: { id: checklistId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
      },
    });

    // Activity Log: CHECKLIST_UPDATED
    await this.activityLogService.create(
      userId,
      'CHECKLIST_UPDATED',
      'CHECKLIST',
      checklistId,
      JSON.stringify({ title: checklist.title, description: checklist.description }),
      JSON.stringify({
        title: dto.title ?? checklist.title,
        description: dto.description !== undefined ? dto.description : checklist.description,
      }),
    ).catch(() => {});

    return updated;
  }

  // ───────────────────────────
  //  7. Change Checklist Status
  // ───────────────────────────

  async changeStatus(checklistId: number, dto: ChangeChecklistStatusDto, userId: number) {
    const checklist = await this.findChecklistOrThrow(checklistId);

    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(checklist.projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    const { status: targetStatus } = dto;
    const currentStatus = checklist.status;

    // Validate status flow: OPEN → IN_PROGRESS → DONE
    const validTransitions: Record<ChecklistStatus, ChecklistStatus[]> = {
      [ChecklistStatus.OPEN]: [ChecklistStatus.IN_PROGRESS],
      [ChecklistStatus.IN_PROGRESS]: [ChecklistStatus.DONE],
      [ChecklistStatus.DONE]: [],
    };

    if (!validTransitions[currentStatus].includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${targetStatus}. Allowed flow: OPEN → IN_PROGRESS → DONE`,
      );
    }

    const result = await this.prisma.checklist.update({
      where: { id: checklistId },
      data: { status: targetStatus },
    });

    // Activity Log: CHECKLIST_STATUS_CHANGED
    await this.activityLogService.create(
      userId,
      'CHECKLIST_STATUS_CHANGED',
      'CHECKLIST',
      checklistId,
      JSON.stringify({ status: currentStatus }),
      JSON.stringify({ status: targetStatus }),
    ).catch(() => {});

    return result;
  }

  // ───────────────────────────
  //  8. Delete Checklist (Soft Delete)
  // ───────────────────────────

  async remove(checklistId: number, userId: number) {
    const checklist = await this.findChecklistOrThrow(checklistId);

    // Authorization: PROJECT_MANAGER or Checklist Creator
    const isManager = await this.hasProjectRole(checklist.projectId, userId, 'PROJECT_MANAGER');
    const isCreator = checklist.createdById === userId;

    if (!isManager && !isCreator) {
      throw new ForbiddenException(
        'Only a project manager or the checklist creator can delete this checklist',
      );
    }

    // Check for incomplete tasks (OPEN or IN_PROGRESS)
    const openStatus = await this.prisma.taskStatus.findFirst({
      where: { name: 'OPEN' },
    });
    const inProgressStatus = await this.prisma.taskStatus.findFirst({
      where: { name: 'IN_PROGRESS' },
    });

    const incompleteStatusIds = [openStatus, inProgressStatus]
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => s.id);

    if (incompleteStatusIds.length > 0) {
      const incompleteTask = await this.prisma.checklistItem.findFirst({
        where: {
          checklistId,
          deletedAt: null,
          statusId: { in: incompleteStatusIds },
        },
      });
      if (incompleteTask) {
        throw new ConflictException('Cannot delete checklist with incomplete tasks');
      }
    } else {
      // Fallback: if no status records exist, block deletion if any items exist
      const anyTask = await this.prisma.checklistItem.findFirst({
        where: { checklistId, deletedAt: null },
      });
      if (anyTask) {
        throw new ConflictException('Cannot delete checklist with incomplete tasks');
      }
    }

    // Soft delete
    const deleted = await this.prisma.checklist.update({
      where: { id: checklistId },
      data: { deletedAt: new Date() },
    });

    // Activity Log: CHECKLIST_DELETED
    await this.activityLogService.create(
      userId,
      'CHECKLIST_DELETED',
      'CHECKLIST',
      checklistId,
      JSON.stringify({ title: checklist.title, status: checklist.status }),
    ).catch(() => {});

    return deleted;
  }
}
