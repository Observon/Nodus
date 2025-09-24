import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RespondService } from './respond.service';
import { SubmitResponseDto } from './dto/submit-response.dto';

@Controller('respond')
export class RespondController {
  constructor(private readonly respond: RespondService) {}

  @Get('surveys/:id')
  async getSurvey(@Param('id') surveyId: string) {
    return this.respond.getSurveyForRespondent(surveyId);
  }

  @Post('submit')
  async submit(@Body() dto: SubmitResponseDto) {
    return this.respond.submit(dto);
  }
}
