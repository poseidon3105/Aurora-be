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
exports.ChecklistsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const checklists_service_1 = require("./checklists.service");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const create_checklist_dto_1 = require("./dto/create-checklist.dto");
const update_checklist_dto_1 = require("./dto/update-checklist.dto");
const change_checklist_status_dto_1 = require("./dto/change-checklist-status.dto");
let ChecklistsController = class ChecklistsController {
    constructor(checklistsService) {
        this.checklistsService = checklistsService;
    }
    async create(projectId, dto, user) {
        return this.checklistsService.create(projectId, dto, user.id);
    }
    async findAll(projectId, user) {
        return this.checklistsService.findAll(projectId, user.id);
    }
    async findOne(checklistId, user) {
        return this.checklistsService.findOne(checklistId, user.id);
    }
    async update(checklistId, dto, user) {
        return this.checklistsService.update(checklistId, dto, user.id);
    }
    async changeStatus(checklistId, dto, user) {
        return this.checklistsService.changeStatus(checklistId, dto, user.id);
    }
    async remove(checklistId, user) {
        return this.checklistsService.remove(checklistId, user.id);
    }
};
exports.ChecklistsController = ChecklistsController;
__decorate([
    (0, common_1.Post)('projects/:projectId/checklists'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new checklist in a project' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiBody)({ type: create_checklist_dto_1.CreateChecklistDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Checklist created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or business rule violation' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Project not found' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_checklist_dto_1.CreateChecklistDto, Object]),
    __metadata("design:returntype", Promise)
], ChecklistsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/checklists'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get all checklists for a project' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of checklists returned' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ChecklistsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('checklists/:checklistId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get checklist details with task counts' }),
    (0, swagger_1.ApiParam)({ name: 'checklistId', type: Number, description: 'Checklist ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Checklist details returned' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Checklist not found' }),
    __param(0, (0, common_1.Param)('checklistId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ChecklistsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)('checklists/:checklistId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update a checklist (manager or creator only)' }),
    (0, swagger_1.ApiParam)({ name: 'checklistId', type: Number, description: 'Checklist ID' }),
    (0, swagger_1.ApiBody)({ type: update_checklist_dto_1.UpdateChecklistDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Checklist updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Checklist is deleted' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a manager or creator' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Checklist not found' }),
    __param(0, (0, common_1.Param)('checklistId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_checklist_dto_1.UpdateChecklistDto, Object]),
    __metadata("design:returntype", Promise)
], ChecklistsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)('checklists/:checklistId/status'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Change checklist status (OPEN → IN_PROGRESS → DONE)',
    }),
    (0, swagger_1.ApiParam)({ name: 'checklistId', type: Number, description: 'Checklist ID' }),
    (0, swagger_1.ApiBody)({ type: change_checklist_status_dto_1.ChangeChecklistStatusDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Status changed successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid status transition' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Checklist not found' }),
    __param(0, (0, common_1.Param)('checklistId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, change_checklist_status_dto_1.ChangeChecklistStatusDto, Object]),
    __metadata("design:returntype", Promise)
], ChecklistsController.prototype, "changeStatus", null);
__decorate([
    (0, common_1.Delete)('checklists/:checklistId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Soft delete a checklist (manager or creator only, must have no incomplete tasks)',
    }),
    (0, swagger_1.ApiParam)({ name: 'checklistId', type: Number, description: 'Checklist ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Checklist deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a manager or creator' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Checklist not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Checklist has incomplete tasks' }),
    __param(0, (0, common_1.Param)('checklistId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], ChecklistsController.prototype, "remove", null);
exports.ChecklistsController = ChecklistsController = __decorate([
    (0, swagger_1.ApiTags)('Checklists'),
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [checklists_service_1.ChecklistsService])
], ChecklistsController);
//# sourceMappingURL=checklists.controller.js.map