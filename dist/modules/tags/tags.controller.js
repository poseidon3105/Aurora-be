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
exports.TagsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const tags_service_1 = require("./tags.service");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const create_tag_dto_1 = require("./dto/create-tag.dto");
const update_tag_dto_1 = require("./dto/update-tag.dto");
const assign_tag_dto_1 = require("./dto/assign-tag.dto");
let TagsController = class TagsController {
    constructor(tagsService) {
        this.tagsService = tagsService;
    }
    async create(projectId, dto, user) {
        return this.tagsService.create(projectId, dto, user.id);
    }
    async findAll(projectId, user) {
        return this.tagsService.findAll(projectId, user.id);
    }
    async update(tagId, dto, user) {
        return this.tagsService.update(tagId, dto, user.id);
    }
    async remove(tagId, user) {
        return this.tagsService.remove(tagId, user.id);
    }
    async assignToTask(taskId, dto, user) {
        return this.tagsService.assignToTask(taskId, dto, user.id);
    }
    async removeFromTask(taskId, tagId, user) {
        return this.tagsService.removeFromTask(taskId, tagId, user.id);
    }
    async getTaskTags(taskId, user) {
        return this.tagsService.getTaskTags(taskId, user.id);
    }
};
exports.TagsController = TagsController;
__decorate([
    (0, common_1.Post)('projects/:projectId/tags'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new tag in a project (manager, admin, or super admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiBody)({ type: create_tag_dto_1.CreateTagDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Tag created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or project is deleted' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - insufficient permissions' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Tag name already exists in this project' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_tag_dto_1.CreateTagDto, Object]),
    __metadata("design:returntype", Promise)
], TagsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/tags'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get all tags for a project' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of tags returned' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], TagsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Put)('tags/:tagId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update a tag (manager, admin, or super admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'tagId', type: Number, description: 'Tag ID' }),
    (0, swagger_1.ApiBody)({ type: update_tag_dto_1.UpdateTagDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tag updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - insufficient permissions' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Tag not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Tag name already exists in this project' }),
    __param(0, (0, common_1.Param)('tagId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_tag_dto_1.UpdateTagDto, Object]),
    __metadata("design:returntype", Promise)
], TagsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('tags/:tagId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Hard delete a tag and all its task associations (manager, admin, or super admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'tagId', type: Number, description: 'Tag ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tag deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - insufficient permissions' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Tag not found' }),
    __param(0, (0, common_1.Param)('tagId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], TagsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('tasks/:taskId/tags'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Assign a tag to a task' }),
    (0, swagger_1.ApiParam)({ name: 'taskId', type: Number, description: 'Task ID' }),
    (0, swagger_1.ApiBody)({ type: assign_tag_dto_1.AssignTagDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Tag assigned successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or tag does not belong to project' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task or tag not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Tag already assigned to this task' }),
    __param(0, (0, common_1.Param)('taskId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, assign_tag_dto_1.AssignTagDto, Object]),
    __metadata("design:returntype", Promise)
], TagsController.prototype, "assignToTask", null);
__decorate([
    (0, common_1.Delete)('tasks/:taskId/tags/:tagId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a tag from a task' }),
    (0, swagger_1.ApiParam)({ name: 'taskId', type: Number, description: 'Task ID' }),
    (0, swagger_1.ApiParam)({ name: 'tagId', type: Number, description: 'Tag ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tag removed from task successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Tag not assigned to task' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found' }),
    __param(0, (0, common_1.Param)('taskId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('tagId', common_1.ParseIntPipe)),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], TagsController.prototype, "removeFromTask", null);
__decorate([
    (0, common_1.Get)('tasks/:taskId/tags'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get all tags assigned to a task' }),
    (0, swagger_1.ApiParam)({ name: 'taskId', type: Number, description: 'Task ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of task tags returned' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found' }),
    __param(0, (0, common_1.Param)('taskId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], TagsController.prototype, "getTaskTags", null);
exports.TagsController = TagsController = __decorate([
    (0, swagger_1.ApiTags)('Tags'),
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [tags_service_1.TagsService])
], TagsController);
//# sourceMappingURL=tags.controller.js.map