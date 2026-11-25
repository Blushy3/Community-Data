/** Browser-side image validation and compression (README §7: never trust the extension). */

interface PrepareOptions {
  maxDimension: number
  maxBytes: number
  quality?: number
}

function toWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Image could not be processed.'))
      },
      'image/webp',
      quality,
    )
  })
}

export async function prepareImage(file: File, options: PrepareOptions): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.')
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('The image is too large (max 12 MB before processing).')
  }

  // Decoding proves the file really is an image, not only that it is named like one.
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('This file is not a valid image.')
  }

  const scale = Math.min(1, options.maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Your browser cannot process images.')

  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  let quality = options.quality ?? 0.86
  let blob = await toWebp(canvas, quality)

  while (blob.size > options.maxBytes && quality > 0.4) {
    quality -= 0.1
    blob = await toWebp(canvas, quality)
  }

  if (blob.size > options.maxBytes) {
    throw new Error('The image could not be compressed below the size limit.')
  }

  return blob
}

export async function imageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob)
  const result = { width: bitmap.width, height: bitmap.height }
  bitmap.close?.()
  return result
}
