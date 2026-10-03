// Datos del negocio. `shipping` es el valor de ejemplo: con Supabase conectado, el envío
// se lee de la tabla settings (ver lib/catalog.jsx).
export const site = {
  name: 'Giorgio Perfumería',
  instagram: {
    handle: '@giorgiostoreok',
    url: 'https://www.instagram.com/giorgiostoreok/',
  },
  address: 'Irigoyen 2498, Corrientes Capital',
  hours: 'Lunes a sábado, de 9 a 13 y de 18 a 21:30 h',
  shipping: {
    zone: 'Corrientes Capital',
    cost: 3000, // costo fijo de envío en pesos
    eta: '24 a 48 h',
  },
}
