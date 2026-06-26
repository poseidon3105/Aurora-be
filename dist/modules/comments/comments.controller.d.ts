import { CommentsService } from './comments.service';
import { AuthenticatedUser } from './decorators/current-user.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
export declare class CommentsController {
    private readonly commentsService;
    constructor(commentsService: CommentsService);
    create(taskId: number, dto: CreateCommentDto, user: AuthenticatedUser): Promise<{
        id: number;
        content: string;
    }>;
    findAll(taskId: number, user: AuthenticatedUser): Promise<{
        id: number;
        content: string;
        user: {
            id: number;
            fullName: string;
        };
        createdAt: Date;
    }[]>;
    update(commentId: number, dto: UpdateCommentDto, user: AuthenticatedUser): Promise<{
        id: number;
        content: string;
    }>;
    remove(commentId: number, user: AuthenticatedUser): Promise<{
        message: string;
    }>;
}
