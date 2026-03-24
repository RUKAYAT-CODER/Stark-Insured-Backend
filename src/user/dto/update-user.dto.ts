import { IsOptional, IsString, IsEmail, MinLength, Matches } from 'class-validator';
import { Trim, Escape } from 'class-sanitizer';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @Trim()
  @Escape()
  username?: string;

  @IsOptional()
  @IsEmail()
  @Trim()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Password too weak. Must include uppercase, lowercase, number, and special character.',
  })
  password?: string;
}
