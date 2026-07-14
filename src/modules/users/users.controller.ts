import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  HttpCode,
  HttpStatus,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../attachments/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Profile')
@Controller('profile')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Get Profile ──

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }

  // ── Update Profile ──

  @Patch()
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    }),
  )
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update current user profile (fullName and/or avatar image)',
  })
  @ApiBody({
    description:
      'Multipart form data with optional fullName text field and optional avatar image file',
    schema: {
      type: 'object',
      properties: {
        fullName: {
          type: 'string',
          description: 'User full name',
          example: 'John Doe',
        },
        avatar: {
          type: 'string',
          format: 'binary',
          description:
            'Avatar image file (jpeg, png, gif, webp). Max 5MB.',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.usersService.updateProfile(user.id, dto, avatar);
  }

  // ── Request Password Change (Send OTP) ──

  @Post('request-password-change')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Request a password change — sends an OTP to the authenticated user email',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent to email',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 429,
    description: 'Too many OTP requests. Please try again later.',
  })
  async requestPasswordChange(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.requestPasswordChange(user.id);
  }

  // ── Change Password (Verify OTP + Update) ──

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Change password — requires OTP sent to email and the new password',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP or password validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  // ── Delete Account (Soft Delete) ──

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete own account' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Account already deleted' })
  async deleteAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.deleteAccount(user.id);
  }
}
