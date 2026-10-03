/** "2 Árabes 50 ml" -> "2-arabes-50-ml". Se usa en las direcciones: /promo/2-arabes-50-ml */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Slug que no choque con los que ya existen: agrega -2, -3... */
export function uniqueSlug(text, taken) {
  const base = slugify(text) || 'item'
  let slug = base
  for (let n = 2; taken.includes(slug); n += 1) slug = `${base}-${n}`
  return slug
}
