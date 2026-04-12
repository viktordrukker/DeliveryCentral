import { IsNotEmpty, IsString } from 'class-validator';

export class Verify2faDto {
  @IsString()
  @IsNotEmpty()
  public code!: string;
}

export class TwoFaLoginDto {
  @IsString()
  @IsNotEmpty()
  public tempToken!: string;

  @IsString()
  @IsNotEmpty()
  public code!: string;
}

export class Disable2faDto {
  @IsString()
  @IsNotEmpty()
  public password!: string;
}
