import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { handleRouteError, ValidationError } from '@/lib/errors/app-error';
import { saveUploadedImageBuffer } from '@/lib/uploads/storage';

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedUser();

    const formData = await request.formData();
    const entry = formData.get('file');

    if (!entry || typeof entry === 'string') {
      throw new ValidationError('Please choose an image file to upload.');
    }

    const arrayBuffer = await entry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const saved = saveUploadedImageBuffer(buffer);

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
