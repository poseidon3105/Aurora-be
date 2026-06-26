"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let MailService = class MailService {
    constructor(configService) {
        this.configService = configService;
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
            port: this.configService.get('SMTP_PORT', 587),
            secure: false,
            auth: {
                user: this.configService.get('SMTP_USER'),
                pass: this.configService.get('SMTP_PASS'),
            },
        });
    }
    async sendVerificationOtp(email, otp) {
        await this.transporter.sendMail({
            from: `"Aurora" <${this.configService.get('MAIL_FROM')}>`,
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
    async sendPasswordResetOtp(email, otp) {
        await this.transporter.sendMail({
            from: this.configService.get('MAIL_FROM', 'noreply@aurora.com'),
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
    async sendMentionNotification(email, senderName, taskId) {
        const taskUrl = `${this.configService.get('FRONTEND_URL')}/tasks/${taskId}`;
        await this.transporter.sendMail({
            from: `"Aurora" <${this.configService.get('MAIL_FROM')}>`,
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
    async sendInvitationEmail(email, token) {
        const invitationUrl = `https://your-domain.com/invite/${token}`;
        await this.transporter.sendMail({
            from: `"Aurora" <${this.configService.get('MAIL_FROM')}>`,
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
};
exports.MailService = MailService;
exports.MailService = MailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map