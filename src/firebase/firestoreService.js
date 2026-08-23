// ============================================================
// Servicio de Firestore — toda la comunicación con la base de datos
// vive en este archivo. AppContext.jsx lo consume y no debería
// necesitar saber los detalles de Firestore (colecciones, batch, etc.).
//
// Colecciones (ver modelo-datos.md):
//   productos, lotes, clientes, ventas, abonos,
//   envasesStock, incidenciasEnvase, salidasVenta, cierresDiarios
// ============================================================

import { db } from './config.js';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { construirDatosSemilla } from '../data/seedData.js';

// ---------- Helpers de conversión Firestore <-> JS ----------

function aFecha(valor) {
  if (!valor) return new Date();
  if (valor instanceof Date) return valor;
  if (valor.toDate) return valor.toDate(); // Firestore Timestamp
  return new Date(valor);
}

function conId(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

// ---------- Listeners en tiempo real (onSnapshot) ----------
// Cada uno devuelve la función "unsubscribe" para poder limpiar en useEffect.

export function escucharProductos(cb) {
  return onSnapshot(collection(db, 'productos'), (snap) => {
    cb(snap.docs.map(conId));
  });
}

export function escucharPresentaciones(cb) {
  return onSnapshot(collection(db, 'presentaciones'), (snap) => {
    cb(snap.docs.map(conId));
  });
}

export function escucharLotes(cb) {
  return onSnapshot(collection(db, 'lotes'), (snap) => {
    cb(
      snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data, fechaIngreso: aFecha(data.fechaIngreso) };
      })
    );
  });
}

export function escucharClientes(cb) {
  return onSnapshot(collection(db, 'clientes'), (snap) => {
    cb(snap.docs.map(conId));
  });
}

export function escucharVentas(cb) {
  const q = query(collection(db, 'ventas'), orderBy('fecha', 'desc'), limit(200));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data(), fecha: aFecha(d.data().fecha) })));
  });
}

export function escucharEnvasesStock(cb) {
  return onSnapshot(collection(db, 'envasesStock'), (snap) => {
    const mapa = {};
    snap.docs.forEach((d) => {
      mapa[d.id] = { productoId: d.id, ...d.data() };
    });
    cb(mapa);
  });
}

export function escucharIncidencias(cb) {
  return onSnapshot(collection(db, 'incidenciasEnvase'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data(), fecha: aFecha(d.data().fecha) })));
  });
}

export function escucharSalidaAbierta(cb) {
  const q = query(collection(db, 'salidasVenta'), where('estado', '==', 'Abierto'), limit(1));
  return onSnapshot(q, (snap) => {
    if (snap.empty) return cb(null);
    const d = snap.docs[0];
    cb({ id: d.id, ...d.data() });
  });
}

export function escucharCierres(cb) {
  const q = query(collection(db, 'cierresDiarios'), orderBy('fecha', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data(), fecha: aFecha(d.data().fecha) })));
  });
}

// ---------- Escrituras ----------

export async function crearProductoFS(producto) {
  const { id, ...datos } = producto;
  const ref = await addDoc(collection(db, 'productos'), datos);
  return { id: ref.id, ...datos };
}

export async function crearPresentacionFS(presentacion) {
  const { id, ...datos } = presentacion;
  await addDoc(collection(db, 'presentaciones'), datos);
}

export async function crearLoteFS(lote) {
  const ref = doc(collection(db, 'lotes'));
  await setDoc(ref, {
    productoId: lote.productoId,
    costoUnitario: lote.costoUnitario,
    cantidadInicial: lote.cantidadInicial,
    cantidadAlmacen: lote.cantidadAlmacen,
    cantidadEnVenta: lote.cantidadEnVenta,
    fechaIngreso: Timestamp.fromDate(lote.fechaIngreso instanceof Date ? lote.fechaIngreso : new Date(lote.fechaIngreso)),
  });
  return ref.id;
}

// Persiste en batch los lotes que el motor FIFO mutó en memoria.
export async function persistirLotesFS(lotes) {
  if (lotes.length === 0) return;
  const batch = writeBatch(db);
  lotes.forEach((lote) => {
    batch.update(doc(db, 'lotes', lote.id), {
      cantidadAlmacen: lote.cantidadAlmacen,
      cantidadEnVenta: lote.cantidadEnVenta,
    });
  });
  await batch.commit();
}

export async function crearClienteFS(cliente) {
  const { id, ...datos } = cliente;
  const ref = await addDoc(collection(db, 'clientes'), datos);
  return { id: ref.id, ...datos };
}

export async function actualizarProductoFS(productoId, cambios) {
  await updateDoc(doc(db, 'productos', productoId), cambios);
}

export async function actualizarPresentacionFS(presentacionId, cambios) {
  await updateDoc(doc(db, 'presentaciones', presentacionId), cambios);
}

export async function actualizarSaldoClienteFS(clienteId, nuevoSaldo) {
  await updateDoc(doc(db, 'clientes', clienteId), { saldoActual: nuevoSaldo });
}

export async function crearVentaFS(venta) {
  const { id, ...datos } = venta;
  const ref = await addDoc(collection(db, 'ventas'), { ...datos, fecha: Timestamp.fromDate(datos.fecha) });
  return ref.id;
}

export async function actualizarVentaFS(ventaId, cambios) {
  await updateDoc(doc(db, 'ventas', ventaId), cambios);
}

