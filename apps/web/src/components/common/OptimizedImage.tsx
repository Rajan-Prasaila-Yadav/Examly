// apps/web/src/components/common/OptimizedImage.tsx
'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoadingComplete'> {
  fallbackSrc?: string;
  aspectRatio?: string;
  wrapperClassName?: string;
}

export function OptimizedImage({
  src,
  alt,
  fallbackSrc = '/placeholder.png',
  aspectRatio = '16/9',
  wrapperClassName = '',
  className = '',
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const imgSrc = error || !src ? fallbackSrc : src;

  return (
    <div
      style={{ aspectRatio }}
      className={`relative overflow-hidden bg-slate-800/50 ${wrapperClassName}`}
    >
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-800 via-slate-700/50 to-slate-800" />
      )}
      <Image
        src={imgSrc}
        alt={alt || 'Image'}
        loading="lazy"
        decoding="async"
        className={`duration-300 ease-in-out object-cover ${
          isLoading ? 'scale-105 blur-sm opacity-0' : 'scale-100 blur-0 opacity-100'
        } ${className}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
        {...props}
      />
    </div>
  );
}
