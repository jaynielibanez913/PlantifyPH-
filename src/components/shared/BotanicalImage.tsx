'use client';

import { useState } from 'react';
import { Sprout } from 'lucide-react';

interface BotanicalImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

export function BotanicalImage({ src, alt, className = '' }: BotanicalImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(src && failedSrc === src);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#E8EFE9] text-[#2F5241] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Sprout className="w-8 h-8 mb-2 opacity-80" aria-hidden="true" />
        <span className="text-xs font-medium line-clamp-2 max-w-[18ch]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      className={className}
    />
  );
}
