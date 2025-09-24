import { IsInt, Max, Min } from 'class-validator';

export class CreateBatchDto {
  @IsInt()
  @Min(1)
  @Max(10000)
  size!: number;
}
