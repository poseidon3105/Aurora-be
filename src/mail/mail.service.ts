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
      from: this.configService.get<string>('MAIL_FROM', 'noreply@aurora.com'),
      to: email,
      subject: 'Email Verification - Aurora',
      html: `
        <h1>Email Verification</h1>
        <p>Your verification code is:</p>
        <h2 style="font-size: 32px; letter-spacing: 6px; text-align: center; background: #f4f4f4; padding: 16px; border-radius: 8px;">${otp}</h2>
        <p>This code expires in 5 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
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

  async sendInvitationEmail(email: string, token: string): Promise<void> {
    const invitationUrl = `https://domain.com/invite/${token}`;
    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM', 'noreply@aurora.com'),
      to: email,
      subject: 'You\'ve been invited to join a project - Aurora',
      html: `
        <h1>Project Invitation</h1>
        <p>You have been invited to join a project on Aurora.</p>
        <p>Click the link below to accept the invitation:</p>
        <p style="text-align: center;">
          <a href="${invitationUrl}" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; font-size: 16px;">
            Accept Invitation
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${invitationUrl}</p>
        <p>This invitation expires in 7 days.</p>
        <p>If you did not expect this invitation, please ignore this email.</p>
      `,
    });
  }
}
