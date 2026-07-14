import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
import { AzureBlobService } from '../../azure-blob/azure-blob.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { normalizeFileName } from '../attachments/file-validation.util';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { USER_REDIS_KEYS } from './users.constants';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly azureBlobService: AzureBlobService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ───────────────────────────
  //  Helper Methods
  // ───────────────────────────

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ═══════════════════════════════════════════════
  //  1. Get Profile
  // ═══════════════════════════════════════════════

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        systemRoles: {
          select: {
            role: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.systemRoles.map((sr) => sr.role.name),
    };
  }

  // ═══════════════════════════════════════════════
  //  2. Update Profile
  // ═══════════════════════════════════════════════

  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
    avatar?: Express.Multer.File,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Track changes for activity log
    let oldValue: string | null = null;
    let newValue: string | null = null;
    const changes: string[] = [];

    // ── Handle avatar file upload ──
    let avatarUrl = user.avatarUrl;
    if (avatar) {
      // Validate MIME type — only images allowed
      const allowedImageTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      if (!allowedImageTypes.includes(avatar.mimetype)) {
        throw new BadRequestException(
          'Invalid avatar file type. Allowed types: jpeg, png, gif, webp',
        );
      }

      // Normalize original filename and generate a UUID blob name
      const normalizedFileName = normalizeFileName(avatar.originalname);
      const extension =
        normalizedFileName.split('.').pop()?.toLowerCase() || 'jpg';
      const blobName = `avatars/${crypto.randomUUID()}.${extension}`;

      // Upload avatar to Azure Blob Storage
      avatarUrl = await this.azureBlobService.upload(
        blobName,
        avatar.buffer,
        avatar.mimetype,
      );

      // If user had a previous avatar, delete the old blob
      if (user.avatarUrl) {
        await this.azureBlobService.delete(user.avatarUrl).catch(() => {
          // Silently fail — the new avatar is already uploaded
        });
      }

      changes.push('avatarUrl: updated');
    }

    // ── Handle fullName change ──
    if (dto.fullName !== undefined && dto.fullName !== user.fullName) {
      changes.push(`fullName: "${user.fullName}" → "${dto.fullName}"`);
    }

    // Prepare old/new values for activity log
    if (changes.length > 0) {
      oldValue = JSON.stringify({
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      });
      newValue = JSON.stringify({
        fullName: dto.fullName ?? user.fullName,
        avatarUrl,
      });
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(avatarUrl !== user.avatarUrl && { avatarUrl }),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Activity Log: PROFILE_UPDATED
    if (changes.length > 0) {
      await this.activityLogService
        .create(
          userId,
          'PROFILE_UPDATED',
          'USER',
          userId,
          oldValue,
          newValue,
        )
        .catch(() => {});
    }

    return {
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      avatarUrl: updatedUser.avatarUrl,
      status: updatedUser.status,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  // ═══════════════════════════════════════════════
  //  3. Request Password Change (Send OTP)
  // ═══════════════════════════════════════════════

  async requestPasswordChange(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.deletedAt) {
      throw new ConflictException('Account has been deleted');
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        'Cannot change password for Google-authenticated accounts',
      );
    }

    const email = user.email;

    // Reuse OTP rate limiting from shared constants pattern
    const otpTtl = Number(
      this.configService.get<number>('OTP_TTL', 300),
    );
    const otpResendCooldown = Number(
      this.configService.get<number>('OTP_RESEND_COOLDOWN', 60),
    );
    const otpMaxRequests = Number(
      this.configService.get<number>('OTP_MAX_REQUESTS', 5),
    );
    const otpWindow = Number(
      this.configService.get<number>('OTP_WINDOW', 3600),
    );

    // Check rate limiting
    const rateLimitKey = `${USER_REDIS_KEYS.OTP_RATE}${email}:change-password`;
    const currentCount = await this.redisService.get(rateLimitKey);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    if (count >= otpMaxRequests) {
      throw new HttpException(
        'Too many OTP requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check cooldown
    const lastSentKey = `${rateLimitKey}:last_sent`;
    const lastSent = await this.redisService.get(lastSentKey);
    if (lastSent) {
      const elapsed = Date.now() - parseInt(lastSent, 10);
      if (elapsed < otpResendCooldown * 1000) {
        throw new HttpException(
          'Please wait before requesting a new OTP',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Generate and store OTP
    const otp = this.generateOtp();
    await this.redisService.set(
      `${USER_REDIS_KEYS.OTP_CHANGE_PASSWORD}${email}`,
      otp,
      otpTtl,
    );

    // Update rate limit counter
    if (!currentCount) {
      await this.redisService.set(rateLimitKey, '1', otpWindow);
    } else {
      await this.redisService.incr(rateLimitKey);
      const ttl = await this.redisService.ttl(rateLimitKey);
      if (ttl < 0) {
        await this.redisService.expire(rateLimitKey, otpWindow);
      }
    }

    // Record last sent timestamp
    await this.redisService.set(
      lastSentKey,
      Date.now().toString(),
      otpWindow,
    );

    // Send OTP email (reuse the existing password reset email template)
    await this.mailService.sendPasswordResetOtp(email, otp);

    return { message: 'OTP sent to your email' };
  }

  // ═══════════════════════════════════════════════
  //  4. Change Password (Verify OTP + Update)
  // ═══════════════════════════════════════════════

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.deletedAt) {
      throw new ConflictException('Account has been deleted');
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        'Cannot change password for Google-authenticated accounts',
      );
    }

    const { otp, newPassword } = dto;
    const email = user.email;

    // Verify OTP from Redis
    const storedOtp = await this.redisService.get(
      `${USER_REDIS_KEYS.OTP_CHANGE_PASSWORD}${email}`,
    );

    if (!storedOtp) {
      throw new BadRequestException('OTP has expired or is invalid');
    }

    if (storedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update user password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: { id: true },
    });

    // Clean up Redis
    await this.redisService.del(
      `${USER_REDIS_KEYS.OTP_CHANGE_PASSWORD}${email}`,
    );

    // Invalidate refresh tokens — force re-login after password change
    const refreshKey = `refresh:user:${userId}`;
    await this.redisService.del(refreshKey).catch(() => {});

    // Activity Log: PASSWORD_CHANGED
    await this.activityLogService
      .create(userId, 'PASSWORD_CHANGED', 'USER', userId)
      .catch(() => {});

    return { message: 'Password changed successfully. Please log in again.' };
  }

  // ═══════════════════════════════════════════════
  //  5. Delete Account (Soft Delete)
  // ═══════════════════════════════════════════════

  async deleteAccount(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.deletedAt) {
      throw new ConflictException('Account has already been deleted');
    }

    // Soft delete: set deletedAt to NOW()
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    // Activity Log: ACCOUNT_DELETED
    await this.activityLogService
      .create(
        userId,
        'ACCOUNT_DELETED',
        'USER',
        userId,
        JSON.stringify({ status: user.status, email: user.email }),
      )
      .catch(() => {});

    return { message: 'Account deleted successfully' };
  }
}
