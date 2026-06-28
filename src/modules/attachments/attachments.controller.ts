import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AttachmentsService } from './attachments.service';
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';
import { UploadAttachmentResponseDto } from './dto/upload-attachment-response.dto';

@ApiTags('Task Attachments')
@Controller()
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AttachmentsController {
  private readonly maxFileSize: number;

  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly configService: ConfigService,
  ) {
    this.maxFileSize = this.configService.get<number>('upload.maxFileSize', 20971520);
  }

  // ── Upload Attachment ──

  @Post('tasks/:taskId/attachments')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: Number(process.env.MAX_FILE_SIZE) || 20971520, // 20 MB
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a file attachment to a task' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (max 20MB)',
        },
      },
    },
  })
  @ApiParam({ name: 'taskId', type: Number, description: 'Task ID' })
  @ApiResponse({
    status: 201,
    description: 'Attachment uploaded successfully',
    type: UploadAttachmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or task deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async upload(
    @Param('taskId', ParseIntPipe) taskId: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.attachmentsService.upload(taskId, file, user.id);
  }

  // ── Get Attachments (by task) ──

  @Get('tasks/:taskId/attachments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all attachments for a task' })
  @ApiParam({ name: 'taskId', type: Number, description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'List of attachments returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findAll(
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachmentsService.findAll(taskId, user.id);
  }

  // ── Download Attachment ──

  @Get('attachments/:attachmentId/download')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get download URL for an attachment' })
  @ApiParam({ name: 'attachmentId', type: Number, description: 'Attachment ID' })
  @ApiResponse({ status: 200, description: 'Download URL returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a project member' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async download(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachmentsService.getDownloadUrl(attachmentId, user.id);
  }

  // ── Delete Attachment ──

  @Delete('attachments/:attachmentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Soft delete an attachment (owner, project manager, or admin only)',
  })
  @ApiParam({ name: 'attachmentId', type: Number, description: 'Attachment ID' })
  @ApiResponse({ status: 200, description: 'Attachment deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async remove(
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachmentsService.remove(attachmentId, user.id);
  }
}
