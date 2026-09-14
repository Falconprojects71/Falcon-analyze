/**
 * Utility to convert SVG data URLs, raw image files, or chart screenshots to optimized Base64 strings.
 * Ensures the Gemini Multimodal Vision API receives clean, high-resolution, and sharp image buffers.
 */
export async function ensureRasterImageBase64(
  imageUrl: string,
  mimeType: string
): Promise<{ base64: string; mimeType: string }> {
  if (!imageUrl) {
    return { base64: '', mimeType: 'image/jpeg' };
  }

  // If it is already a clean PNG/JPEG/WEBP data URL under 4MB, preserve the pristine original image data
  if (
    (imageUrl.startsWith('data:image/png;base64,') ||
      imageUrl.startsWith('data:image/jpeg;base64,') ||
      imageUrl.startsWith('data:image/webp;base64,')) &&
    imageUrl.length < 5000000
  ) {
    const detectedMime = imageUrl.substring(5, imageUrl.indexOf(';'));
    return { base64: imageUrl, mimeType: detectedMime || mimeType || 'image/png' };
  }

  return new Promise((resolve) => {
    // Failsafe timeout to prevent hanging promises
    const timeoutId = setTimeout(() => {
      resolve({ base64: imageUrl, mimeType: mimeType || 'image/jpeg' });
    }, 3000);

    const img = new Image();

    // Only set crossOrigin for remote http(s) URLs, not data or blob URLs
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        let width = img.naturalWidth || 1600;
        let height = img.naturalHeight || 900;

        // Cap dimensions to max 1920px to retain high-fidelity price scales and candle wicks
        const maxDim = 1920;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#090A0C';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          // Export with high quality (0.92) to keep text and price axis sharp
          const optDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          resolve({ base64: optDataUrl, mimeType: 'image/jpeg' });
          return;
        }
      } catch (err) {
        console.warn('Image optimization canvas error:', err);
      }
      resolve({ base64: imageUrl, mimeType: mimeType || 'image/jpeg' });
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve({ base64: imageUrl, mimeType: mimeType || 'image/jpeg' });
    };

    img.src = imageUrl;
  });
}



