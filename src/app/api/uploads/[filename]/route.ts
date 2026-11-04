import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/errors/app-error';
import { readUploadedImage } from '@/lib/uploads/storage';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    const { buffer, mimeType } = readUploadedImage(filename);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
