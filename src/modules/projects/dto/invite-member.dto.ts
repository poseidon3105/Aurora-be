import { IsEmail, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({ example: 'user@gmail.com', description: 'Email of the invitee' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 2, description: 'Role ID to assign in the project' })
  @IsInt()
  @IsNotEmpty()
  roleId!: number;
}
