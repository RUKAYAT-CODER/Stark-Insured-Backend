import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginPasswordDto {
    @ApiProperty({
        description: 'Email address of the user',
        example: 'user@example.com',
    })
    @IsEmail({}, { message: 'Invalid email format' })
    @IsNotEmpty()
    @Transform(({ value }) => value?.trim().toLowerCase())
    email: string;

    @ApiProperty({
        description: 'User password',
        example: 'SecurePassword123!',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    password: string;
}
