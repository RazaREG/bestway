/**
 * Resize and compress photos for upload (lightweight, messaging-app style).
 */
export async function compressImageFile(file, options = {}) {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.68,
    skipBelowBytes = 120 * 1024,
    targetMaxBytes = 380 * 1024,
  } = options;

  if (!file?.type?.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (file.size > 0 && file.size <= skipBelowBytes) {
    return tryLightPass(file, maxWidth, maxHeight, 0.75, targetMaxBytes);
  }

  const bitmap = await loadImageSource(file);
  const { width, height } = fitDimensions(
    bitmap.width,
    bitmap.height,
    maxWidth,
    maxHeight
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, width, height);
  cleanupImageSource(bitmap);

  let blob = await canvasToBlob(canvas, "image/jpeg", quality);

  if (blob && blob.size > targetMaxBytes) {
    blob = await canvasToBlob(canvas, "image/jpeg", 0.52);
  }

  if (!blob) return file;

  const worthUsing =
    blob.size < file.size * 0.92 || blob.size <= targetMaxBytes;

  if (!worthUsing && file.size <= targetMaxBytes) return file;

  const baseName = (file.name || "photo").replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

async function tryLightPass(file, maxW, maxH, quality, targetMaxBytes) {
  if (file.size <= targetMaxBytes * 0.65) return file;

  try {
    const bitmap = await loadImageSource(file);
    const { width, height } = fitDimensions(bitmap.width, bitmap.height, maxW, maxH);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    cleanupImageSource(bitmap);
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (!blob || blob.size >= file.size) return file;
    const baseName = (file.name || "photo").replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

function fitDimensions(width, height, maxW, maxH) {
  if (width <= maxW && height <= maxH) return { width, height };

  const ratio = Math.min(maxW / width, maxH / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function loadImageSource(file) {
  return new Promise((resolve, reject) => {
    if (typeof createImageBitmap === "function") {
      createImageBitmap(file)
        .then(resolve)
        .catch(() => loadWithImageElement(file).then(resolve).catch(reject));
      return;
    }
    loadWithImageElement(file).then(resolve).catch(reject);
  });
}

function loadWithImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };

    img.src = url;
  });
}

function cleanupImageSource(source) {
  if (source && typeof source.close === "function") {
    source.close();
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}
