import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class PasswordResetRequestDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254) // EMAIL-01 — RFC 5321 maximum email address length.
  public email!: string;
}
