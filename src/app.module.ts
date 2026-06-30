import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envConfig } from './config/env.config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ChecklistsModule } from './modules/checklists/checklists.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CommentsModule } from './modules/comments/comments.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { TagsModule } from './modules/tags/tags.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AzureBlobModule } from './azure-blob/azure-blob.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [envConfig],
    }),
    PrismaModule,
    RedisModule,
    MailModule,
    AzureBlobModule,
    AuthModule,
    ProjectsModule,
    ChecklistsModule,
    TasksModule,
    CommentsModule,
    AttachmentsModule,
    TagsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
