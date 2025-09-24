import { ArrayNotEmpty, IsArray, IsISO8601, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitAnswerDto {
  @IsString()
  questionId!: string;

  // valor pode ser string (texto) ou string[] (múltipla escolha); enviaremos como JSON serializado
  @IsString()
  valueJson!: string;
}

export class SubmitResponseDto {
  @IsString()
  surveyId!: string;

  @IsString()
  @Length(64, 64)
  tokenHash!: string; // hex sha256

  @IsOptional()
  @IsISO8601()
  submittedAt?: string; // opcional, servidor irá bucketizar

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers!: SubmitAnswerDto[];
}
