import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { AdminModule } from './modules/admin/admin.module';
import { RespondModule } from './modules/respond/respond.module';
import { AuditModule } from './modules/audit/audit.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailModule,
    AdminModule,
    RespondModule,
    AuditModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
