import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
