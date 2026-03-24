import { IsString, MinLength, Matches, IsEmail, } from 'class-validator';
import { Trim, Escape } from 'class-sanitizer';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @Trim()
  @Escape()
  username: string;

  @IsEmail()
  @Trim()
  email: string;

    @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).+$/, {
    message: 'Password too weak. Must include uppercase, lowercase, number, and special character.',
  })
  password: string;
}
