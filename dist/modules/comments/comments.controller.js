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
exports.CommentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const comments_service_1 = require("./comments.service");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const create_comment_dto_1 = require("./dto/create-comment.dto");
const update_comment_dto_1 = require("./dto/update-comment.dto");
let CommentsController = class CommentsController {
    constructor(commentsService) {
        this.commentsService = commentsService;
    }
    async create(taskId, dto, user) {
        return this.commentsService.create(taskId, dto, user.id);
    }
    async findAll(taskId, user) {
        return this.commentsService.findAll(taskId, user.id);
    }
    async update(commentId, dto, user) {
        return this.commentsService.update(commentId, dto, user.id);
    }
    async remove(commentId, user) {
        return this.commentsService.remove(commentId, user.id);
    }
};
exports.CommentsController = CommentsController;
__decorate([
    (0, common_1.Post)('tasks/:taskId/comments'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Add a comment to a task (supports @username mentions)' }),
    (0, swagger_1.ApiParam)({ name: 'taskId', type: Number, description: 'Task ID' }),
    (0, swagger_1.ApiBody)({ type: create_comment_dto_1.CreateCommentDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Comment created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or task is deleted' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found' }),
    __param(0, (0, common_1.Param)('taskId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_comment_dto_1.CreateCommentDto, Object]),
    __metadata("design:returntype", Promise)
], CommentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('tasks/:taskId/comments'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get all comments for a task (oldest first)' }),
    (0, swagger_1.ApiParam)({ name: 'taskId', type: Number, description: 'Task ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of comments returned' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not a project member' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Task not found' }),
    __param(0, (0, common_1.Param)('taskId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], CommentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Put)('comments/:commentId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update a comment (owner only)' }),
    (0, swagger_1.ApiParam)({ name: 'commentId', type: Number, description: 'Comment ID' }),
    (0, swagger_1.ApiBody)({ type: update_comment_dto_1.UpdateCommentDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Comment updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Cannot update a deleted comment' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not the comment owner' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Comment not found' }),
    __param(0, (0, common_1.Param)('commentId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_comment_dto_1.UpdateCommentDto, Object]),
    __metadata("design:returntype", Promise)
], CommentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('comments/:commentId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Soft delete a comment (owner or project manager only)',
    }),
    (0, swagger_1.ApiParam)({ name: 'commentId', type: Number, description: 'Comment ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Comment deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden - not the owner or manager' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Comment not found' }),
    __param(0, (0, common_1.Param)('commentId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], CommentsController.prototype, "remove", null);
exports.CommentsController = CommentsController = __decorate([
    (0, swagger_1.ApiTags)('Task Comments'),
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [comments_service_1.CommentsService])
], CommentsController);
//# sourceMappingURL=comments.controller.js.map