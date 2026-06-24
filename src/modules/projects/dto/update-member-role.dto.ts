import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty({ example: 2, description: 'New role ID to assign' })
  @IsInt()
  @IsNotEmpty()
  roleId!: number;
}
