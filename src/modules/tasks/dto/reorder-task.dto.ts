import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderTaskDto {
  @ApiProperty({ description: 'Task ID to reorder' })
  @IsInt()
  @Min(1)
  taskId!: number;

  @ApiProperty({ description: 'New position (0-based index within the checklist)' })
  @IsInt()
  @Min(0)
  newPosition!: number;
}
