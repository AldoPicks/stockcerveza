// ============================================================
// Fábricas de entidades — reflejan el modelo de datos (modelo-datos.md)
// Firestore es NoSQL, así que estas no son "modelos ORM" estrictos,
// son helpers para crear objetos con la forma correcta.
// ============================================================

import { generarId } from './fifo.js';

export function crearProducto({
  nombre,
  categoria, // 'Cerveza' | 'Refresco' | 'Botana' | 'Cigarros' | 'Preparado'
  tipo = 'Simple', // 'Simple' | 'Preparado'
  tipoEnvase = 'N/A', // 'Retornable' | 'No retornable' | 'N/A'
  tipoVenta = 'Individual', // 'Individual' | 'Caja' — si es Caja, se compra por caja y se vende por unidad
  unidadesPorCaja = 1, // solo relevante si tipoVenta === 'Caja'
  stockMinimo = 0,
  emoji = '🛒',
}) {
  return {
    id: generarId('prod'),
    nombre,
    categoria,
    tipo,
    tipoEnvase,
    tipoVenta,
    unidadesPorCaja,
    stockMinimo,
    activo: true,
    emoji,
    creadoEn: new Date(),
  };
}

export function crearPresentacion({ productoId, nombre, factorConversion = 1, precioVenta, esDefault = true }) {
  return {
    id: generarId('pres'),
    productoId,
    nombre,
    factorConversion,
    precioVenta,
    esDefault,
  };
}

export function crearCliente({ nombre, telefono = '', notas = '', limiteCredito = null }) {
  return {
    id: generarId('cli'),
    nombre,
    telefono,
    notas,
    limiteCredito,
    saldoActual: 0,
    activo: true,
  };
}

export function crearVenta({ tipoPago, clienteId = null }) {
  return {
    id: generarId('venta'),
    fecha: new Date(),
    tipoPago, // 'Contado' | 'Credito'
    clienteId,
    detalles: [], // VentaDetalle[]
    subtotal: 0,
    descuentoTotal: 0,
    total: 0,
    gananciaEstimada: 0,
    estado: 'Confirmada',
  };
}

export function crearAbono({ clienteId, ventaId = null, monto, metodoPago = 'efectivo' }) {
  return {
    id: generarId('abono'),
    clienteId,
    ventaId,
    monto,
    metodoPago,
    fecha: new Date(),
  };
}

export function crearIncidenciaEnvase({ productoId, tipo, cantidad, origen = 'Manual' }) {
  return {
    id: generarId('inc'),
    productoId,
    tipo, // 'Roto' | 'Perdido' | 'Inaccesible' | 'No_encontrado_cierre' | 'Otro'
    cantidad,
    origen,
    fecha: new Date(),
  };
}

export function crearSalidaVenta() {
  return {
    id: generarId('salida'),
    fechaApertura: new Date(),
    fechaCierre: null,
    estado: 'Abierto', // 'Abierto' | 'Cerrado'
    detalles: [], // { productoId, loteId, cantidadSacada }
  };
}
