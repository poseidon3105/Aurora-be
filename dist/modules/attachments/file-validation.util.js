"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeFileName = normalizeFileName;
exports.validateFile = validateFile;
const common_1 = require("@nestjs/common");
function recoverMojibakeFileName(fileName) {
    if (!fileName)
        return fileName;
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
    }
    catch {
    }
    return fileName;
}
function normalizeFileName(fileName) {
    if (!fileName)
        return fileName;
    let normalized = recoverMojibakeFileName(fileName);
    normalized = normalized.normalize('NFC');
    normalized = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\/:*?"<>|]/g, '');
    normalized = normalized.trim().replace(/\.+$/g, '');
    if (!normalized) {
        return 'unnamed_file';
    }
    return normalized;
}
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
]);
const BLOCKED_MIME_TYPES = new Set([
    'application/x-msdownload',
    'application/x-bat',
    'application/x-sh',
    'application/x-msdos-program',
    'text/x-msdos-batch',
    'application/x-cmd',
    'text/javascript',
    'application/javascript',
    'application/x-javascript',
    'application/java-archive',
    'application/vnd.android.package-archive',
]);
const BLOCKED_EXTENSIONS = new Set([
    '.exe', '.bat', '.cmd', '.sh',
    '.js', '.jar', '.apk',
]);
function validateFile(originalName, mimeType) {
    const extension = '.' + originalName.split('.').pop()?.toLowerCase();
    if (extension && BLOCKED_EXTENSIONS.has(extension)) {
        throw new common_1.BadRequestException(`File type "${extension}" is not allowed for security reasons`);
    }
    if (BLOCKED_MIME_TYPES.has(mimeType)) {
        throw new common_1.BadRequestException(`File type "${mimeType}" is not allowed for security reasons`);
    }
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        throw new common_1.BadRequestException(`File type "${mimeType || 'unknown'}" is not supported. ` +
            'Allowed types: jpg, jpeg, png, gif, pdf, doc, docx, xls, xlsx, ppt, pptx, txt');
    }
}
//# sourceMappingURL=file-validation.util.js.map