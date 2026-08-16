import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'User full name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Full name must not be empty' })
  @Matches(/\S/, { message: 'Full name must contain non-whitespace characters' })
  @MaxLength(150)
  fullName?: string;
}
