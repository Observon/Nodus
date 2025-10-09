import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { RespondController } from './respond.controller';
import { RespondService } from './respond.service';

@Module({
  imports: [PrismaModule],
  controllers: [RespondController],
  providers: [RespondService],
})
export class RespondModule {}
