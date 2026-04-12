import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class PasswordResetConfirmDto {
  @IsString()
  @IsNotEmpty()
  public token!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  public newPassword!: string;
}
