import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ChecklistStatus } from '@prisma/client';

export class ChangeChecklistStatusDto {
  @ApiProperty({ enum: ChecklistStatus, description: 'Target status' })
  @IsEnum(ChecklistStatus)
  status!: ChecklistStatus;
}
