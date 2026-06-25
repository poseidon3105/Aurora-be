import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeTaskStatusDto {
  @ApiProperty({ description: 'Task status ID (1=TODO, 2=IN_PROGRESS, 3=REVIEW, 4=DONE)' })
  @IsInt()
  @Min(1)
  statusId!: number;
}
