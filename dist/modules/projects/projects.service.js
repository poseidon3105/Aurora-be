"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ProjectsService = class ProjectsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureProjectRole(name) {
        let role = await this.prisma.projectRole.findUnique({ where: { name } });
        if (!role) {
            role = await this.prisma.projectRole.create({ data: { name } });
        }
        return role;
    }
    async hasElevatedRole(userId) {
        const elevatedRoles = ['SUPER_ADMIN', 'ADMIN'];
        const roles = await this.prisma.systemRole.findMany({
            where: { name: { in: elevatedRoles } },
        });
        if (roles.length === 0)
            return false;
        const roleIds = roles.map((r) => r.id);
        const assignment = await this.prisma.userSystemRole.findFirst({
            where: { userId, roleId: { in: roleIds } },
        });
        return !!assignment;
    }
    async hasProjectRole(projectId, userId, roleName) {
        const role = await this.prisma.projectRole.findUnique({ where: { name: roleName } });
        if (!role)
            return false;
        const membership = await this.prisma.projectMember.findFirst({
            where: { projectId, userId, roleId: role.id },
        });
        return !!membership;
    }
    async findProjectOrThrow(projectId) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        return project;
    }
    async create(dto, userId) {
        const { name, description, startDate, endDate } = dto;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (startDate && new Date(startDate) < today) {
            throw new common_1.BadRequestException('Start date must be greater than or equal to today\'s date');
        }
        if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
            throw new common_1.BadRequestException('End date must be later than start date');
        }
        const project = await this.prisma.project.create({
            data: {
                name,
                description,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                ownerId: userId,
                status: client_1.ProjectStatus.ACTIVE,
            },
        });
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
    async findAll(userId) {
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
    async findOne(projectId, userId) {
        const project = await this.findProjectOrThrow(projectId);
        const isMember = await this.prisma.projectMember.findFirst({
            where: { projectId, userId },
        });
        const isElevated = await this.hasElevatedRole(userId);
        if (!isMember && !isElevated) {
            throw new common_1.ForbiddenException('You do not have access to this project');
        }
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
    async update(projectId, dto, userId) {
        const project = await this.findProjectOrThrow(projectId);
        if (project.deletedAt) {
            throw new common_1.BadRequestException('Cannot modify a deleted project');
        }
        const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
        const isElevated = await this.hasElevatedRole(userId);
        if (!isManager && !isElevated) {
            throw new common_1.ForbiddenException('Only a project manager, super admin, or admin can update this project');
        }
        const endDate = dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : project.endDate;
        if (project.startDate && endDate && endDate <= project.startDate) {
            throw new common_1.BadRequestException('End date must be later than start date');
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
    async archive(projectId, userId) {
        const project = await this.findProjectOrThrow(projectId);
        const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
        if (!isManager) {
            throw new common_1.ForbiddenException('Only a project manager can archive this project');
        }
        if (project.status !== client_1.ProjectStatus.ACTIVE) {
            throw new common_1.ConflictException('Only active projects can be archived');
        }
        return this.prisma.project.update({
            where: { id: projectId },
            data: { status: client_1.ProjectStatus.ARCHIVED },
        });
    }
    async complete(projectId, userId) {
        const project = await this.findProjectOrThrow(projectId);
        const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
        if (!isManager) {
            throw new common_1.ForbiddenException('Only a project manager can complete this project');
        }
        if (project.status !== client_1.ProjectStatus.ACTIVE) {
            throw new common_1.ConflictException('Only active projects can be completed');
        }
        return this.prisma.project.update({
            where: { id: projectId },
            data: { status: client_1.ProjectStatus.COMPLETED },
        });
    }
    async remove(projectId, userId) {
        const project = await this.findProjectOrThrow(projectId);
        const isManager = await this.hasProjectRole(projectId, userId, 'PROJECT_MANAGER');
        const isElevated = await this.hasElevatedRole(userId);
        if (!isManager && !isElevated) {
            throw new common_1.ForbiddenException('Only a project manager, super admin, or admin can delete this project');
        }
        return this.prisma.project.update({
            where: { id: projectId },
            data: { deletedAt: new Date() },
        });
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map