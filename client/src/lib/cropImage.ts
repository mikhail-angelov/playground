export default async function getCroppedImg(imageSrc: string, crop: any): Promise<string> {
    const image = new Image();
    image.src = imageSrc;
  
    return new Promise((resolve, reject) => {
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
  
        if (!ctx) {
          return reject("Failed to get canvas context");
        }
  
        canvas.width = crop.width;
        canvas.height = crop.height;
  
        ctx.drawImage(
          image,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          crop.width,
          crop.height
        );
  
        resolve(canvas.toDataURL("image/png"));
      };
  
      image.onerror = (error) => reject(error);
    });
  }