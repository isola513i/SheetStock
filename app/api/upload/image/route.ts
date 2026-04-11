import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireUser } from '@/lib/server/api-auth';
import { uploadImageToGCS } from '@/lib/server/gcs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const guard = await requireUser(request, ['admin']);
  if (!guard.ok) return guard.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'file must be an image' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'file size must be under 10MB' }, { status: 400 });
    }

    // Convert to buffer and process with sharp
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const processed = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Upload to GCS
    const url = await uploadImageToGCS(processed, 'image/webp');

    return NextResponse.json({ ok: true, url });
  } catch (error) {
    console.error('Image upload failed:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 },
    );
  }
}
