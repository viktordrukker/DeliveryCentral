import { IsEnum, IsNumber } from 'class-validator';

export class ThresholdUpsertDto {
  @IsNumber()
  public thresholdScore4!: number;

  @IsNumber()
  public thresholdScore3!: number;

  @IsNumber()
  public thresholdScore2!: number;

  @IsNumber()
  public thresholdScore1!: number;

  @IsEnum(['HIGHER_IS_BETTER', 'LOWER_IS_BETTER'])
  public direction!: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
}
