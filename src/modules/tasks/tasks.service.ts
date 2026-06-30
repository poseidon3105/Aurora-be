import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { ChangeTaskStatusDto } from './dto/change-task-status.dto';
import { ReorderTaskDto } from './dto/reorder-task.dto';
import { ChecklistStatus, ProjectStatus, ProjectMemberStatus, UserStatus } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ───────────────────────────
  //  Helper: Find task or throw 404
  // ───────────────────────────

  private async findTaskOrThrow(taskId: number) {
    const task = await this.prisma.checklistItem.findUnique({
      where: { id: taskId },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
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
  //  Helper: Validate assignee is active and a project member
  // ───────────────────────────

  private async validateAssignee(assigneeId: number, projectId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: assigneeId } });
    if (!user) {
      throw new BadRequestException('Assignee not found');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Assignee is not active');
    }
    const isMember = await this.isProjectMember(projectId, assigneeId);
    if (!isMember) {
      throw new BadRequestException('Assignee is not a member of this project');
    }
    return user;
  }

  // ───────────────────────────
  //  Helper: Auto-update checklist status based on task completion
  // ───────────────────────────

  private async autoUpdateChecklistStatus(checklistId: number) {
    // Find the DONE status
    const doneStatus = await this.prisma.taskStatus.findFirst({
      where: { name: 'DONE' },
    });
    if (!doneStatus) return;

    // Count total non-deleted tasks
    const totalTasks = await this.prisma.checklistItem.count({
      where: { checklistId, deletedAt: null },
    });

    if (totalTasks === 0) {
      // No tasks — set checklist back to OPEN
      await this.prisma.checklist.update({
        where: { id: checklistId },
        data: { status: ChecklistStatus.OPEN },
      });
      return;
    }

    // Count DONE tasks
    const doneTasks = await this.prisma.checklistItem.count({
      where: { checklistId, deletedAt: null, statusId: doneStatus.id },
    });

    if (doneTasks === totalTasks) {
      // All tasks DONE → Checklist DONE
      await this.prisma.checklist.update({
        where: { id: checklistId },
        data: { status: ChecklistStatus.DONE },
      });
    } else {
      // At least one task not DONE → Checklist IN_PROGRESS
      await this.prisma.checklist.update({
        where: { id: checklistId },
        data: { status: ChecklistStatus.IN_PROGRESS },
      });
    }
  }

  // ═══════════════════════════════════════════════
  //  3. Create Task
  // ═══════════════════════════════════════════════

  async create(checklistId: number, dto: CreateTaskDto, userId: number) {
    // Validate checklist exists
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: checklistId },
      include: { project: true },
    });
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }
    if (checklist.deletedAt) {
      throw new BadRequestException('Checklist has been deleted');
    }

    // Project validation
    const project = checklist.project;
    if (project.deletedAt) {
      throw new BadRequestException('Project has been deleted');
    }
    if (project.status !== ProjectStatus.ACTIVE) {
      throw new BadRequestException('Project must be ACTIVE to create tasks');
    }

    // Authorization: PROJECT_MANAGER or PROJECT_MEMBER
    const isManager = await this.hasProjectRole(project.id, userId, 'PROJECT_MANAGER');
    const isMember = await this.hasProjectRole(project.id, userId, 'PROJECT_MEMBER');
    if (!isManager && !isMember) {
      throw new ForbiddenException('Only a project manager or project member can create tasks');
    }

    const { title, description, assigneeId, dueDate } = dto;

    // Validate assignee if provided
    if (assigneeId) {
      await this.validateAssignee(assigneeId, project.id);
    }

    // Validate dueDate against checklist's dueDate
    if (dueDate) {
      const due = new Date(dueDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (due < now) {
        throw new BadRequestException('Due date must be greater than or equal to today');
      }
      if (checklist.dueDate && due > new Date(checklist.dueDate)) {
        throw new BadRequestException('Task due date must be on or before the checklist due date');
      }
    }

    // Get the TODO status
    const todoStatus = await this.prisma.taskStatus.findFirst({
      where: { name: 'TODO' },
    });
    if (!todoStatus) {
      throw new BadRequestException('Default status (TODO) not found');
    }

    // Get max orderIndex
    const maxOrderTask = await this.prisma.checklistItem.findFirst({
      where: { checklistId, deletedAt: null },
      orderBy: { orderIndex: 'desc' },
    });
    const orderIndex = (maxOrderTask?.orderIndex ?? -1) + 1;

    // Create task
    const task = await this.prisma.checklistItem.create({
      data: {
        checklistId,
        title,
        description,
        assigneeId: assigneeId ?? null,
        statusId: todoStatus.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        orderIndex,
      },
    });

    // If tasks are created when checklist was DONE, revert to OPEN
    if (checklist.status === ChecklistStatus.DONE) {
      await this.prisma.checklist.update({
        where: { id: checklistId },
        data: { status: ChecklistStatus.OPEN },
      });
    }

    return {
      id: task.id,
      title: task.title,
      status: 'TODO',
    };
  }

  // ═══════════════════════════════════════════════
  //  4. Get Tasks (by checklist)
  // ═══════════════════════════════════════════════

  async findAll(checklistId: number, userId: number) {
    // Validate checklist exists
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: checklistId },
    });
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(checklist.projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    return this.prisma.checklistItem.findMany({
      where: {
        checklistId,
        deletedAt: null,
      },
      orderBy: { orderIndex: 'asc' },
    });
  }

  // ═══════════════════════════════════════════════
  //  5. Get Task Detail
  // ═══════════════════════════════════════════════

  async findOne(taskId: number, userId: number) {
    const task = await this.prisma.checklistItem.findUnique({
      where: { id: taskId },
      include: {
        checklist: { select: { projectId: true } },
        assignee: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        status: {
          select: { id: true, name: true, color: true },
        },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
          },
        },
      },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Authorization: Must be a member of the project
    const isMember = await this.isProjectMember(task.checklist.projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    return {
      ...task,
      tags: task.tags.map((tt) => tt.tag),
    };
  }

  // ═══════════════════════════════════════════════
  //  6. Update Task
  // ═══════════════════════════════════════════════

  async update(taskId: number, dto: UpdateTaskDto, userId: number) {
    const task = await this.findTaskOrThrow(taskId);

    // Cannot update deleted tasks
    if (task.deletedAt) {
      throw new BadRequestException('Cannot update a deleted task');
    }

    // Get the checklist + project for authorization and validation
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: task.checklistId },
      include: { project: true },
    });
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    // Authorization: PROJECT_MANAGER or Task Assignee
    const isManager = await this.hasProjectRole(checklist.project.id, userId, 'PROJECT_MANAGER');
    const isAssignee = task.assigneeId === userId;

    if (!isManager && !isAssignee) {
      throw new ForbiddenException('Only a project manager or the task assignee can update this task');
    }

    // Validate assignee if being updated
    if (dto.assigneeId !== undefined) {
      if (dto.assigneeId) {
        await this.validateAssignee(dto.assigneeId, checklist.project.id);
      }
    }

    // Validate dueDate if provided
    if (dto.dueDate) {
      const due = new Date(dto.dueDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (due < now) {
        throw new BadRequestException('Due date must be greater than or equal to today');
      }
      if (checklist.dueDate && due > new Date(checklist.dueDate)) {
        throw new BadRequestException('Task due date must be on or before the checklist due date');
      }
    }

    await this.prisma.checklistItem.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.assigneeId !== undefined && {
          assigneeId: dto.assigneeId || null,
        }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
      },
    });

    // Notification: Task unassigned
    if (dto.assigneeId !== undefined && !dto.assigneeId && task.assigneeId) {
      await this.notificationsService.create(
        task.assigneeId,
        'Task Unassigned',
        `You have been removed from task "${task.title}".`,
      ).catch(() => {});
    }

    // Notification: Task assigned to someone new via update
    if (dto.assigneeId !== undefined && dto.assigneeId && dto.assigneeId !== task.assigneeId) {
      const assigner = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true },
      });
      const assignerName = assigner?.fullName || 'A user';
      await this.notificationsService.create(
        dto.assigneeId,
        'Task Assigned',
        `${assignerName} assigned you to task "${task.title}".`,
      ).catch(() => {});
    }

    return this.prisma.checklistItem.findUnique({
      where: { id: taskId },
    });
  }

  // ═══════════════════════════════════════════════
  //  7. Assign Task
  // ═══════════════════════════════════════════════

  async assign(taskId: number, dto: AssignTaskDto, userId: number) {
    const task = await this.findTaskOrThrow(taskId);

    // Get checklist + project
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: task.checklistId },
      include: { project: true },
    });
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    // Authorization: PROJECT_MANAGER or current assignee (can reassign)
    const isManager = await this.hasProjectRole(checklist.project.id, userId, 'PROJECT_MANAGER');
    const isCurrentAssignee = task.assigneeId === userId;
    if (!isManager && !isCurrentAssignee) {
      throw new ForbiddenException('Only a project manager or the current assignee can assign tasks');
    }

    // Validate the new assignee
    await this.validateAssignee(dto.assigneeId, checklist.project.id);

    await this.prisma.checklistItem.update({
      where: { id: taskId },
      data: { assigneeId: dto.assigneeId },
    });

    // Notification: Task assigned (notify the new assignee)
    const assigner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    const assignerName = assigner?.fullName || 'A user';
    await this.notificationsService.create(
      dto.assigneeId!,
      'Task Assigned',
      `${assignerName} assigned you to task "${task.title}".`,
    ).catch(() => {});

    return this.prisma.checklistItem.findUnique({
      where: { id: taskId },
    });
  }

  // ═══════════════════════════════════════════════
  //  8. Change Task Status
  // ═══════════════════════════════════════════════

  async changeStatus(taskId: number, dto: ChangeTaskStatusDto, userId: number) {
    const task = await this.findTaskOrThrow(taskId);

    // Get checklist + project for auth
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: task.checklistId },
      include: { project: true },
    });
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(checklist.project.id, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    // Status must exist
    const newStatus = await this.prisma.taskStatus.findUnique({
      where: { id: dto.statusId },
    });
    if (!newStatus) {
      throw new BadRequestException('Status not found');
    }

    // Determine if the new status is DONE
    const doneStatus = await this.prisma.taskStatus.findFirst({
      where: { name: 'DONE' },
    });

    let completedAt: Date | null = null;
    if (doneStatus && dto.statusId === doneStatus.id) {
      // If status becomes DONE → completed_at = NOW()
      completedAt = new Date();
    }
    // If status changes from DONE to another → completed_at = NULL (already null by default)

    // Update the task
    await this.prisma.checklistItem.update({
      where: { id: taskId },
      data: {
        statusId: dto.statusId,
        ...(doneStatus && { completedAt }),
      },
    });

    // Auto-update checklist status
    await this.autoUpdateChecklistStatus(task.checklistId);

    // Notification: Task completed by someone else
    if (doneStatus && dto.statusId === doneStatus.id && task.assigneeId && task.assigneeId !== userId) {
      await this.notificationsService.create(
        task.assigneeId,
        'Task Completed',
        `Task "${task.title}" has been completed.`,
      ).catch(() => {});
    }

    return {
      message: 'Status updated successfully',
      status: newStatus.name,
      completedAt,
    };
  }

  // ═══════════════════════════════════════════════
  //  9. Reorder Tasks
  // ═══════════════════════════════════════════════

  async reorder(dto: ReorderTaskDto, userId: number) {
    const { taskId, newPosition } = dto;

    const task = await this.findTaskOrThrow(taskId);

    // Get the checklist to find the project
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: task.checklistId },
    });
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(checklist.projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    // Get all tasks in the same checklist (excluding deleted)
    const allTasks = await this.prisma.checklistItem.findMany({
      where: { checklistId: task.checklistId, deletedAt: null },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, orderIndex: true },
    });

    // Build the current sorted list of task IDs
    const taskIds = allTasks.map((t) => t.id);

    // Check if the task exists in the list
    const currentIndex = taskIds.indexOf(taskId);
    if (currentIndex === -1) {
      throw new BadRequestException('Task not found in checklist');
    }

    // Remove from current position and insert at new position
    taskIds.splice(currentIndex, 1);
    const clampedPosition = Math.min(newPosition, taskIds.length);
    taskIds.splice(clampedPosition, 0, taskId);

    // Update all orderIndex values
    const updates = taskIds.map((id, index) =>
      this.prisma.checklistItem.update({
        where: { id },
        data: { orderIndex: index },
      }),
    );

    await this.prisma.$transaction(updates);

    return { message: 'Tasks reordered successfully' };
  }

  // ═══════════════════════════════════════════════
  //  10. Delete Task (Soft Delete)
  // ═══════════════════════════════════════════════

  async remove(taskId: number, userId: number) {
    const task = await this.findTaskOrThrow(taskId);

    // Get checklist + project for auth
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: task.checklistId },
      include: { project: true },
    });
    if (!checklist) {
      throw new NotFoundException('Checklist not found');
    }

    // Authorization: PROJECT_MANAGER or Task Creator
    // Note: The schema doesn't have a "created by" field on ChecklistItem,
    // so we use the task's assignee as a proxy for "creator" since tasks are
    // typically self-created. We check if the user is the assignee.
    const isManager = await this.hasProjectRole(checklist.project.id, userId, 'PROJECT_MANAGER');
    // For "task creator" - the best proxy is if they're the assignee or a project member
    // Actually, looking at the requirements: "PROJECT_MANAGER, Task Creator"
    // There's no created_by on ChecklistItem, so we'll authorize if they're the assignee
    const isAssignee = task.assigneeId === userId;

    if (!isManager && !isAssignee) {
      throw new ForbiddenException('Only a project manager or the task creator can delete this task');
    }

    // Soft delete
    await this.prisma.checklistItem.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    // Auto-update checklist status after task deletion
    await this.autoUpdateChecklistStatus(task.checklistId);

    return { message: 'Task deleted successfully' };
  }

  // ═══════════════════════════════════════════════
  //  11. Task Summary (Dashboard)
  // ═══════════════════════════════════════════════

  async getTaskSummary(projectId: number, userId: number) {
    // Authorization: Must be a project member
    const isMember = await this.isProjectMember(projectId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    // Get all statuses
    const statuses = await this.prisma.taskStatus.findMany({
      orderBy: { orderIndex: 'asc' },
    });

    // Get all non-deleted task IDs across all checklists in the project
    const totalTasks = await this.prisma.checklistItem.count({
      where: {
        deletedAt: null,
        checklist: { projectId, deletedAt: null },
      },
    });

    // Build status-wise counts
    const statusCounts: Record<string, number> = {};
    for (const status of statuses) {
      const count = await this.prisma.checklistItem.count({
        where: {
          deletedAt: null,
          statusId: status.id,
          checklist: { projectId, deletedAt: null },
        },
      });

      // Map status name to camelCase key
      const key = this.toCamelCaseKey(status.name || 'UNKNOWN');
      statusCounts[key] = count;
    }

    return {
      totalTasks,
      ...statusCounts,
    };
  }

  // ───────────────────────────
  //  Helper: Convert status name to camelCase key
  // ───────────────────────────

  private toCamelCaseKey(name: string): string {
    return name
      .toLowerCase()
      .split('_')
      .map((word, index) =>
        index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
      )
      .join('');
  }
}
