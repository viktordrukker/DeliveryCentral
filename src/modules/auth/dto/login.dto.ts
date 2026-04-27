import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254) // EMAIL-01 — RFC 5321 maximum email address length.
  public email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  public password!: string;
}
