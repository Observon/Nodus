import { IsOptional, IsString, Length } from 'class-validator';

export class CreateSurveyDto {
  @IsString()
  @Length(3, 200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
