import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private configService;
    private transporter;
    constructor(configService: ConfigService);
    sendVerificationOtp(email: string, otp: string): Promise<void>;
    sendPasswordResetOtp(email: string, otp: string): Promise<void>;
    sendInvitationEmail(email: string, token: string): Promise<void>;
}
