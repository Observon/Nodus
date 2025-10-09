import { ArrayNotEmpty, IsArray, IsISO8601, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitAnswerDto {
  @IsString()
  questionId!: string;

  @IsString()
  valueJson!: string;
}

export class SubmitResponseDto {
  @IsString()
  surveyId!: string;

  @IsString()
  @Length(64, 64)
  tokenHash!: string;

  @IsOptional()
  @IsISO8601()
  submittedAt?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers!: SubmitAnswerDto[];
}
