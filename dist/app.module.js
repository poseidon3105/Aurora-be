"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const env_config_1 = require("./config/env.config");
const prisma_module_1 = require("./prisma/prisma.module");
const redis_module_1 = require("./redis/redis.module");
const mail_module_1 = require("./mail/mail.module");
const auth_module_1 = require("./modules/auth/auth.module");
const projects_module_1 = require("./modules/projects/projects.module");
const checklists_module_1 = require("./modules/checklists/checklists.module");
const tasks_module_1 = require("./modules/tasks/tasks.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
                load: [env_config_1.envConfig],
            }),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            mail_module_1.MailModule,
            auth_module_1.AuthModule,
            projects_module_1.ProjectsModule,
            checklists_module_1.ChecklistsModule,
            tasks_module_1.TasksModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map