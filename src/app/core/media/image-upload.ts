import { HttpErrorResponse } from '@angular/common/http';

export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,image/jpeg,image/png';
export const IMAGE_RULES = 'JPG or PNG, max 5 MB';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const SIGNATURES: { format: string; bytes: number[]; offset?: number }[] = [
  { format: 'JPG', bytes: [0xff, 0xd8, 0xff] },
  { format: 'PNG', bytes: [0x89, 0x50, 0x4e, 0x47] },
];

const OTHER_FORMATS: { format: string; bytes: number[]; offset?: number }[] = [
  { format: 'WEBP', bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  { format: 'GIF', bytes: [0x47, 0x49, 0x46] },
  { format: 'HEIC', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  { format: 'BMP', bytes: [0x42, 0x4d] },
];

export async function validateImageFile(file: File): Promise<string | null> {
  if (file.size === 0) {
    return 'The selected file is empty.';
  }

  if (file.size > MAX_IMAGE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `This image is ${sizeMb} MB. The maximum size is 5 MB.`;
  }

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const matches = (signature: { bytes: number[]; offset?: number }) =>
    signature.bytes.every((byte, index) => header[(signature.offset ?? 0) + index] === byte);

  if (SIGNATURES.some(matches)) {
    return null;
  }

  const actual = OTHER_FORMATS.find(matches)?.format;
  return actual
    ? `This file is actually a ${actual} image, even if its name ends in .${extension(file.name)}. Only ${IMAGE_RULES}. Convert it to JPG or PNG (for example with Paint, "Save as").`
    : `This file is not a valid image. Only ${IMAGE_RULES}.`;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  if (error.status === 0) {
    return 'The server could not be reached. Check your connection and try again.';
  }

  if (error.status === 413) {
    return `The image is too large. Only ${IMAGE_RULES}.`;
  }

  return readMessage(error.error) || fallback;
}

function readMessage(body: unknown): string | null {
  if (typeof body === 'string') {
    const text = body.trim();
    if (!text) return null;
    if (text.startsWith('{')) {
      try {
        return readMessage(JSON.parse(text)) ?? text;
      } catch {
        return text;
      }
    }
    return text;
  }

  if (body && typeof body === 'object') {
    const fields = body as { error?: unknown; detail?: unknown; title?: unknown; message?: unknown };
    for (const value of [fields.error, fields.detail, fields.title, fields.message]) {
      const message = readMessage(value);
      if (message) return message;
    }
  }

  return null;
}

function extension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}
