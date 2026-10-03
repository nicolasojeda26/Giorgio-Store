// CATÁLOGO DE EJEMPLO. Los nombres y notas son inventados para poder mostrar el armado del combo;
// en la etapa 4 el cliente carga sus perfumes reales (con foto) desde el panel de administración.
// Se usa en modo de prueba (sin backend) y para generar supabase/seed.sql.
//
// gender: 'hombre' | 'mujer' | 'unisex'
// notes: [salida, corazón, fondo]
// bottle: ilustración que se muestra mientras no haya foto (ver components/Bottles.jsx)
// promos: slugs de las promos en las que entra el perfume
// stock: false lo muestra como "Sin stock" y no deja elegirlo

const P100 = ['2-perfumes-100-ml']
const ARABES = ['2-arabes-50-ml', '5-arabes']
const DECANTS = ['decants-3']

export const perfumes = [
  // ----- Perfumes 100 ml -----
  { id: 'noche-de-ambar', name: 'Noche de Ámbar', gender: 'hombre', size: '100 ml', family: 'Oriental', notes: ['Bergamota', 'Lavanda', 'Ámbar'], bottle: { shape: 'flacon', tone: 'smoke' }, promos: P100, stock: true },
  { id: 'costa-azul', name: 'Costa Azul', gender: 'hombre', size: '100 ml', family: 'Fresco', notes: ['Limón', 'Notas marinas', 'Cedro'], bottle: { shape: 'flacon', tone: 'azul' }, promos: P100, stock: true },
  { id: 'madera-negra', name: 'Madera Negra', gender: 'hombre', size: '100 ml', family: 'Amaderado', notes: ['Pimienta', 'Vetiver', 'Sándalo'], bottle: { shape: 'flacon', tone: 'amber' }, promos: P100, stock: true },
  { id: 'cuero-dorado', name: 'Cuero Dorado', gender: 'hombre', size: '100 ml', family: 'Intenso', notes: ['Canela', 'Cuero', 'Vainilla'], bottle: { shape: 'flacon', tone: 'champagne' }, promos: P100, stock: true },
  { id: 'verde-urbano', name: 'Verde Urbano', gender: 'hombre', size: '100 ml', family: 'Fresco', notes: ['Menta', 'Geranio', 'Musgo'], bottle: { shape: 'flacon', tone: 'esmeralda' }, promos: P100, stock: false },
  { id: 'rosa-tardia', name: 'Rosa Tardía', gender: 'mujer', size: '100 ml', family: 'Floral', notes: ['Pera', 'Rosa', 'Almizcle'], bottle: { shape: 'round', tone: 'rose' }, promos: P100, stock: true },
  { id: 'flor-de-sal', name: 'Flor de Sal', gender: 'mujer', size: '100 ml', family: 'Fresco', notes: ['Mandarina', 'Jazmín', 'Sal marina'], bottle: { shape: 'round', tone: 'champagne' }, promos: P100, stock: true },
  { id: 'ciruela-y-vainilla', name: 'Ciruela y Vainilla', gender: 'mujer', size: '100 ml', family: 'Dulce', notes: ['Ciruela', 'Flor de azahar', 'Vainilla'], bottle: { shape: 'round', tone: 'ciruela' }, promos: P100, stock: true },
  { id: 'jazmin-de-verano', name: 'Jazmín de Verano', gender: 'mujer', size: '100 ml', family: 'Floral', notes: ['Bergamota', 'Jazmín', 'Madera blanca'], bottle: { shape: 'round', tone: 'amber' }, promos: P100, stock: true },
  { id: 'almizcle-blanco', name: 'Almizcle Blanco', gender: 'unisex', size: '100 ml', family: 'Limpio', notes: ['Aldehídos', 'Iris', 'Almizcle'], bottle: { shape: 'round', tone: 'azul' }, promos: P100, stock: true },
  { id: 'citrico-del-litoral', name: 'Cítrico del Litoral', gender: 'unisex', size: '100 ml', family: 'Cítrico', notes: ['Pomelo', 'Neroli', 'Vetiver'], bottle: { shape: 'flacon', tone: 'champagne' }, promos: P100, stock: true },
  { id: 'humo-y-miel', name: 'Humo y Miel', gender: 'unisex', size: '100 ml', family: 'Intenso', notes: ['Azafrán', 'Tabaco', 'Miel'], bottle: { shape: 'flacon', tone: 'ciruela' }, promos: P100, stock: true },

  // ----- Árabes -----
  { id: 'oud-del-desierto', name: 'Oud del Desierto', gender: 'unisex', size: '50 ml', family: 'Amaderado', notes: ['Azafrán', 'Oud', 'Ámbar'], bottle: { shape: 'arabesque', tone: 'smoke' }, promos: ARABES, stock: true },
  { id: 'ambar-real', name: 'Ámbar Real', gender: 'unisex', size: '50 ml', family: 'Oriental', notes: ['Canela', 'Ámbar', 'Vainilla'], bottle: { shape: 'arabesque', tone: 'amber' }, promos: ARABES, stock: true },
  { id: 'rosa-de-oriente', name: 'Rosa de Oriente', gender: 'mujer', size: '50 ml', family: 'Floral', notes: ['Lichi', 'Rosa', 'Oud'], bottle: { shape: 'arabesque', tone: 'rose' }, promos: ARABES, stock: true },
  { id: 'sandalo-imperial', name: 'Sándalo Imperial', gender: 'hombre', size: '50 ml', family: 'Amaderado', notes: ['Cardamomo', 'Sándalo', 'Cuero'], bottle: { shape: 'arabesque', tone: 'champagne' }, promos: ARABES, stock: true },
  { id: 'incienso-dorado', name: 'Incienso Dorado', gender: 'unisex', size: '50 ml', family: 'Intenso', notes: ['Pimienta rosa', 'Incienso', 'Pachulí'], bottle: { shape: 'arabesque', tone: 'smoke' }, promos: ARABES, stock: true },
  { id: 'datil-y-miel', name: 'Dátil y Miel', gender: 'mujer', size: '50 ml', family: 'Dulce', notes: ['Dátil', 'Miel', 'Praliné'], bottle: { shape: 'arabesque', tone: 'ciruela' }, promos: ARABES, stock: true },
  { id: 'noche-de-zafiro', name: 'Noche de Zafiro', gender: 'hombre', size: '50 ml', family: 'Fresco', notes: ['Bergamota', 'Lavanda', 'Haba tonka'], bottle: { shape: 'arabesque', tone: 'azul' }, promos: ARABES, stock: true },
  { id: 'jardin-de-jade', name: 'Jardín de Jade', gender: 'unisex', size: '50 ml', family: 'Verde', notes: ['Té verde', 'Jazmín', 'Almizcle'], bottle: { shape: 'arabesque', tone: 'esmeralda' }, promos: ARABES, stock: false },

  // ----- Decants -----
  { id: 'decant-ambar', name: 'Ámbar Nocturno', gender: 'hombre', size: 'Decant', family: 'Oriental', notes: ['Bergamota', 'Lavanda', 'Ámbar'], bottle: { shape: 'vial', tone: 'amber' }, promos: DECANTS, stock: true },
  { id: 'decant-marino', name: 'Brisa Marina', gender: 'hombre', size: 'Decant', family: 'Fresco', notes: ['Limón', 'Notas marinas', 'Cedro'], bottle: { shape: 'vial', tone: 'azul' }, promos: DECANTS, stock: true },
  { id: 'decant-rosa', name: 'Rosa de Seda', gender: 'mujer', size: 'Decant', family: 'Floral', notes: ['Pera', 'Rosa', 'Almizcle'], bottle: { shape: 'vial', tone: 'rose' }, promos: DECANTS, stock: true },
  { id: 'decant-vainilla', name: 'Vainilla Negra', gender: 'mujer', size: 'Decant', family: 'Dulce', notes: ['Ciruela', 'Flor de azahar', 'Vainilla'], bottle: { shape: 'vial', tone: 'ciruela' }, promos: DECANTS, stock: true },
  { id: 'decant-citrico', name: 'Cítrico Dorado', gender: 'unisex', size: 'Decant', family: 'Cítrico', notes: ['Pomelo', 'Neroli', 'Vetiver'], bottle: { shape: 'vial', tone: 'champagne' }, promos: DECANTS, stock: true },
  { id: 'decant-jade', name: 'Té de Jade', gender: 'unisex', size: 'Decant', family: 'Verde', notes: ['Té verde', 'Jazmín', 'Almizcle'], bottle: { shape: 'vial', tone: 'esmeralda' }, promos: DECANTS, stock: true },
]
