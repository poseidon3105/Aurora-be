export interface AuthenticatedUser {
    id: number;
    email: string;
    fullName: string;
    status: string;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
