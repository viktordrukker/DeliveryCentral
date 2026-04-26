import { IsNumber, IsString, Max, Min, MinLength } from 'class-validator';

export class RadiatorOverrideDto {
  @IsString()
  public subDimensionKey!: string;

  @IsNumber()
  @Min(0)
  @Max(4)
  public overrideScore!: number;

  @IsString()
  @MinLength(10)
  public reason!: string;
}
