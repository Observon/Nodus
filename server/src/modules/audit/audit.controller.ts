import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('batches/:id')
  async getBatch(@Param('id') batchId: string) {
    return this.audit.getBatch(batchId);
  }

  @Get('verify')
  async verify(
    @Query('batchId') batchId: string,
    @Query('tokenHash') tokenHash: string,
  ) {
    return this.audit.verify(batchId, tokenHash);
  }
}
