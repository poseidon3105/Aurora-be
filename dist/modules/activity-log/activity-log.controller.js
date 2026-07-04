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
exports.ActivityLogController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const activity_log_service_1 = require("./activity-log.service");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
let ActivityLogController = class ActivityLogController {
    constructor(activityLogService) {
        this.activityLogService = activityLogService;
    }
    async findMyActivities(user, page, limit) {
        const safePage = page && !isNaN(page) ? page : undefined;
        const safeLimit = limit && !isNaN(limit) ? limit : undefined;
        return this.activityLogService.findMyActivities(user.id, {
            page: safePage,
            limit: safeLimit,
        });
    }
    async findProjectActivities(projectId, user, page, limit) {
        const safePage = page && !isNaN(page) ? page : undefined;
        const safeLimit = limit && !isNaN(limit) ? limit : undefined;
        return this.activityLogService.findProjectActivities(projectId, user.id, {
            page: safePage,
            limit: safeLimit,
        });
    }
    async findTaskActivities(taskId, user, page, limit) {
        const safePage = page && !isNaN(page) ? page : undefined;
        const safeLimit = limit && !isNaN(limit) ? limit : undefined;
        return this.activityLogService.findTaskActivities(taskId, user.id, {
            page: safePage,
            limit: safeLimit,
        });
    }
};
exports.ActivityLogController = ActivityLogController;
__decorate([
    (0, common_1.Get)('activities/me'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get activity logs for the authenticated user' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Records per page' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated activity logs returned' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", Promise)
], ActivityLogController.prototype, "findMyActivities", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/activities'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get activity logs related to a project' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: Number, description: 'Project ID' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Records per page' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated project activity logs returned' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('page', common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('limit', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Number, Number]),
    __metadata("design:returntype", Promise)
], ActivityLogController.prototype, "findProjectActivities", null);
__decorate([
    (0, common_1.Get)('tasks/:taskId/activities'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get activity logs related to a task' }),
    (0, swagger_1.ApiParam)({ name: 'taskId', type: Number, description: 'Task ID' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Records per page' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated task activity logs returned' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found' }),
    __param(0, (0, common_1.Param)('taskId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('page', common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('limit', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Number, Number]),
    __metadata("design:returntype", Promise)
], ActivityLogController.prototype, "findTaskActivities", null);
exports.ActivityLogController = ActivityLogController = __decorate([
    (0, swagger_1.ApiTags)('Activity Logs'),
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [activity_log_service_1.ActivityLogService])
], ActivityLogController);
//# sourceMappingURL=activity-log.controller.js.map