import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTagDto {
  @ApiPropertyOptional({
    description: 'Tag name',
    example: 'API',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Tag name must not exceed 100 characters' })
  name?: string;

  @ApiPropertyOptional({
    description: 'HEX color code',
    example: '#3498db',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, {
    message: 'Color must be a valid HEX color code (e.g., #3498db)',
  })
  color?: string;
}
