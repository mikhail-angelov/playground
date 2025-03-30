export default function getCroppedImg(
  image: HTMLImageElement,
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx?.drawImage(
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

  const data = canvas.toDataURL("image/png");
  return data;
}
