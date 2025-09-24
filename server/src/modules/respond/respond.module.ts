import { Module } from '@nestjs/common';
import { RespondController } from './respond.controller';
import { RespondService } from './respond.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RespondController],
  providers: [RespondService],
})
export class RespondModule {}
