import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum QuestionTypeDto {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TEXT = 'TEXT',
}

export class AddQuestionDto {
  @IsEnum(QuestionTypeDto)
  type!: QuestionTypeDto;

  @IsString()
  prompt!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  // Para múltipla escolha, enviar { options: string[] }
  @IsOptional()
  options?: { options: string[] };

  // Opcional: posição específica (caso não enviar, vai para o final)
  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}
