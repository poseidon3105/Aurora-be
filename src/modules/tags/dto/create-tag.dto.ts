import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({
    description: 'Tag name',
    example: 'Backend',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Tag name must not be empty' })
  @IsString()
  @MaxLength(100, { message: 'Tag name must not exceed 100 characters' })
  name!: string;

  @ApiProperty({
    description: 'HEX color code',
    example: '#2ecc71',
  })
  @IsNotEmpty({ message: 'Color must not be empty' })
  @IsString()
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, {
    message: 'Color must be a valid HEX color code (e.g., #3498db)',
  })
  color!: string;
}
