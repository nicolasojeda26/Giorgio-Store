# Giorgio Perfumería · tienda de promos

Web para que los clientes de Giorgio Perfumería elijan una promo, armen su combo de perfumes y lo paguen online, sin pasar por WhatsApp. Desarrollo de [litoral.dev](https://litoral-dev.vercel.app).

## Estado

| Etapa | Qué incluye | Estado |
|---|---|---|
| 1. Landing | Inicio con hero, promos, cómo comprar, envíos y pagos, preguntas y pie | Lista |
| 2. Diseño | Página de cada promo con el armado del combo: grilla de perfumes, filtros, buscador, ficha y selección; el combo se agrega al carrito | Lista |
| 3. Carrito y pago | Checkout con datos de envío, pedido en Supabase, pago con Mercado Pago, confirmación y emails | Código listo; falta conectar las cuentas |
| 4. Administración | Panel en `/admin`: pedidos, promos, perfumes con foto y ajustes de envío | Código listo; falta conectar las cuentas |

Alcance acordado con el cliente: pago solo online con tarjeta de débito o crédito (Mercado Pago) y entrega solo por envío a domicilio en Corrientes Capital. No hay pago en efectivo ni retiro en el local.

## Modo de prueba y modo conectado

- **Modo de prueba** (sin variables de entorno): la tienda y el panel trabajan sobre una base de prueba guardada en el navegador, cargada con los datos de ejemplo de `src/data`. El checkout arma un pedido que no cobra y el panel entra sin usuario. Sirve para mostrarle todo el recorrido al cliente.
- **Modo conectado** (con las variables de `.env.example`): el catálogo se lee de Supabase, el pedido se guarda en la base y el pago se hace en Mercado Pago.

## Cómo correrlo

```bash
npm install
npm run dev          # solo la web, en modo de prueba: http://localhost:5173
npm run build        # build de producción en dist/ (Vercel)
npm run build:demo   # un solo archivo HTML en demo/index.html para mostrarle al cliente
npm test             # 35 tests: pedidos, pagos, webhook, permisos del panel y base de datos
npm run check        # revisa que las cuentas estén bien conectadas (solo lee, no cambia nada)
```

Requiere Node 20 o superior. Para probar en tu máquina con el backend (funciones de `/api`), usá `vercel dev` en lugar de `npm run dev`.

## Conectar las cuentas

1. **Supabase.** Crear el proyecto. En SQL Editor ejecutar, en este orden, `supabase/schema.sql`, `supabase/storage.sql` y `supabase/seed.sql` (datos de ejemplo). En Project Settings > API Keys copiar la URL, la clave publicable y la clave secreta.
2. **Usuario del panel.** En Authentication > Users > Add user, crear el usuario del cliente con email y contraseña. Después, en SQL Editor: `insert into public.admins (user_id) select id from auth.users where email = 'EMAIL_DEL_CLIENTE';`. En Authentication > Sign In / Providers conviene desactivar el registro de usuarios nuevos: aunque alguien se registre no puede entrar al panel, pero así no se juntan cuentas de más.
3. **Mercado Pago.** En Tus integraciones crear una aplicación de Checkout Pro y copiar el Access Token (para probar, el de prueba). En Webhooks cargar la URL `https://TU-DOMINIO/api/mp-webhook`, marcar el evento Pagos y copiar la clave secreta.
4. **Variables.** Copiar `.env.example` como `.env.local`, completar los valores y cargar los mismos en Vercel (Project Settings > Environment Variables). `SITE_URL` es la URL pública del sitio.
5. **Emails (opcional).** Con una cuenta de Resend y un dominio verificado, completar `RESEND_API_KEY`, `EMAIL_FROM` y `SHOP_EMAIL`. Sin eso no se envían emails y el resto funciona igual.
6. **Revisar.** `npm run check` confirma que la tienda lee el catálogo, que los pedidos no son públicos, que hay un administrador, que existe el bucket de fotos y que el token de Mercado Pago es válido.

Las claves secretas (`SUPABASE_SECRET_KEY`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `RESEND_API_KEY`) van solo en `.env.local` y en Vercel. `.env.local` está en `.gitignore`: no se sube al repositorio.

### Qué está probado y qué falta

Probado, además de los tests de `npm test`:

- Las consultas de la tienda, del backend y del panel corrieron con `supabase-js` real contra Postgres 16 y PostgREST (el motor de la API de Supabase), con el esquema de este proyecto: catálogo, checkout, webhook, login, altas, bajas y cambios del panel, y los permisos (un visitante o un usuario sin permiso no puede cambiar nada).
- El recorrido completo en navegador, en celular y escritorio, en modo de prueba y conectado a ese entorno.

Falta probar una vez con las cuentas reales, porque en ese entorno estaban simulados:

- El login de Supabase Auth y la subida de fotos a Supabase Storage.
- Un pago con tarjeta de prueba de Mercado Pago, incluida la llegada del webhook.
- El envío de emails con Resend.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | React 19 + Vite 8 |
| Rutas | React Router 7 |
| Estilos | Tailwind CSS 4 (tokens en `src/styles/index.css`) |
| Íconos | lucide-react |
| Fuentes | Bodoni Moda (títulos y precios) y Hanken Grotesk (texto), servidas desde el propio sitio |
| Deploy | Vercel (`vercel.json` ya tiene la regla para las rutas) |
| Base de datos | Supabase (Postgres con Row Level Security), Auth para el panel y Storage para las fotos |
| Backend | Funciones de Vercel en `/api` (Node) |
| Pagos | Mercado Pago, Checkout Pro |
| Emails | Resend (opcional) |
| Tests | `node --test` con PGlite (Postgres en memoria) |

## Estructura

```
src/
  config/site.js        datos del negocio: dirección, horarios, Instagram, envío de ejemplo
  data/                 promos y perfumes de ejemplo (origen de la base de prueba y de supabase/seed.sql)
  lib/catalog.jsx       catálogo de la tienda; se consume con useCatalog()
  lib/catalogQueries.js lectura del catálogo desde Supabase (JavaScript puro, se prueba aparte)
  lib/demoDb.js         base de prueba del navegador (modo de prueba)
  lib/cart.jsx          carrito: combos armados, subtotal y guardado en el navegador
  lib/useCombo.js       selección de perfumes de un combo (hasta la cantidad de la promo)
  lib/orders.js         crear el pedido y consultar su estado desde el navegador
  lib/                  además: backend.js (modo de prueba o conectado), supabase.js, formato, navegación
  components/           Header, Footer, Logo, CartDrawer, PromoCard, Bottles (ilustraciones), PerfumeCard,
                        PerfumeVisual (foto o ilustración), PerfumeDialog, ComboSummary, Stepper
  sections/             secciones de la landing, en el orden en que aparecen
  pages/                Home, PromoPage (armado del combo), Checkout, Order (estado del pedido), NotFound
  admin/                panel de administración (se descarga recién al entrar a /admin)
    api/                operaciones del panel: supabase.js (real) y demo.js (modo de prueba)
    pages/              Login, Orders, OrderDetail, Promos, PromoForm, Perfumes, PerfumeForm, Settings
    store.jsx           sesión, datos y avisos del panel
    ui.jsx              campos, interruptores, botones, confirmaciones
    image.js            achica la foto en el celular antes de subirla
  styles/index.css      tokens de diseño, tipografías y animaciones
api/
  checkout.js           POST: valida el carrito, guarda el pedido y crea el pago en Mercado Pago
  order.js              GET: estado del pedido para la página de confirmación
  mp-webhook.js         POST: aviso de Mercado Pago; marca el pedido como pagado y envía los emails
  _lib/                 reglas del pedido, Mercado Pago, base de datos, emails (no son rutas)
shared/validation.js    validación de los datos del comprador, igual en el formulario y en el servidor
supabase/               schema.sql (tablas y permisos), storage.sql (fotos) y seed.sql (datos de ejemplo, generado)
scripts/                build-seed.js (genera seed.sql) y check-setup.js (npm run check)
tests/                  tests del backend, de los permisos y del panel
```

Los datos de ejemplo están en `src/data/promos.js`, `src/data/perfumes.js` y `src/config/site.js`. Si se cambian, `npm run seed:build` regenera `supabase/seed.sql`; en modo de prueba, la base del navegador se actualiza con Ajustes > Restablecer datos de prueba.

## Cómo funciona el armado del combo

1. Cada promo define `quantity`: cuántos perfumes elige el cliente.
2. En `/promo/:slug` se listan los perfumes que entran en esa promo. Se puede filtrar por género, buscar por nombre o nota y abrir la ficha.
3. El cliente suma perfumes (puede repetir) hasta completar la cantidad. Los que no tienen stock se ven, pero no se pueden elegir.
4. Con el combo completo se habilita "Agregar al carrito". El carrito guarda `{ promoSlug, perfumeIds }` y toma el precio de la promo.

El catálogo de `src/data/perfumes.js` es de ejemplo: nombres y notas inventados hasta tener el listado real del cliente.

## Cómo funciona el pago

1. El checkout manda al servidor los datos del comprador y qué eligió (promo y perfumes), nunca precios.
2. `api/checkout.js` valida todo contra la base (promo activa, cantidad exacta, perfumes de esa promo y con stock), calcula el total, guarda el pedido como `pendiente` y crea la preferencia de Mercado Pago solo para tarjetas.
3. El comprador paga en Mercado Pago y vuelve a `/pedido/:id/:token`.
4. Mercado Pago avisa a `api/mp-webhook.js`. El servidor consulta ese pago en la API de Mercado Pago y, si está aprobado por el total del pedido, lo marca `pagado` y envía los emails una sola vez. Si el comprador vuelve antes de que llegue el aviso, la página del pedido hace la misma consulta.
5. Estados del pedido: `pendiente`, `pagado`, `enviado`, `entregado`, `cancelado`. Los dos de envío y la cancelación se manejan desde el panel.

## Panel de administración

Se entra por `/admin` (no hay enlace desde la tienda). Está pensado para usarse desde el celular.

- **Pedidos.** Arranca en "Para enviar" (los pagados). Cada pedido muestra qué lleva, el teléfono y el email del cliente y la dirección con enlace al mapa. Un botón lo pasa a enviado y después a entregado; también se puede cancelar o corregir el estado.
- **Promos.** Crear, editar, pausar, ordenar y eliminar. Cada promo define nombre, precio, cuántos perfumes se eligen, foto o ilustración y qué perfumes entran. Una sola puede ser la destacada (tarjeta grande del inicio).
- **Perfumes.** Crear, editar y eliminar, con foto, tamaño, género y ficha opcional. Interruptor rápido de stock en la lista y filtros "Sin stock" y "Sin promo". Desde el perfume también se elige en qué promos entra.
- **Ajustes.** Zona, costo y demora del envío.

Permisos: los aplica la base de datos, no el panel. Solo quien está en la tabla `admins` puede cambiar el catálogo y los ajustes. De los pedidos, el administrador solo puede cambiar el estado: ni montos ni datos de pago. Crear pedidos y registrar pagos lo hacen únicamente las funciones de `/api`.

Fotos: se achican en el celular antes de subirse (WebP, lado máximo 900 px) y se guardan en el bucket público `productos`. Mientras un perfume no tiene foto, se muestra su ilustración.

## Diseño

- Paleta: negro cálido, marfil y dorado como único acento (variables `--color-*` en `src/styles/index.css`).
- Tipografía: Bodoni Moda para títulos y precios, en línea con el logo; Hanken Grotesk para el texto.
- Ilustraciones: frascos propios y genéricos en SVG (`components/Bottles.jsx`). No representan ninguna marca y se reemplazan por fotos reales cuando el cliente las cargue.
- Movimiento: entradas cortas al hacer scroll, una sola vez; se desactivan con `prefers-reduced-motion`.

## Pendiente del cliente

- Logo oficial en SVG o PNG (hoy el logo está compuesto con tipografía en `components/Logo.jsx`).
- Email y contraseña para el usuario del panel, y el email donde quiere recibir los avisos de pedidos.
- Confirmar las promos vigentes y sus precios, el costo de envío y la demora.
- Fotos de los perfumes y listado por promo.
- Cuentas de Supabase, Mercado Pago y Vercel (ver Conectar las cuentas) y nombre de dominio.
