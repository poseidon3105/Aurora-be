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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const projects_service_1 = require("./projects.service");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const create_project_dto_1 = require("./dto/create-project.dto");
const update_project_dto_1 = require("./dto/update-project.dto");
const invite_member_dto_1 = require("./dto/invite-member.dto");
const accept_invite_dto_1 = require("./dto/accept-invite.dto");
const update_member_role_dto_1 = require("./dto/update-member-role.dto");
let ProjectsController = class ProjectsController {
    constructor(projectsService) {
        this.projectsService = projectsService;
    }
    async create(dto, user) {
        return this.projectsService.create(dto, user.id);
    }
    async findAll(user) {
        return this.projectsService.findAll(user.id);
    }
    async findOne(projectId, user) {
        return this.projectsService.findOne(projectId, user.id);
    }
    async update(projectId, dto, user) {
        return this.projectsService.update(projectId, dto, user.id);
    }
    async archive(projectId, user) {
        return this.projectsService.archive(projectId, user.id);
    }
    async complete(projectId, user) {
        return this.projectsService.complete(projectId, user.id);
    }
    async remove(projectId, user) {
        return this.projectsService.remove(projectId, user.id);
    }
    async inviteMember(projectId, dto, user) {
        return this.projectsService.inviteMember(projectId, dto, user.id);
    }
    async acceptInvitation(dto, user) {
        return this.projectsService.acceptInvitation(dto, user);
    }
    async getMembers(projectId, user) {
        return this.projectsService.getMembers(projectId, user.id);
    }
    async getMemberDetail(projectId, memberId, user) {
        return this.projectsService.getMemberDetail(projectId, memberId, user.id);
    }
    async updateMemberRole(projectId, memberId, dto, user) {
        return this.projectsService.updateMemberRole(projectId, memberId, dto, user.id);
    }
    async removeMember(projectId, memberId, user) {
        return this.projectsService.removeMember(projectId, memberId, user.id);
    }
    async leaveProject(projectId, user) {
        return this.projectsService.leaveProject(projectId, user.id);
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new project' }),
    (0, swagger_1.ApiBody)({ type: create_project_dto_1.CreateProjectDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Project created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or end date before start date' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_project_dto_1.CreateProjectDto, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get all projects owned by or shared with the user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of projects returned' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':projectId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get project details by ID' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Project details returned' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a member, super admin, or admin' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':projectId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update project' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiBody)({ type: update_project_dto_1.UpdateProjectDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Project updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or project is deleted' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a manager, super admin, or admin' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_project_dto_1.UpdateProjectDto, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':projectId/archive'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Archive a project (manager only)' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Project archived successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project manager' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Project is not active' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "archive", null);
__decorate([
    (0, common_1.Patch)(':projectId/complete'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Complete a project (manager only)' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Project completed successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project manager' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Project is not active' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "complete", null);
__decorate([
    (0, common_1.Delete)(':projectId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Soft delete a project (manager, super admin, or admin)' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Project deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a manager, super admin, or admin' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':projectId/invite'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Invite a user to join the project (manager only)' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiBody)({ type: invite_member_dto_1.InviteMemberDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Invitation sent successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or business rule violation' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project manager' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'User is already a member' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, invite_member_dto_1.InviteMemberDto, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "inviteMember", null);
__decorate([
    (0, common_1.Post)('invitations/accept'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Accept a project invitation' }),
    (0, swagger_1.ApiBody)({ type: accept_invite_dto_1.AcceptInviteDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Joined project successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid or expired invitation' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Email does not match the invitation' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Already a member' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [accept_invite_dto_1.AcceptInviteDto, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "acceptInvitation", null);
__decorate([
    (0, common_1.Get)(':projectId/members'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get all members of a project' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of project members' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getMembers", null);
__decorate([
    (0, common_1.Get)(':projectId/members/:memberId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get member details' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiParam)({ name: 'memberId', type: Number, description: 'Member ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Member details' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project or member not found' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('memberId', common_1.ParseIntPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getMemberDetail", null);
__decorate([
    (0, common_1.Patch)(':projectId/members/:memberId/role'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update a member\'s role (manager only)' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiParam)({ name: 'memberId', type: Number, description: 'Member ID' }),
    (0, swagger_1.ApiBody)({ type: update_member_role_dto_1.UpdateMemberRoleDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Role updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid role or cannot update owner' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project manager' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project or member not found' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('memberId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, update_member_role_dto_1.UpdateMemberRoleDto, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateMemberRole", null);
__decorate([
    (0, common_1.Delete)(':projectId/members/:memberId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a member from the project (manager, admin, or super admin)' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiParam)({ name: 'memberId', type: Number, description: 'Member ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Member removed successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Cannot remove owner or self' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - insufficient permissions' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project or member not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Member has active tasks' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('memberId', common_1.ParseIntPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "removeMember", null);
__decorate([
    (0, common_1.Post)(':projectId/leave'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Leave a project' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Left project successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Cannot leave as last manager or has active tasks' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "leaveProject", null);
exports.ProjectsController = ProjectsController = __decorate([
    (0, swagger_1.ApiTags)('Projects'),
    (0, common_1.Controller)('projects'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService])
], ProjectsController);
//# sourceMappingURL=projects.controller.js.map