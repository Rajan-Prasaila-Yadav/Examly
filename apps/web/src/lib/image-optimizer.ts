// apps/web/src/lib/image-optimizer.ts

/**
 * High-performance client-side image optimizer for batch covers:
 * - Accepts any image file (JPG, PNG, WebP, AVIF, GIF, etc.) regardless of size.
 * - Center-crops and scales to exact 16:9 ratio (1280 × 720 px standard HD).
 * - Compresses into an ultra-clean WebP / JPEG (~120 KB - 250 KB).
 * - Avoids browser localStorage quota limits and ensures lightning-fast 0ms rendering.
 */
export async function optimizeBatchCover(
  file: File,
  targetWidth = 1280,
  targetHeight = 720,
): Promise<{ dataUrl: string; blob: Blob; fileName: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const isImage =
      file.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|avif|gif|bmp|tiff)$/i.test(file.name);

    if (!isImage) {
      return reject(
        new Error('Please select a valid image file (JPG, PNG, WebP, or AVIF).'),
      );
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image file.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas context is not available.'));

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Center-crop source into target 16:9
          const sourceAspect = img.width / img.height;
          const targetAspect = targetWidth / targetHeight;

          let sWidth = img.width;
          let sHeight = img.height;
          let sx = 0;
          let sy = 0;

          if (sourceAspect > targetAspect) {
            // Source is wider than 16:9 -> crop left & right
            sWidth = img.height * targetAspect;
            sx = (img.width - sWidth) / 2;
          } else {
            // Source is taller than 16:9 -> crop top & bottom
            sHeight = img.width / targetAspect;
            sy = (img.height - sHeight) / 2;
          }

          ctx.drawImage(
            img,
            sx,
            sy,
            sWidth,
            sHeight,
            0,
            0,
            targetWidth,
            targetHeight,
          );

          // Attempt WebP export, fallback to JPEG
          let dataUrl = '';
          let mime = 'image/webp';
          try {
            dataUrl = canvas.toDataURL('image/webp', 0.88);
            if (!dataUrl.startsWith('data:image/webp')) {
              mime = 'image/jpeg';
              dataUrl = canvas.toDataURL('image/jpeg', 0.88);
            }
          } catch {
            mime = 'image/jpeg';
            dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          }

          canvas.toBlob(
            (blob) => {
              const finalBlob =
                blob ||
                new Blob([dataUrl], { type: mime });
              const baseName = file.name.replace(/\.[^/.]+$/, '');
              const ext = mime === 'image/webp' ? 'webp' : 'jpg';
              resolve({
                dataUrl,
                blob: finalBlob,
                fileName: `${baseName}-16x9.${ext}`,
                mimeType: mime,
              });
            },
            mime,
            0.88,
          );
        } catch (err: any) {
          reject(new Error(err?.message || 'Failed to process image canvas.'));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

