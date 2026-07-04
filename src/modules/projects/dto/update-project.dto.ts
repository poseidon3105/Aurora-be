import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'My Updated Project', description: 'Project name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Project name must not be empty' })
  @MaxLength(255, { message: 'Project name must not exceed 255 characters' })
  name?: string;

  @ApiPropertyOptional({ example: 'An updated description', description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'Project end date' })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString({}, { message: 'Invalid end date format' })
  endDate?: string;
}
