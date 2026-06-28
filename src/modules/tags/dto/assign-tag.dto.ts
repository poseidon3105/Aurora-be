import { IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTagDto {
  @ApiProperty({
    description: 'Tag ID to assign',
    example: 2,
  })
  @IsNotEmpty({ message: 'tagId must not be empty' })
  @IsNumber()
  tagId!: number;
}
