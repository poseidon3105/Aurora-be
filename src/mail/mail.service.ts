import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('smtp.host', 'smtp.gmail.com'),
      port: this.configService.get<number>('smtp.port', 587),
      secure: this.configService.get<boolean>('smtp.secure', false),
      auth: {
        user: this.configService.get<string>('smtp.user'),
        pass: this.configService.get<string>('smtp.pass'),
      },
      connectionTimeout: this.configService.get<number>(
        'smtp.connectionTimeoutMs',
        10000,
      ),
      greetingTimeout: this.configService.get<number>(
        'smtp.greetingTimeoutMs',
        10000,
      ),
      socketTimeout: this.configService.get<number>(
        'smtp.socketTimeoutMs',
        15000,
      ),
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.configService.get<boolean>('smtp.verifyOnStartup', true)) {
      this.logger.warn('SMTP verification on startup is disabled');
      return;
    }

    try {
      await this.transporter.verify();
      this.logger.log('SMTP transport verified');
    } catch (error) {
      this.logger.error(
        'SMTP verification failed during startup',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        'SMTP is unavailable during application startup',
      );
    }
  }

  private getFrontendUrl(): string {
    const frontendUrl = this.configService.get<string>('frontend.url');
    if (!frontendUrl || frontendUrl.trim().length === 0) {
      throw new InternalServerErrorException('FRONTEND_URL must be configured');
    }

    return frontendUrl.replace(/\/+$/, '');
  }

  async sendVerificationOtp(email: string, otp: string): Promise<void> {
    await this.transporter.sendMail({
      from: `"Aurora" <${this.configService.get<string>('smtp.from')}>`,
      to: email,
      subject: 'Email Verification - Aurora',
      text: `Your email verification code is: ${otp}

This code expires in 5 minutes.

If you did not request this verification, you can safely ignore this email.`,
      html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width:600px; margin:auto;">
        <h2>Email Verification</h2>

        <p>Your verification code is:</p>

        <div style="
          font-size:32px;
          font-weight:bold;
          text-align:center;
          background:#f4f4f4;
          padding:18px;
          border-radius:8px;
          letter-spacing:8px;
          margin:20px 0;">
          ${otp}
        </div>

        <p>This code expires in <strong>5 minutes</strong>.</p>

        <hr>

        <p style="font-size:13px;color:#666;">
          If you did not request this verification, you can safely ignore this email.
        </p>
      </div>
    `,
    });
  }

  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get<string>('smtp.from', 'noreply@aurora.com'),
      to: email,
      subject: 'Password Reset - Aurora',
      html: `
        <h1>Password Reset</h1>
        <p>Your password reset code is:</p>
        <h2 style="font-size: 32px; letter-spacing: 6px; text-align: center; background: #f4f4f4; padding: 16px; border-radius: 8px;">${otp}</h2>
        <p>This code expires in 5 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });
  }

  async sendMentionNotification(
    email: string,
    senderName: string,
    taskId: number,
  ): Promise<void> {
    const taskUrl = `${this.getFrontendUrl()}/tasks/${taskId}`;

    await this.transporter.sendMail({
      from: `"Aurora" <${this.configService.get<string>('smtp.from')}>`,
      to: email,
      subject: 'You were mentioned in a comment - Aurora',
      text: `${senderName} mentioned you in a comment.

View task:
${taskUrl}`,
      html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width:600px; margin:auto;">
        <h2>You were mentioned</h2>

        <p>
          <strong>${senderName}</strong> mentioned you in a comment on
          <strong>Task #${taskId}</strong>.
        </p>

        <p>
          Open the following link to view the task:
        </p>

        <p>
          <a href="${taskUrl}">
            ${taskUrl}
          </a>
        </p>

        <hr>

        <p style="font-size:13px;color:#666;">
          This is an automatic notification from Aurora.
        </p>
      </div>
    `,
    });
  }

  async sendInvitationEmail(email: string, token: string): Promise<void> {
    const invitationUrl = `${this.getFrontendUrl()}/invite/${token}`;

    await this.transporter.sendMail({
      from: `"Aurora" <${this.configService.get<string>('smtp.from')}>`,
      to: email,
      subject: 'Project Invitation - Aurora',
      text: `You have been invited to join a project.

Accept invitation:
${invitationUrl}

This invitation expires in 7 days.`,
      html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width:600px; margin:auto;">
        <h2>Project Invitation</h2>

        <p>You have been invited to join a project on <strong>Aurora</strong>.</p>

        <p>
          Open the following link to accept the invitation:
        </p>

        <p>
          <a href="${invitationUrl}">
            ${invitationUrl}
          </a>
        </p>

        <hr>

        <p style="font-size:13px;color:#666;">
          This invitation expires in 7 days.
        </p>

        <p style="font-size:13px;color:#666;">
          If you were not expecting this email, you can safely ignore it.
        </p>
      </div>
    `,
    });
  }
}