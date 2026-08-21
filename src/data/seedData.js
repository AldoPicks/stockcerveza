// ============================================================
// Datos de prueba — para que la app funcione en VS Code de inmediato,
// sin necesidad de haber configurado Firebase todavía.
// Basados en los productos que aparecen en tus mockups.
// ============================================================

import { crearProducto, crearPresentacion, crearCliente } from '../models/entities.js';
import { FIFOEngine } from '../models/fifo.js';

export function construirDatosSemilla() {
  const productos = [
    crearProducto({ nombre: 'Modelo Especial 355ml', categoria: 'Cerveza', tipoEnvase: 'Retornable', stockMinimo: 20, emoji: '🍺' }),
    crearProducto({ nombre: 'Corona Extra 355ml', categoria: 'Cerveza', tipoEnvase: 'Retornable', stockMinimo: 20, emoji: '🍺' }),
    crearProducto({ nombre: 'Pacífico Clara 355ml', categoria: 'Cerveza', tipoEnvase: 'Retornable', stockMinimo: 15, emoji: '🍺' }),
    crearProducto({ nombre: 'Coca-Cola 600ml', categoria: 'Refresco', tipoEnvase: 'No retornable', stockMinimo: 15, emoji: '🥤' }),
    crearProducto({ nombre: 'Pepsi 600ml', categoria: 'Refresco', tipoEnvase: 'No retornable', stockMinimo: 15, emoji: '🥤' }),
    crearProducto({ nombre: 'Agua Ciel 1L', categoria: 'Refresco', tipoEnvase: 'No retornable', stockMinimo: 20, emoji: '💧' }),
    crearProducto({ nombre: 'Sabritas Adobadas 45g', categoria: 'Botana', tipoEnvase: 'N/A', stockMinimo: 10, emoji: '🍿' }),
    crearProducto({ nombre: 'Doritos Nacho 45g', categoria: 'Botana', tipoEnvase: 'N/A', stockMinimo: 10, emoji: '🌽' }),
  ];

  const porNombre = Object.fromEntries(productos.map((p) => [p.nombre, p]));

  const presentaciones = productos.map((p) =>
    crearPresentacion({ productoId: p.id, nombre: 'Unidad', factorConversion: 1, precioVenta: precioSugerido(p.nombre) })
  );

  const engine = new FIFOEngine();

  // Compras iniciales -> generan lotes (costo, cantidad en Almacén)
  const comprasIniciales = [
    ['Modelo Especial 355ml', 15, 142],
    ['Corona Extra 355ml', 15, 96],
    ['Pacífico Clara 355ml', 15, 8],
    ['Coca-Cola 600ml', 11, 48],
    ['Pepsi 600ml', 10, 24],
    ['Agua Ciel 1L', 8, 18],
    ['Sabritas Adobadas 45g', 9, 36],
    ['Doritos Nacho 45g', 9, 5],
  ];
  comprasIniciales.forEach(([nombre, costo, cantidad]) => {
    engine.registrarCompra({ productoId: porNombre[nombre].id, costoUnitario: costo, cantidad, fecha: new Date('2026-08-01') });
  });

  const clientes = [
    crearCliente({ nombre: 'Don Roberto Martínez', telefono: '555-1234', limiteCredito: 500 }),
    crearCliente({ nombre: 'Lupita García', telefono: '555-5678', limiteCredito: 300 }),
    crearCliente({ nombre: 'Chema Rodríguez', telefono: '555-9012', limiteCredito: 400 }),
    crearCliente({ nombre: 'Tere López', telefono: '555-3456', limiteCredito: 500 }),
  ];
  clientes[0].saldoActual = 380;
  clientes[1].saldoActual = 120;
  clientes[2].saldoActual = 0;
  clientes[3].saldoActual = 640; // sobre límite a propósito, para probar esa alerta

  const envaseStockPorProducto = {};
  productos
    .filter((p) => p.tipoEnvase === 'Retornable')
    .forEach((p) => {
      envaseStockPorProducto[p.id] = { productoId: p.id, cantidadAlmacen: 30, cantidadEnVenta: 0 };
    });

  return { productos, presentaciones, engine, clientes, envaseStockPorProducto };
}

function precioSugerido(nombre) {
  const precios = {
    'Modelo Especial 355ml': 22,
    'Corona Extra 355ml': 22,
    'Pacífico Clara 355ml': 23,
    'Coca-Cola 600ml': 18,
    'Pepsi 600ml': 17,
    'Agua Ciel 1L': 14,
    'Sabritas Adobadas 45g': 16,
    'Doritos Nacho 45g': 16,
  };
  return precios[nombre] ?? 0;
}
