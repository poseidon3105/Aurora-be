import { BadRequestException } from '@nestjs/common';

/**
 * Normalize a filename:
 * 1. Apply Unicode NFC normalization (composed form) — e.g., precomposed characters
 * 2. Remove invalid/reserved file system characters: \0 \n \r / : * ? " < > |
 * 3. Strip control characters (except whitespace)\n * 4. Trim leading/trailing whitespace and dots
 *
 * This ensures the filename is safe for storage while preserving the original
 * character set (Vietnamese, Japanese, etc.) in a normalized, portable form.
 */
function recoverMojibakeFileName(fileName: string): string {
  if (!fileName) return fileName;

  const suspiciousPattern = /[ÃÅÆâáäçèéêëìíîïñòóôõöùúûüýÿ]/i;
  const hasReplacementChar = fileName.includes('�');

  if (!suspiciousPattern.test(fileName) && !hasReplacementChar) {
    return fileName;
  }

  try {
    const decoded = Buffer.from(fileName, 'latin1').toString('utf8');
    if (decoded && decoded !== fileName && !decoded.includes('�')) {
      return decoded;
    }
  } catch {
    // Fall back to the original value if decoding fails.
  }

  return fileName;
}

export function normalizeFileName(fileName: string): string {
  if (!fileName) return fileName;

  // 1. Recover from mojibake/encoding issues before normalization.
  let normalized = recoverMojibakeFileName(fileName);

  // 2. Unicode NFC normalization
  normalized = normalized.normalize('NFC');

  // 3. Remove invalid/reserved file system characters + control characters
  //    Invalid on Windows: \0 / : * ? " < > |
  //    Control characters: 0x00-0x1F (excluding \t, \n, \r which are handled)
  normalized = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\/:*?"<>|]/g, '');

  // 4. Trim whitespace and trailing dots
  normalized = normalized.trim().replace(/\.+$/g, '');

  // 5. If after trimming we end up empty, return a placeholder
  if (!normalized) {
    return 'unnamed_file';
  }

  return normalized;
}

// Allowed MIME types mapped from the allowed file extensions
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

// Blocked MIME types (security-sensitive executables/scripts)
const BLOCKED_MIME_TYPES = new Set([
  'application/x-msdownload', // .exe
  'application/x-bat', // .bat
  'application/x-sh', // .sh
  'application/x-msdos-program', // .exe, .com
  'text/x-msdos-batch', // .bat
  'application/x-cmd', // .cmd
  'text/javascript', // .js
  'application/javascript', // .js
  'application/x-javascript', // .js
  'application/java-archive', // .jar, .apk
  'application/vnd.android.package-archive', // .apk
]);

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh',
  '.js', '.jar', '.apk',
]);

/**
 * Validate a file's extension and MIME type against allowed/blocked lists.
 * Throws BadRequestException if the file is not accepted.
 */
export function validateFile(
  originalName: string,
  mimeType: string,
): void {
  // Get extension from the original (un-normalized) name so we detect the real type
  const extension = '.' + originalName.split('.').pop()?.toLowerCase();

  // Check blocked extensions first
  if (extension && BLOCKED_EXTENSIONS.has(extension)) {
    throw new BadRequestException(
      `File type "${extension}" is not allowed for security reasons`,
    );
  }

  // Check blocked MIME types
  if (BLOCKED_MIME_TYPES.has(mimeType)) {
    throw new BadRequestException(
      `File type "${mimeType}" is not allowed for security reasons`,
    );
  }

  // Check if the MIME type is in the allowed list
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new BadRequestException(
      `File type "${mimeType || 'unknown'}" is not supported. ` +
      'Allowed types: jpg, jpeg, png, gif, pdf, doc, docx, xls, xlsx, ppt, pptx, txt',
    );
  }
}
