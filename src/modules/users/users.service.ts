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
import { randomInt } from 'crypto';
import { UserStatus } from '@prisma/client';

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
    return randomInt(100000, 1000000).toString();
  }

  private getOtpConfig() {
    return {
      ttl: this.configService.get<number>('otp.ttl', 300),
      resendCooldown: this.configService.get<number>('otp.resendCooldown', 60),
      maxRequests: this.configService.get<number>('otp.maxRequests', 5),
      window: this.configService.get<number>('otp.window', 3600),
      maxAttempts: this.configService.get<number>('otp.maxAttempts', 10),
    };
  }

  private async consumeOtpAttempt(email: string, otpKey: string): Promise<string> {
    const { ttl, maxAttempts } = this.getOtpConfig();
    const attemptKey = `${USER_REDIS_KEYS.OTP_ATTEMPTS}${email}:change-password`;
    const attempts = await this.redisService.incrementWithExpiry(attemptKey, ttl);

    if (attempts > maxAttempts) {
      await this.redisService.del(otpKey);
      throw new HttpException(
        'Too many invalid OTP attempts. Please request a new OTP.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return attemptKey;
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
    if (user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new ConflictException('Account is inactive or has been deleted');
    }
    if (!user.passwordHash) {
      throw new BadRequestException(
        'Cannot change password for Google-authenticated accounts',
      );
    }

    const { ttl, resendCooldown, maxRequests, window } = this.getOtpConfig();
    const email = user.email;
    const rateLimitKey = `${USER_REDIS_KEYS.OTP_RATE}${email}:change-password`;
    const allowance = await this.redisService.consumeOtpSendAllowance(
      rateLimitKey,
      `${rateLimitKey}:last_sent`,
      maxRequests,
      window,
      resendCooldown,
    );

    if (allowance === 'cooldown') {
      throw new HttpException(
        'Please wait before requesting a new OTP',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (allowance === 'rate_limited') {
      throw new HttpException(
        'Too many OTP requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = this.generateOtp();
    await this.redisService.set(
      `${USER_REDIS_KEYS.OTP_CHANGE_PASSWORD}${email}`,
      otp,
      ttl,
    );
    await this.redisService.del(
      `${USER_REDIS_KEYS.OTP_ATTEMPTS}${email}:change-password`,
    );
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
    if (user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new ConflictException('Account is inactive or has been deleted');
    }
    if (!user.passwordHash) {
      throw new BadRequestException(
        'Cannot change password for Google-authenticated accounts',
      );
    }

    const { otp, newPassword } = dto;
    const email = user.email;
    const otpKey = `${USER_REDIS_KEYS.OTP_CHANGE_PASSWORD}${email}`;
    const storedOtp = await this.redisService.get(otpKey);

    if (!storedOtp) {
      throw new BadRequestException('OTP has expired or is invalid');
    }

    const attemptKey = await this.consumeOtpAttempt(email, otpKey);
    if (storedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: { id: true },
    });

    await this.redisService.del(otpKey);
    await this.redisService.del(attemptKey);
    await this.redisService.del(`${USER_REDIS_KEYS.REFRESH}${userId}`);

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

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.INACTIVE, deletedAt: new Date() },
    });
    await this.redisService.del(`${USER_REDIS_KEYS.REFRESH}${userId}`).catch(() => {});

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
