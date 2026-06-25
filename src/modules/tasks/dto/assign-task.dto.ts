import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTaskDto {
  @ApiProperty({ description: 'Assignee user ID' })
  @IsInt()
  @Min(1)
  assigneeId!: number;
}
