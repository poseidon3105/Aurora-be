import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Comment content (supports @username mentions)',
    example: 'The Login API has been completed.',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Content must not be empty' })
  @MaxLength(5000, { message: 'Content must not exceed 5000 characters' })
  content!: string;
}
