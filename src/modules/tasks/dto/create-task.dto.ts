import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Assignee user ID' })
  @IsOptional()
  @IsInt()
  @Min(1)
  assigneeId?: number;

  @ApiPropertyOptional({ description: 'Due date (ISO 8601)' })
  @IsOptional()
  @ValidateIf((o) => o.dueDate !== '')
  @IsDateString()
  dueDate?: string;
}
