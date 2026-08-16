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
import {
  normalizeFileName,
  validateAvatarFile,
} from '../attachments/file-validation.util';
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

  private async getAvatarAccessUrl(
    avatarUrl: string | null,
  ): Promise<string | null> {
    return this.azureBlobService.getClientReadUrl(avatarUrl);
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
      avatarUrl: await this.getAvatarAccessUrl(user.avatarUrl),
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
    if (user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new ConflictException('Account is inactive or has been deleted');
    }

    let oldValue: string | null = null;
    let newValue: string | null = null;
    const changes: string[] = [];
    let avatarUrl = user.avatarUrl;
    let uploadedAvatarUrl: string | null = null;

    if (avatar) {
      const normalizedFileName = normalizeFileName(avatar.originalname);
      validateAvatarFile(normalizedFileName, avatar.mimetype, avatar.buffer);

      const extension = normalizedFileName.split('.').pop()!.toLowerCase();
      const blobName = `avatars/${crypto.randomUUID()}.${extension}`;
      uploadedAvatarUrl = await this.azureBlobService.upload(
        blobName,
        avatar.buffer,
        avatar.mimetype,
        'inline',
      );
      avatarUrl = uploadedAvatarUrl;
      changes.push('avatarUrl: updated');
    }

    if (dto.fullName !== undefined && dto.fullName !== user.fullName) {
      changes.push(`fullName: "${user.fullName}" → "${dto.fullName}"`);
    }

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

    let updatedUser;
    try {
      updatedUser = await this.prisma.user.update({
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
    } catch (error) {
      if (uploadedAvatarUrl) {
        await this.azureBlobService.delete(uploadedAvatarUrl).catch(() => {});
      }
      throw error;
    }

    // Delete the old blob only after the database points at the new one.
    if (uploadedAvatarUrl && user.avatarUrl) {
      await this.azureBlobService.delete(user.avatarUrl).catch(() => {});
    }

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
      avatarUrl: await this.getAvatarAccessUrl(updatedUser.avatarUrl),
      status: updatedUser.status,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }
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
    if (user.avatarUrl) {
      await this.azureBlobService.delete(user.avatarUrl).catch(() => {});
    }
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
