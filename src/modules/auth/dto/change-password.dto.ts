import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  public currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  public newPassword!: string;
}
