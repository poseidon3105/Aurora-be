import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'My Project', description: 'Project name' })
  @IsString()
  @IsNotEmpty({ message: 'Project name must not be empty' })
  @MaxLength(255, { message: 'Project name must not exceed 255 characters' })
  name!: string;

  @ApiPropertyOptional({ example: 'A description of the project', description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2025-01-01', description: 'Project start date' })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid start date format' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'Project end date' })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid end date format' })
  endDate?: string;
}
