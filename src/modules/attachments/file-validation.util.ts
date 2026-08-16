import { BadRequestException } from '@nestjs/common';

/**
 * Normalize a filename for safe database storage and response headers.
 */
function recoverMojibakeFileName(fileName: string): string {
  if (!fileName) return fileName;

  const suspiciousPattern = /[ÃƒÃ…Ã†Ã¢Ã¡Ã¤Ã§Ã¨Ã©ÃªÃ«Ã¬Ã­Ã®Ã¯Ã±Ã²Ã³Ã´ÃµÃ¶Ã¹ÃºÃ»Ã¼Ã½Ã¿]/i;
  const hasReplacementChar = fileName.includes('\\uFFFD');

  if (!suspiciousPattern.test(fileName) && !hasReplacementChar) {
    return fileName;
  }

  try {
    const decoded = Buffer.from(fileName, 'latin1').toString('utf8');
    if (decoded && decoded !== fileName && !decoded.includes('\\uFFFD')) {
      return decoded;
    }
  } catch {
    // Fall back to the original value if decoding fails.
  }

  return fileName;
}

export function normalizeFileName(fileName: string): string {
  if (!fileName) return fileName;

  let normalized = recoverMojibakeFileName(fileName).normalize('NFC');
  // Remove filesystem-reserved characters and all controls, including CR/LF.
  normalized = normalized.replace(/[\x00-\x1F\x7F\/:*?"<>|]/g, '');
  normalized = normalized.trim().replace(/\.+$/g, '');

  return normalized || 'unnamed_file';
}

type FileSignatureValidator = (buffer: Buffer) => boolean;

interface AllowedFileType {
  mimeType: string;
  signatureIsValid: FileSignatureValidator;
}

const startsWith = (buffer: Buffer, bytes: number[]): boolean =>
  buffer.length >= bytes.length &&
  bytes.every((byte, index) => buffer[index] === byte);

const isJpeg = (buffer: Buffer) => startsWith(buffer, [0xff, 0xd8, 0xff]);
const isPng = (buffer: Buffer) =>
  startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isGif = (buffer: Buffer) =>
  buffer.subarray(0, 6).equals(Buffer.from('GIF87a')) ||
  buffer.subarray(0, 6).equals(Buffer.from('GIF89a'));
const isWebp = (buffer: Buffer) =>
  startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
  buffer.subarray(8, 12).equals(Buffer.from('WEBP'));
const isPdf = (buffer: Buffer) =>
  startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d]);
const isCompoundDocument = (buffer: Buffer) =>
  startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const isZip = (buffer: Buffer) => startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]);

const isOpenXmlDocument = (directory: 'word/' | 'xl/' | 'ppt/') =>
  (buffer: Buffer): boolean =>
    isZip(buffer) &&
    buffer.includes(Buffer.from('[Content_Types].xml')) &&
    buffer.includes(Buffer.from(directory));

const isUtf8Text = (buffer: Buffer): boolean => {
  if (buffer.includes(0)) return false;

  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
};

const ALLOWED_FILE_TYPES: ReadonlyMap<string, AllowedFileType> = new Map([
  ['.jpg', { mimeType: 'image/jpeg', signatureIsValid: isJpeg }],
  ['.jpeg', { mimeType: 'image/jpeg', signatureIsValid: isJpeg }],
  ['.png', { mimeType: 'image/png', signatureIsValid: isPng }],
  ['.gif', { mimeType: 'image/gif', signatureIsValid: isGif }],
  ['.pdf', { mimeType: 'application/pdf', signatureIsValid: isPdf }],
  ['.doc', { mimeType: 'application/msword', signatureIsValid: isCompoundDocument }],
  [
    '.docx',
    {
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      signatureIsValid: isOpenXmlDocument('word/'),
    },
  ],
  ['.xls', { mimeType: 'application/vnd.ms-excel', signatureIsValid: isCompoundDocument }],
  [
    '.xlsx',
    {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      signatureIsValid: isOpenXmlDocument('xl/'),
    },
  ],
  ['.ppt', { mimeType: 'application/vnd.ms-powerpoint', signatureIsValid: isCompoundDocument }],
  [
    '.pptx',
    {
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      signatureIsValid: isOpenXmlDocument('ppt/'),
    },
  ],
  ['.txt', { mimeType: 'text/plain', signatureIsValid: isUtf8Text }],
]);

const ALLOWED_AVATAR_TYPES: ReadonlyMap<string, AllowedFileType> = new Map([
  ['.jpg', { mimeType: 'image/jpeg', signatureIsValid: isJpeg }],
  ['.jpeg', { mimeType: 'image/jpeg', signatureIsValid: isJpeg }],
  ['.png', { mimeType: 'image/png', signatureIsValid: isPng }],
  ['.gif', { mimeType: 'image/gif', signatureIsValid: isGif }],
  ['.webp', { mimeType: 'image/webp', signatureIsValid: isWebp }],
]);

function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}

function validateAgainstAllowedTypes(
  originalName: string,
  mimeType: string,
  buffer: Buffer,
  allowedTypes: ReadonlyMap<string, AllowedFileType>,
  allowedDescription: string,
): void {
  const extension = getExtension(originalName);
  const allowedType = allowedTypes.get(extension);

  if (!allowedType) {
    throw new BadRequestException(
      `File extension "${extension || 'unknown'}" is not supported. Allowed types: ${allowedDescription}`,
    );
  }

  if (mimeType !== allowedType.mimeType) {
    throw new BadRequestException(
      `File MIME type does not match its extension. Expected "${allowedType.mimeType}" for "${extension}"`,
    );
  }

  if (!allowedType.signatureIsValid(buffer)) {
    throw new BadRequestException(
      `File content does not match the declared "${extension}" type`,
    );
  }
}

/** Validate attachment extension, client MIME declaration, and file signature. */
export function validateFile(
  originalName: string,
  mimeType: string,
  buffer: Buffer,
): void {
  validateAgainstAllowedTypes(
    originalName,
    mimeType,
    buffer,
    ALLOWED_FILE_TYPES,
    'jpg, jpeg, png, gif, pdf, doc, docx, xls, xlsx, ppt, pptx, txt',
  );
}

/** Validate image-only avatar extension, MIME declaration, and file signature. */
export function validateAvatarFile(
  originalName: string,
  mimeType: string,
  buffer: Buffer,
): void {
  validateAgainstAllowedTypes(
    originalName,
    mimeType,
    buffer,
    ALLOWED_AVATAR_TYPES,
    'jpg, jpeg, png, gif, webp',
  );
}