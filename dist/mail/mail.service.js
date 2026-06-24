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
            from: this.configService.get('MAIL_FROM', 'noreply@aurora.com'),
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
    async sendInvitationEmail(email, token) {
        const invitationUrl = `https://domain.com/invite/${token}`;
        await this.transporter.sendMail({
            from: this.configService.get('MAIL_FROM', 'noreply@aurora.com'),
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
};
exports.MailService = MailService;
exports.MailService = MailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map