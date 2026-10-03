// Promos de ejemplo. Se usan en modo de prueba (sin backend) y para generar supabase/seed.sql.
// Con Supabase conectado, la web lee las promos de la base (ver lib/catalog.jsx).
//
// title: nombre completo, para el carrito, la ficha y el título de la página.
// quantity: cuántos perfumes elige el cliente dentro de la promo.
// art: ilustración que se muestra en la tarjeta (ver components/Bottles.jsx).
export const promos = [
  {
    slug: '2-perfumes-100-ml',
    name: '2 perfumes',
    title: '2 perfumes 100 ml',
    detail: '100 ml',
    quantity: 2,
    price: 50000,
    description: 'Elegí dos perfumes de 100 ml y combinalos como quieras: para vos, para regalar o uno y uno.',
    art: 'duo',
    featured: true,
    active: true,
  },
  {
    slug: '2-arabes-50-ml',
    name: '2 árabes',
    title: '2 árabes 50 ml',
    detail: '50 ml',
    quantity: 2,
    price: 35000,
    description: 'Dos perfumes árabes de 50 ml, intensos y de larga duración.',
    art: 'arabes',
    active: true,
  },
  {
    slug: '5-arabes',
    name: '5 árabes',
    title: '5 árabes',
    detail: 'Combo',
    quantity: 5,
    price: 25000,
    description: 'Cinco fragancias árabes para ir cambiando todos los días.',
    art: 'cinco',
    active: true,
  },
  {
    slug: 'decants-3',
    name: '3 decants',
    title: '3 decants',
    detail: 'Para probar',
    quantity: 3,
    price: 25000,
    description: 'Tres decants para conocer fragancias nuevas antes de elegir tu favorita.',
    art: 'decants',
    active: true,
  },
]
