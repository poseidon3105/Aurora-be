export interface AuthenticatedUser {
    id: number;
    email: string;
    fullName: string;
}
export declare const CurrentUser: (...dataOrPipes: (import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | keyof AuthenticatedUser | undefined)[]) => ParameterDecorator;
