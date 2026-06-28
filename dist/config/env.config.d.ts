export declare const envConfig: () => {
    database: {
        url: string | undefined;
    };
    redis: {
        url: string;
    };
    jwt: {
        accessSecret: string;
        refreshSecret: string;
        accessExpiresIn: string;
        refreshExpiresIn: string;
    };
    smtp: {
        host: string;
        port: number;
        user: string | undefined;
        pass: string | undefined;
        from: string;
    };
    otp: {
        ttl: number;
        resendCooldown: number;
        maxRequests: number;
        window: number;
    };
    refresh: {
        ttl: number;
    };
    invitation: {
        ttl: number;
    };
    azure: {
        storageConnectionString: string;
        container: string;
    };
    upload: {
        maxFileSize: number;
    };
    port: number;
};
