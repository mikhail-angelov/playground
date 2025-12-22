/**
 * Optimizes an image by resizing and compressing it
 * @param file - The image file to optimize
 * @param maxWidth - Maximum width (default: 1200)
 * @param maxHeight - Maximum height (default: 1200)
 * @param quality - JPEG/PNG quality (0.0 to 1.0, default: 0.8)
 * @returns Promise resolving to data URL of optimized image
 */
export async function optimizeImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Determine output format - preserve PNG for transparency, use JPEG for photos
        const isPNG = file.type === 'image/png';
        const format = isPNG ? 'image/png' : 'image/jpeg';
        
        // Convert to data URL with compression
        const dataUrl = canvas.toDataURL(format, quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a data URL to HTMLImageElement
 * @param dataUrl - The data URL to convert
 * @returns Promise resolving to HTMLImageElement
 */
export function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image from data URL'));
    img.src = dataUrl;
  });
}
