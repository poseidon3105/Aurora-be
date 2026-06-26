import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendVerificationOtp(email: string, otp: string): Promise<void> {
    await this.transporter.sendMail({
      from: `"Aurora" <${this.configService.get<string>('MAIL_FROM')}>`,
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
      from: this.configService.get<string>('MAIL_FROM', 'noreply@aurora.com'),
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

    const taskUrl = `${this.configService.get<string>('FRONTEND_URL')}/tasks/${taskId}`;

    await this.transporter.sendMail({
      from: `"Aurora" <${this.configService.get<string>('MAIL_FROM')}>`,
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
    const invitationUrl = `https://your-domain.com/invite/${token}`;

    await this.transporter.sendMail({
      from: `"Aurora" <${this.configService.get<string>('MAIL_FROM')}>`,
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
