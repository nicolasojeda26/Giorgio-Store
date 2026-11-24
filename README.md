# Giorgio · Stock y finanzas

Sistema de stock y finanzas para Giorgio Perfumería (Irigoyen 2498, Corrientes). Desarrollo de [Litoral Dev](https://litoraldev.com.ar).

No es una tienda ni una caja registradora: las ventas se cargan a mano y el sistema lleva el stock, la caja y las cuentas del negocio.

## Qué hace

Funciona para **dos locales** (o más): cada uno tiene su stock, su caja y sus gastos fijos; los productos y los precios son los mismos. El dueño elige arriba con qué local trabaja o ve "Todos los locales".

| Sección | Dueño | Encargado (su local) | Vendedor (su local) |
|---|---|---|---|
| **Inicio** | Vendido hoy, resultado del mes, cada local, punto de equilibrio, stock bajo, deudas | Vendido hoy en el local, stock bajo | Lo que vendió hoy, stock bajo |
| **Ventas** | Registrar (eligiendo el local), ver con costo y ganancia, anular | Registrar, ver las del local, anular | Registrar y ver las propias |
| **Stock** | Productos con costo, precio y margen; stock de cada local; ingresar, contar, historial | Ingresar y contar en su local (sin costos) | Ingresar mercadería; ve el stock del otro local |
| **Traspasos** | De cualquier local a otro; anular | Mandar mercadería desde su local | — |
| **Compras** | A proveedores: llegan a un local, suman stock, actualizan costo; deudas y pagos | — | — |
| **Caja** | Por local o total: saldos por cuenta, movimientos, gastos fijos sin pagar, aportes y retiros | La de su local (sin aportes ni retiros) | — |
| **Finanzas** | Resultado total y por local, comparación entre locales, punto de equilibrio, rentabilidad por producto, gastos fijos | — | — |
| **Calculadoras** | Precio de venta, "¿Me alcanza?", punto de equilibrio rápido | — | — |
| **Guía** | Cómo usar todo, con ejemplos de las cuentas | Lo de su rol | Lo de su rol |
| **Ajustes** | Negocio, sueldo, locales, medios de pago, usuarios | Su contraseña | Su contraseña |

Gastos fijos: cada uno es de un local (alquiler, servicios, sueldos del local) o **general** del negocio (monotributo, contador). El resultado de un local descuenta solo lo suyo; los generales y el sueldo del dueño entran en el total.

### Cómo cuenta la plata

- **Venta:** guarda el costo de cada producto en ese momento, descuenta stock y anota en Caja el cobro **neto** de la comisión del medio de pago (comisión + IVA sobre la comisión + retenciones, según Ajustes > Medios de pago).
- **Resultado del mes** (Finanzas): ventas − costo de la mercadería vendida − comisiones = **margen de contribución**; menos gastos fijos, sueldo del dueño y gastos variables = **ganancia o pérdida**. Las compras de mercadería no son gasto: se vuelven costo cuando el producto se vende.
- **Punto de equilibrio:** (gastos fijos + sueldo) ÷ margen de contribución del mes. También en unidades, con la ganancia promedio por unidad.
- **Caja** es la plata real que se movió; **Finanzas** es lo que se ganó. Por eso pagar el alquiler mueve la caja pero no cambia el resultado (el alquiler ya cuenta como gasto fijo del mes).

Las cuentas están en `shared/finanzas.js` (las usan las pantallas, el servidor y los tests).

## Stack

React 19 + Vite + Tailwind 4 en el navegador; una sola función de Vercel (`api/rpc.js`) con todas las acciones; Postgres en Neon. El esquema (`api/_lib/schema.js`) se crea solo en la primera visita, junto con medios de pago y gastos fijos de ejemplo editables. Las operaciones que tocan varias tablas (venta, compra, anulaciones, ajustes de stock) son funciones de la base: se hacen enteras o no se hacen.

Seguridad: usuarios con contraseña (scrypt), sesión en cookie HttpOnly, límite de intentos, permisos por rol en el servidor (los empleados no reciben costos ni datos financieros), `noindex`.

## Ponerlo en marcha en Vercel

1. Crear el repositorio y el proyecto en Vercel (framework Vite).
2. Storage > conectar una base **Neon** al proyecto (carga `DATABASE_URL`). Sirve la `giorgio-store-db` que ya existe, o una nueva.
3. Cargar `SETUP_CODE` (un código que inventás) y desplegar.
4. Entrar a la web: pide crear el usuario del dueño con ese código. Después, en Ajustes, el dueño agrega a los empleados con una contraseña inicial.
5. Completar en Finanzas los montos de los gastos fijos y en Ajustes el sueldo del dueño y las comisiones reales de cada medio de pago.

## Desarrollo

```bash
npm install
npm test        # cuentas y recorrido completo sobre Postgres en memoria (PGlite)
npm run build
```

Para probar con backend en tu compu: `vercel dev` con `DATABASE_URL` y `SETUP_CODE` en `.env.local`.

## Pendiente

- Las calculadoras extra que va a mandar Giorgio.
- Nombre y dirección reales del segundo local (Ajustes > Locales).
- Logo oficial (hoy es el wordmark tipográfico de `src/components/Logo.jsx`).
- Cargar los productos reales (se puede sumar una importación desde Excel).
