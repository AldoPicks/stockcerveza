# StockCerveza — v1.0 (MVP)

App de inventario y ventas para negocios de cerveza, refrescos y botanas.

## Probar en VS Code (sin Firebase todavía)

```bash
npm install
npm run dev
```

Abre la URL que te muestre la terminal (normalmente http://localhost:5173).
La app va a funcionar de inmediato con **datos de prueba** (ver `src/data/seedData.js`) — no necesitas Firebase para probar el flujo completo.

## Conectar Firebase y publicar en GitHub Pages

Sigue el instructivo paso a paso: **`instalacion-github-firebase.md`** (incluido junto a este proyecto, fuera de esta carpeta).

## Estructura del proyecto

```
src/
  models/       -> Lógica pura: motor FIFO (fifo.js) y fábricas de entidades (entities.js)
  data/         -> Datos de prueba (seedData.js)
  context/      -> Estado global de la app (AppContext.jsx) — aquí se conecta todo
  firebase/     -> Configuración de Firebase (config.js)
  pages/        -> Una pantalla por archivo (Home, Venta, Productos, Clientes, etc.)
  components/   -> Piezas reutilizables (BottomNav)
```

## Próximo paso técnico

`AppContext.jsx` ya lee y escribe en Firestore de verdad cuando `.env` está configurado (con recarga automática vía `onSnapshot`), y sigue funcionando con datos de prueba en memoria si no lo está.

Hay un login real (usuario + PIN de 6 dígitos) que usa Firebase Authentication — ver `instalacion-github-firebase.md`, Paso 2.6, para crear tus usuarios. En modo local (sin `.env`) el login no aparece, entras directo.
