'use client';

import { useId, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { BotanicalImage } from '@/components/shared/BotanicalImage';
import { apiFetch } from '@/lib/client/auth-client';

interface PhotoUploadFieldProps {
  label: string;
  value: string;
  onChange: (uploadedUrl: string) => void;
  helperText?: string;
  variant?: 'landscape' | 'compact' | 'avatar';
  fallbackPreviewUrl?: string | null;
}

const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_RAW_SIZE_BYTES = 12 * 1024 * 1024; // Allow up to 12 MB camera shots before client optimization
const TARGET_MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;

async function optimizeImageIfNeeded(file: File): Promise<File> {
  if (file.type === 'image/gif' || file.size <= 1.5 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 1600;
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim && file.size <= TARGET_MAX_UPLOAD_BYTES) {
        resolve(file);
        return;
      }

      const ratio = Math.min(maxDim / width, maxDim / height, 1);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, '') || 'plant-photo';
          resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.86
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

export function PhotoUploadField({
  label,
  value,
  onChange,
  helperText,
  variant = 'landscape',
  fallbackPreviewUrl = null,
}: PhotoUploadFieldProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function processFile(rawFile: File | undefined | null) {
    if (!rawFile) return;

    if (!ACCEPTED_MIME_TYPES.includes(rawFile.type)) {
      setUploadError('Please select a JPG, PNG, WebP, or GIF image file.');
      return;
    }

    if (rawFile.size > MAX_RAW_SIZE_BYTES) {
      setUploadError('Selected image is too large (max 12 MB).');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const prepared = await optimizeImageIfNeeded(rawFile);
      const formData = new FormData();
      formData.append('file', prepared);

      const res = await apiFetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data?.error?.message ?? 'Could not upload photo.');
        return;
      }

      if (data?.url) {
        onChange(data.url);
      }
    } catch {
      setUploadError('Network error while uploading photo. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    void processFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    void processFile(file);
  }

  const effectivePreview = value || fallbackPreviewUrl || '';

  if (variant === 'avatar') {
    return (
      <div className="space-y-2">
        <span className="block text-xs font-semibold text-[#13241B]">{label}</span>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border border-[#DCE4DD] bg-[#EAF2EC] shrink-0 flex items-center justify-center">
            {effectivePreview ? (
              <BotanicalImage
                src={effectivePreview}
                alt="Profile photo preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera className="w-6 h-6 text-[#3B5E4C]" aria-hidden="true" />
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                id={inputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleInputChange}
                className="sr-only"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1B4D3E] bg-[#EAF2EC] hover:bg-[#DCE9DF] rounded-lg transition-colors cursor-pointer disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
                )}
                <span>
                  {uploading
                    ? 'Uploading...'
                    : value
                      ? 'Change Photo'
                      : 'Upload Photo'}
                </span>
              </button>

              {value && !uploading && (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#5E7065] hover:text-[#B91C1C] border border-[#DCE4DD] rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#5E7065]">
              {helperText ?? 'JPG, PNG, WebP, or GIF · Max 5 MB'}
            </p>
          </div>
        </div>
        {uploadError && (
          <p className="text-xs text-[#991B1B]" role="alert">
            {uploadError}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-[#13241B]">{label}</span>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleInputChange}
          className="sr-only"
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-colors ${
            dragActive
              ? 'border-[#1B4D3E] bg-[#EAF2EC]'
              : 'border-[#DCE4DD] bg-white'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {effectivePreview ? (
              <div className="w-10 h-10 rounded-md overflow-hidden bg-[#E8EFE9] border border-[#DCE4DD] shrink-0">
                <BotanicalImage
                  src={effectivePreview}
                  alt="Uploaded preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-md bg-[#F2F5F2] border border-[#DCE4DD] flex items-center justify-center shrink-0">
                <ImagePlus className="w-4 h-4 text-[#4D5F54]" aria-hidden="true" />
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xs font-medium text-[#13241B] truncate">
                {uploading
                  ? 'Uploading photo...'
                  : value
                    ? 'Custom photo uploaded'
                    : helperText ?? 'Choose photo from device or camera'}
              </p>
              <p className="text-[11px] text-[#5E7065]">
                JPG, PNG, WebP, or GIF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#1B4D3E] bg-[#EAF2EC] hover:bg-[#DCE9DF] rounded-md transition-colors cursor-pointer disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5" />
              )}
              <span>{value ? 'Replace' : 'Upload'}</span>
            </button>
            {value && !uploading && (
              <button
                type="button"
                onClick={() => onChange('')}
                aria-label="Remove uploaded photo"
                className="p-1.5 text-[#5E7065] hover:text-[#B91C1C] border border-[#DCE4DD] rounded-md cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {uploadError && (
          <p className="text-xs text-[#991B1B]" role="alert">
            {uploadError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold text-[#13241B]">{label}</span>
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleInputChange}
        className="sr-only"
      />

      {value ? (
        <div className="border border-[#DCE4DD] rounded-xl overflow-hidden bg-[#F7F9F7]">
          <div className="aspect-[16/9] w-full bg-[#E8EFE9] overflow-hidden">
            <BotanicalImage
              src={value}
              alt="Uploaded plant photo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 bg-white border-t border-[#DCE4DD]">
            <span className="text-xs font-medium text-[#37493E] truncate">
              Photo ready
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#1B4D3E] bg-[#EAF2EC] hover:bg-[#DCE9DF] rounded-lg cursor-pointer disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
                )}
                <span>Change Photo</span>
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => onChange('')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#5E7065] hover:text-[#B91C1C] border border-[#DCE4DD] rounded-lg cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!uploading) fileInputRef.current?.click();
            }
          }}
          className={`flex flex-col items-center justify-center text-center px-4 py-5 rounded-xl border border-dashed transition-colors cursor-pointer ${
            dragActive
              ? 'border-[#1B4D3E] bg-[#EAF2EC]'
              : 'border-[#B9C9BD] bg-[#F7F9F7] hover:border-[#1B4D3E] hover:bg-[#F1F6F2]'
          }`}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-[#1B4D3E] animate-spin mb-2" />
          ) : (
            <UploadCloud className="w-6 h-6 text-[#1B4D3E] mb-2" aria-hidden="true" />
          )}
          <p className="text-xs font-semibold text-[#13241B]">
            {uploading
              ? 'Uploading photo...'
              : 'Click to upload photo or drag and drop'}
          </p>
          <p className="text-[11px] text-[#5E7065] mt-0.5">
            {helperText ??
              'JPG, PNG, WebP, or GIF (max 5 MB) · Uses catalog photo if skipped'}
          </p>
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-[#991B1B]" role="alert">
          {uploadError}
        </p>
      )}
    </div>
  );
}
