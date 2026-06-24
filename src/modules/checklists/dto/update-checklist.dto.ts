import { IsDateString, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateChecklistDto {
  @ApiPropertyOptional({ description: 'Checklist title', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Checklist description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Due date (ISO 8601)' })
  @IsOptional()
  @ValidateIf((o) => o.dueDate !== '')
  @IsDateString()
  dueDate?: string;
}
