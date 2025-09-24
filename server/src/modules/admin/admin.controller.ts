import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { BasicAuthGuard } from '../../auth/basic-auth.guard';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { CreateBatchDto } from './dto/create-batch.dto';

@UseGuards(BasicAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post('surveys')
  async createSurvey(@Body() dto: CreateSurveyDto) {
    return this.admin.createSurvey(dto);
  }

  @Post('surveys/:id/questions')
  async addQuestion(@Param('id') surveyId: string, @Body() dto: AddQuestionDto) {
    return this.admin.addQuestion(surveyId, dto);
  }

  @Post('surveys/:id/batches')
  async createBatch(@Param('id') surveyId: string, @Body() dto: CreateBatchDto) {
    return this.admin.createBatch(surveyId, dto.size);
  }

  @Get('surveys')
  async listSurveys() {
    return this.admin.listSurveys();
  }

  @Get('surveys/:id/batches')
  async listBatches(@Param('id') surveyId: string) {
    return this.admin.listBatches(surveyId);
  }
}
