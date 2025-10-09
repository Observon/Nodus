import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum QuestionTypeDto {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TEXT = 'TEXT',
}

class MultipleChoiceOptions {
  @IsString({ each: true })
  options!: string[];
}

export class AddQuestionDto {
  @IsEnum(QuestionTypeDto)
  type!: QuestionTypeDto;

  @IsString()
  prompt!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MultipleChoiceOptions)
  options?: MultipleChoiceOptions;
}