export async function crearAbonoFS(abono) {
  const { id, ...datos } = abono;
  await addDoc(collection(db, 'abonos'), { ...datos, fecha: Timestamp.fromDate(datos.fecha) });
}

export async function inicializarEnvaseStockFS(productoId, valores) {
  await setDoc(doc(db, 'envasesStock', productoId), valores);
}

export async function actualizarEnvaseStockFS(productoId, cambios) {
  await updateDoc(doc(db, 'envasesStock', productoId), cambios);
}

export async function crearIncidenciaFS(incidencia) {
  const { id, ...datos } = incidencia;
  await addDoc(collection(db, 'incidenciasEnvase'), { ...datos, fecha: Timestamp.fromDate(datos.fecha) });
}

export async function crearSalidaFS(salida) {
  const { id, ...datos } = salida;
  const ref = await addDoc(collection(db, 'salidasVenta'), {
    ...datos,
    fechaApertura: Timestamp.fromDate(datos.fechaApertura),
    fechaCierre: null,
  });
  return ref.id;
}

export async function actualizarDetallesSalidaFS(salidaId, detalles) {
  await updateDoc(doc(db, 'salidasVenta', salidaId), { detalles });
}

export async function cerrarSalidaFS(salidaId) {
  await updateDoc(doc(db, 'salidasVenta', salidaId), { estado: 'Cerrado', fechaCierre: Timestamp.fromDate(new Date()) });
}

export async function crearCierreFS(cierre) {
  const { id, ...datos } = cierre;
  await addDoc(collection(db, 'cierresDiarios'), { ...datos, fecha: Timestamp.fromDate(datos.fecha) });
}

// ---------- Sembrado inicial ----------
// Sube los datos de prueba SOLO la primera vez que se usa el proyecto con
// este Firebase. Se controla con un documento "guardián" (config/meta) en
// vez de solo revisar si la colección está vacía — así, si más adelante
// borras productos a propósito (para limpiar el catálogo de prueba), la
// app NO los vuelve a sembrar solo porque la colección volvió a estar vacía.

export async function sembrarDatosSiEstaVacio() {
  const metaRef = doc(db, 'config', 'meta');
  const metaSnap = await getDoc(metaRef);
  if (metaSnap.exists() && metaSnap.data()?.sembrado) {
    return false; // ya se sembró alguna vez: nunca más se vuelve a sembrar solo
  }

  const snap = await getDocs(collection(db, 'productos'));
  if (!snap.empty) {
    // Ya hay datos reales (alguien los cargó a mano) — no sembrar,
    // pero sí marcar el guardián para no volver a preguntar.
    await setDoc(metaRef, { sembrado: true }, { merge: true });
    return false;
  }

  const { productos, presentaciones, engine, clientes, envaseStockPorProducto } = construirDatosSemilla();
  const batch = writeBatch(db);

  productos.forEach((p) => {
    const { id, ...datos } = p;
    batch.set(doc(db, 'productos', id), datos);
  });
  presentaciones.forEach((pr) => {
    const { id, ...datos } = pr;
    batch.set(doc(db, 'presentaciones', id), datos);
  });
  engine.lotes.forEach((l) => {
    batch.set(doc(db, 'lotes', l.id), {
      productoId: l.productoId,
      costoUnitario: l.costoUnitario,
      cantidadInicial: l.cantidadInicial,
      cantidadAlmacen: l.cantidadAlmacen,
      cantidadEnVenta: l.cantidadEnVenta,
      fechaIngreso: Timestamp.fromDate(l.fechaIngreso),
    });
  });
  clientes.forEach((c) => {
    const { id, ...datos } = c;
    batch.set(doc(db, 'clientes', id), datos);
  });
  Object.values(envaseStockPorProducto).forEach((e) => {
    batch.set(doc(db, 'envasesStock', e.productoId), {
      cantidadAlmacen: e.cantidadAlmacen,
      cantidadEnVenta: e.cantidadEnVenta,
    });
  });
  batch.set(metaRef, { sembrado: true });

  await batch.commit();
  return true;
}

// ---------- Eliminar cliente (con su historial de abonos) ----------

export async function eliminarClienteFS(clienteId) {
  const batch = writeBatch(db);
  const abonosSnap = await getDocs(query(collection(db, 'abonos'), where('clienteId', '==', clienteId)));
  abonosSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'clientes', clienteId));
  await batch.commit();
}

// ---------- Eliminar producto de forma permanente ----------
// A diferencia de actualizarProductoFS(id, {activo:false}) (baja lógica),
// esto borra también sus lotes, presentaciones y stock de envases.
// Úsalo solo para limpiar catálogo de prueba, no para productos con
// historial de ventas real que quieras conservar.

export async function eliminarProductoPermanenteFS(productoId) {
  const batch = writeBatch(db);

  const lotesSnap = await getDocs(query(collection(db, 'lotes'), where('productoId', '==', productoId)));
  lotesSnap.forEach((d) => batch.delete(d.ref));

  const presSnap = await getDocs(query(collection(db, 'presentaciones'), where('productoId', '==', productoId)));
  presSnap.forEach((d) => batch.delete(d.ref));

  batch.delete(doc(db, 'envasesStock', productoId));
  batch.delete(doc(db, 'productos', productoId));

  await batch.commit();
}
