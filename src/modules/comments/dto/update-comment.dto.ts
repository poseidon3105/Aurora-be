import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommentDto {
  @ApiProperty({
    description: 'Updated comment content',
    example: 'The Login API has been completed and deployed.',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Content must not be empty' })
  @MaxLength(5000, { message: 'Content must not exceed 5000 characters' })
  content!: string;
}
