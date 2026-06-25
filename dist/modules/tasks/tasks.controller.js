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
exports.TasksController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const tasks_service_1 = require("./tasks.service");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const create_task_dto_1 = require("./dto/create-task.dto");
const update_task_dto_1 = require("./dto/update-task.dto");
const assign_task_dto_1 = require("./dto/assign-task.dto");
const change_task_status_dto_1 = require("./dto/change-task-status.dto");
const reorder_task_dto_1 = require("./dto/reorder-task.dto");
let TasksController = class TasksController {
    constructor(tasksService) {
        this.tasksService = tasksService;
    }
    async create(checklistId, dto, user) {
        return this.tasksService.create(checklistId, dto, user.id);
    }
    async findAll(checklistId, user) {
        return this.tasksService.findAll(checklistId, user.id);
    }
    async findOne(taskId, user) {
        return this.tasksService.findOne(taskId, user.id);
    }
    async update(taskId, dto, user) {
        return this.tasksService.update(taskId, dto, user.id);
    }
    async assign(taskId, dto, user) {
        return this.tasksService.assign(taskId, dto, user.id);
    }
    async changeStatus(taskId, dto, user) {
        return this.tasksService.changeStatus(taskId, dto, user.id);
    }
    async reorder(dto, user) {
        return this.tasksService.reorder(dto, user.id);
    }
    async remove(taskId, user) {
        return this.tasksService.remove(taskId, user.id);
    }
    async getTaskSummary(projectId, user) {
        return this.tasksService.getTaskSummary(projectId, user.id);
    }
};
exports.TasksController = TasksController;
__decorate([
    (0, common_1.Post)('checklists/:checklistId/tasks'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new task in a checklist' }),
    (0, swagger_1.ApiParam)({ name: 'checklistId', type: Number, description: 'Checklist ID' }),
    (0, swagger_1.ApiBody)({ type: create_task_dto_1.CreateTaskDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Task created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or business rule violation' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Checklist not found' }),
    __param(0, (0, common_1.Param)('checklistId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_task_dto_1.CreateTaskDto, Object]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('checklists/:checklistId/tasks'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get all tasks for a checklist' }),
    (0, swagger_1.ApiParam)({ name: 'checklistId', type: Number, description: 'Checklist ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of tasks returned' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Checklist not found' }),
    __param(0, (0, common_1.Param)('checklistId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('tasks/:taskId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get task details with assignee, status, tags, counts' }),
    (0, swagger_1.ApiParam)({ name: 'taskId', type: Number, description: 'Task ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Task details returned' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found' }),
    __param(0, (0, common_1.Param)('taskId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)('tasks/:taskId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update a task (manager or assignee only)' }),
    (0, swagger_1.ApiParam)({ name: 'taskId', type: Number, description: 'Task ID' }),
    (0, swagger_1.ApiBody)({ type: update_task_dto_1.UpdateTaskDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Task updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or deleted task' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found' }),
    __param(0, (0, common_1.Param)('taskId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_task_dto_1.UpdateTaskDto, Object]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)('tasks/:taskId/assign'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Assign a task to a project member' }),
    (0, swagger_1.ApiParam)({ name: 'taskId', type: Number, description: 'Task ID' }),
    (0, swagger_1.ApiBody)({ type: assign_task_dto_1.AssignTaskDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Task assigned successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid assignee' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found' }),
    __param(0, (0, common_1.Param)('taskId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, assign_task_dto_1.AssignTaskDto, Object]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "assign", null);
__decorate([
    (0, common_1.Patch)('tasks/:taskId/status'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Change task status (auto-updates checklist status)' }),
    (0, swagger_1.ApiParam)({ name: 'taskId', type: Number, description: 'Task ID' }),
    (0, swagger_1.ApiBody)({ type: change_task_status_dto_1.ChangeTaskStatusDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Status updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid status' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found' }),
    __param(0, (0, common_1.Param)('taskId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, change_task_status_dto_1.ChangeTaskStatusDto, Object]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "changeStatus", null);
__decorate([
    (0, common_1.Patch)('tasks/reorder'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reorder tasks within a checklist' }),
    (0, swagger_1.ApiBody)({ type: reorder_task_dto_1.ReorderTaskDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tasks reordered successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid position' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reorder_task_dto_1.ReorderTaskDto, Object]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "reorder", null);
__decorate([
    (0, common_1.Delete)('tasks/:taskId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Soft delete a task (manager or creator only)' }),
    (0, swagger_1.ApiParam)({ name: 'taskId', type: Number, description: 'Task ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Task deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found' }),
    __param(0, (0, common_1.Param)('taskId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/task-summary'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get task summary/dashboard statistics for a project' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Task summary returned' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "getTaskSummary", null);
exports.TasksController = TasksController = __decorate([
    (0, swagger_1.ApiTags)('Tasks'),
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [tasks_service_1.TasksService])
], TasksController);
//# sourceMappingURL=tasks.controller.js.map