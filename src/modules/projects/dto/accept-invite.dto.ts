import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInviteDto {
  @ApiProperty({ example: 'abc123xyz', description: 'Invitation token' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
