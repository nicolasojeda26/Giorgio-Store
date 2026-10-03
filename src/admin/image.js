// Achica la foto en el navegador antes de subirla: las fotos de celular pesan varios MB
// y en la tienda se muestran chicas. Devuelve un Blob listo para subir.

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    image.src = url
  })

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality))

/**
 * @param {File} file   imagen elegida por la persona
 * @param {number} max  lado máximo en píxeles
 */
export async function prepareImage(file, max = 900) {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen')
  const image = await loadImage(file)
  const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)

  // WebP conserva la transparencia y pesa poco. Si el navegador no lo genera (Safari viejo),
  // se usa PNG para imágenes con transparencia y JPEG para el resto.
  const webp = await toBlob(canvas, 'image/webp', 0.86)
  if (webp?.type === 'image/webp') return webp
  const fallback =
    file.type === 'image/png' ? await toBlob(canvas, 'image/png') : await toBlob(canvas, 'image/jpeg', 0.86)
  if (!fallback) throw new Error('No se pudo procesar la imagen')
  return fallback
}
