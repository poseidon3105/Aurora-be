import { ApiProperty } from '@nestjs/swagger';

export class UploadAttachmentResponseDto {
  @ApiProperty({ description: 'Attachment ID', example: 5 })
  id!: number;

  @ApiProperty({ description: 'Original file name', example: 'Design.pdf' })
  fileName!: string;

  @ApiProperty({
    description: 'Azure Blob Storage URL',
    example:
      'https://<storage-account>.blob.core.windows.net/files/550e8400-e29b-41d4-a716-446655440000.pdf',
  })
  fileUrl!: string;
}
