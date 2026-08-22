import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { construirDatosSemilla } from '../data/seedData.js';
import {
  crearProducto,
  crearPresentacion,
  crearCliente,
  crearVenta,
  crearAbono,
  crearIncidenciaEnvase,
  crearSalidaVenta,
} from '../models/entities.js';
import { FIFOEngine } from '../models/fifo.js';
import { firebaseConfigurado } from '../firebase/config.js';
import { useAuth } from './AuthContext.jsx';
import * as fs from '../firebase/firestoreService.js';

// ============================================================
// Estado global de la app.
//
// Tiene DOS MODOS, decididos automáticamente según si `.env` está
// configurado (ver src/firebase/config.js):
//
//  - firebaseConfigurado = false -> "Modo local": todo vive en memoria,
//    usando los datos de prueba de seedData.js. Útil para probar sin
//    haber configurado Firebase todavía (se pierde al recargar).
//
//  - firebaseConfigurado = true -> "Modo Firebase": los datos se leen
//    en tiempo real de Firestore (onSnapshot) y cada acción del usuario
//    escribe ahí (addDoc/updateDoc/batch). La primera vez que corres la
//    app con un Firebase vacío, se siembran automáticamente los mismos
//    datos de prueba (ver firestoreService.sembrarDatosSiEstaVacio).
//
// El motor FIFO (engine) siempre trabaja en memoria sobre el arreglo
// `lotes` actual: primero se mutan los lotes localmente (para que la UI
// responda al instante), y luego —solo en Modo Firebase— se persisten
// nada más los lotes que realmente cambiaron.
// ============================================================

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [productos, setProductos] = useState([]);
  const [presentaciones, setPresentaciones] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [envaseStockPorProducto, setEnvaseStockPorProducto] = useState({});
  const [incidenciasEnvase, setIncidenciasEnvase] = useState([]);
  const [salidaActual, setSalidaActual] = useState(null);
  const [historialCierres, setHistorialCierres] = useState([]);

  const { usuario, cargandoAuth } = useAuth();
  const [cargando, setCargando] = useState(firebaseConfigurado);

  // El motor FIFO se reconstruye cada vez que cambia la referencia de `lotes`.
  // Como los objetos Lote dentro del arreglo se mutan in-place, un mismo
  // `engine` sigue siendo válido durante toda una función de mutación.
  const engine = useMemo(() => new FIFOEngine(lotes), [lotes]);

  // ---------------- Carga inicial ----------------
  useEffect(() => {
    if (!firebaseConfigurado) {
      const semilla = construirDatosSemilla();
      setProductos(semilla.productos);
      setPresentaciones(semilla.presentaciones);
      setLotes(semilla.engine.lotes);
      setClientes(semilla.clientes);
      setEnvaseStockPorProducto(semilla.envaseStockPorProducto);
      setCargando(false);
      return;
    }

    // En modo Firebase, no toques Firestore hasta que el login haya resuelto
    // y haya un usuario autenticado (las reglas de seguridad lo exigen).
    if (cargandoAuth || !usuario) {
      setCargando(true);
      return;
    }

    let unsubs = [];
    (async () => {
      try {
        await fs.sembrarDatosSiEstaVacio();
      } catch (e) {
        console.error('[StockCerveza] No se pudo sembrar datos iniciales en Firestore:', e);
      }
      unsubs = [
        fs.escucharProductos(setProductos),
        fs.escucharPresentaciones(setPresentaciones),
        fs.escucharLotes(setLotes),
        fs.escucharClientes(setClientes),
        fs.escucharVentas(setVentas),
        fs.escucharEnvasesStock(setEnvaseStockPorProducto),
        fs.escucharIncidencias(setIncidenciasEnvase),
        fs.escucharSalidaAbierta(setSalidaActual),
        fs.escucharCierres(setHistorialCierres),
      ];
      setCargando(false);
    })();

    return () => unsubs.forEach((u) => u && u());
  }, [usuario, cargandoAuth]);

  // ---------------- Consultas ----------------
  function stockAlmacen(productoId) {
    return engine.stockTotal(productoId, 'almacen');
  }
  function stockEnVenta(productoId) {
    return engine.stockTotal(productoId, 'en_venta');
  }

  // Fuerza a React a "ver" las mutaciones in-place del engine.
  function refrescarLotes() {
    setLotes([...engine.lotes]);
  }

  // ---------------- Productos ----------------
  // `datos` puede incluir: nombre, categoria, tipoEnvase, stockMinimo, precioVenta
  async function agregarProducto(datos) {
    const { precioVenta, ...datosProducto } = datos;

    if (firebaseConfigurado) {
      const nuevo = crearProducto(datosProducto);
      const creado = await fs.crearProductoFS(nuevo);
      const presentacion = crearPresentacion({
        productoId: creado.id,
        nombre: 'Unidad',
        factorConversion: 1,
        precioVenta: precioVenta ?? 0,
        esDefault: true,
      });
      await fs.crearPresentacionFS(presentacion);
      return creado;
    }

    const nuevo = crearProducto(datosProducto);
    const presentacion = crearPresentacion({
      productoId: nuevo.id,
      nombre: 'Unidad',
      factorConversion: 1,
      precioVenta: precioVenta ?? 0,
      esDefault: true,
    });
    setProductos((prev) => [...prev, nuevo]);
    setPresentaciones((prev) => [...prev, presentacion]);
    return nuevo;
  }

  // Edita nombre/categoría/tipoEnvase/stockMinimo y, si se manda, el precio
  // (que en realidad vive en la Presentación default, no en el Producto).
  async function actualizarProducto(productoId, cambios) {
    const { precioVenta, ...datosProducto } = cambios;

    if (firebaseConfigurado) {
      if (Object.keys(datosProducto).length > 0) await fs.actualizarProductoFS(productoId, datosProducto);
      if (precioVenta !== undefined) {
        const pres = presentaciones.find((p) => p.productoId === productoId && p.esDefault);
        if (pres) {
          await fs.actualizarPresentacionFS(pres.id, { precioVenta });
        } else {
          // Producto sin Presentación todavía (dado de alta antes de este fix): la creamos.
          await fs.crearPresentacionFS(crearPresentacion({ productoId, nombre: 'Unidad', factorConversion: 1, precioVenta, esDefault: true }));
        }
      }
      return;
    }

    if (Object.keys(datosProducto).length > 0) {
      setProductos((prev) => prev.map((p) => (p.id === productoId ? { ...p, ...datosProducto } : p)));
    }
    if (precioVenta !== undefined) {
      setPresentaciones((prev) => {
        const existe = prev.some((p) => p.productoId === productoId && p.esDefault);
        if (existe) {
          return prev.map((p) => (p.productoId === productoId && p.esDefault ? { ...p, precioVenta } : p));
        }
        return [...prev, crearPresentacion({ productoId, nombre: 'Unidad', factorConversion: 1, precioVenta, esDefault: true })];
      });
    }
  }

  // Baja lógica (RF01): no se borra físicamente para no romper el historial
  // de ventas/lotes que ya lo referencian. Simplemente deja de aparecer
  // en Venta, Compras, Salida a venta, etc.
  async function eliminarProducto(productoId) {
    if (firebaseConfigurado) {
      await fs.actualizarProductoFS(productoId, { activo: false });
      return;
    }
    setProductos((prev) => prev.map((p) => (p.id === productoId ? { ...p, activo: false } : p)));
  }

  async function reactivarProducto(productoId) {
    if (firebaseConfigurado) {
      await fs.actualizarProductoFS(productoId, { activo: true });
      return;
    }
    setProductos((prev) => prev.map((p) => (p.id === productoId ? { ...p, activo: true } : p)));
  }

  // Borra el producto de verdad, junto con sus lotes, presentaciones y
  // stock de envases — a diferencia de eliminarProducto (baja lógica).
  // Úsalo para limpiar catálogo de prueba, no para productos con
  // historial de ventas que quieras conservar.
  async function eliminarProductoPermanente(productoId) {
    if (firebaseConfigurado) {
      await fs.eliminarProductoPermanenteFS(productoId);
      return;
    }
    setProductos((prev) => prev.filter((p) => p.id !== productoId));
    setLotes((prev) => prev.filter((l) => l.productoId !== productoId));
    setPresentaciones((prev) => prev.filter((p) => p.productoId !== productoId));
    setEnvaseStockPorProducto((prev) => {
      const copia = { ...prev };
      delete copia[productoId];
      return copia;
    });
  }

  // ---------------- RF08: Compras ----------------
  async function registrarCompra({ productoId, costoUnitario, cantidad }) {
    if (firebaseConfigurado) {
      await fs.crearLoteFS({
        productoId,
        costoUnitario,
        cantidadInicial: cantidad,
        cantidadAlmacen: cantidad,
        cantidadEnVenta: 0,
        fechaIngreso: new Date(),
      });
      return;
    }
    engine.registrarCompra({ productoId, costoUnitario, cantidad, fecha: new Date() });
    refrescarLotes();
  }

  // ---------------- RF09: Salida a venta ----------------
  async function iniciarSalida(items) {
    const detallesNuevos = [];
    const lotesTocados = new Map();

    items.forEach(({ productoId, cantidad }) => {
      const movimientos = engine.salidaAVenta(productoId, cantidad);
      movimientos.forEach((m) => {
        detallesNuevos.push({ productoId, loteId: m.loteId, cantidadSacada: m.cantidad });
        const lote = engine.lotes.find((l) => l.id === m.loteId);
        if (lote) lotesTocados.set(lote.id, lote);
      });
    });

    if (firebaseConfigurado) {
      await fs.persistirLotesFS(Array.from(lotesTocados.values()));
      if (salidaActual && salidaActual.estado === 'Abierto') {
        await fs.actualizarDetallesSalidaFS(salidaActual.id, [...(salidaActual.detalles || []), ...detallesNuevos]);
      } else {
        await fs.crearSalidaFS({ fechaApertura: new Date(), estado: 'Abierto', detalles: detallesNuevos });
      }
      refrescarLotes();
      return;
    }

    if (salidaActual && salidaActual.estado === 'Abierto') {
      salidaActual.detalles.push(...detallesNuevos);
      setSalidaActual({ ...salidaActual });
    } else {
      const nueva = crearSalidaVenta();
      nueva.detalles = detallesNuevos;
      setSalidaActual(nueva);
    }
    refrescarLotes();
  }

  // ---------------- RF09: Cierre diario (producto + envases) ----------------
  async function cerrarDia({ conteoProductoPorId, envasesCompletos, envasesQuebrados }) {
    if (!salidaActual) throw new Error('No hay una salida abierta para cerrar.');

    const resultadoProducto = [];
    const sacadoPorProducto = {};
    (salidaActual.detalles || []).forEach((d) => {
      sacadoPorProducto[d.productoId] = (sacadoPorProducto[d.productoId] || 0) + d.cantidadSacada;
    });

    const lotesTocados = new Map();

    Object.entries(sacadoPorProducto).forEach(([productoId, sacado]) => {
      const enVentaAhora = engine.stockTotal(productoId, 'en_venta');
      const contado = conteoProductoPorId[productoId] ?? enVentaAhora;
      const faltante = Math.max(0, enVentaAhora - contado);

      if (faltante > 0) {
        const { afectados } = engine.registrarMerma(productoId, faltante, 'en_venta');
        afectados.forEach((l) => lotesTocados.set(l.id, l));
      }
      if (contado > 0) {
        const afectados = engine.retornarAAlmacen(productoId, Math.min(contado, engine.stockTotal(productoId, 'en_venta') + contado));
        afectados.forEach((l) => lotesTocados.set(l.id, l));
      }
      resultadoProducto.push({ productoId, sacado, esperado: enVentaAhora, contado, faltante });
    });

    const envasesResultado = [];
    const nuevasIncidencias = [];
    const envaseUpdates = [];

    Object.values(envaseStockPorProducto).forEach((env) => {
      const esperado = env.cantidadEnVenta;
      const completos = envasesCompletos[env.productoId] ?? esperado;
      const quebrados = envasesQuebrados[env.productoId] ?? 0;
      const faltante = Math.max(0, esperado - completos - quebrados);

      envaseUpdates.push({ productoId: env.productoId, cantidadAlmacen: env.cantidadAlmacen + completos, cantidadEnVenta: 0 });
      if (faltante > 0) {
        nuevasIncidencias.push(crearIncidenciaEnvase({ productoId: env.productoId, tipo: 'No_encontrado_cierre', cantidad: faltante, origen: 'Cierre_diario' }));
      }
      if (quebrados > 0) {
        nuevasIncidencias.push(crearIncidenciaEnvase({ productoId: env.productoId, tipo: 'Roto', cantidad: quebrados, origen: 'Cierre_diario' }));
      }
      envasesResultado.push({ productoId: env.productoId, esperado, completos, quebrados, faltante });
    });

    const cierre = { salidaId: salidaActual.id, fecha: new Date(), resultadoProducto, envasesResultado };

    if (firebaseConfigurado) {
      await fs.persistirLotesFS(Array.from(lotesTocados.values()));
      await Promise.all(envaseUpdates.map((e) => fs.actualizarEnvaseStockFS(e.productoId, { cantidadAlmacen: e.cantidadAlmacen, cantidadEnVenta: e.cantidadEnVenta })));
      await Promise.all(nuevasIncidencias.map((inc) => fs.crearIncidenciaFS(inc)));
      await fs.crearCierreFS(cierre);
      await fs.cerrarSalidaFS(salidaActual.id);
      refrescarLotes();
      return cierre;
    }

    envaseUpdates.forEach((e) => {
      const env = envaseStockPorProducto[e.productoId];
      if (env) {
        env.cantidadAlmacen = e.cantidadAlmacen;
        env.cantidadEnVenta = e.cantidadEnVenta;
      }
    });
    setIncidenciasEnvase((prev) => [...prev, ...nuevasIncidencias]);
    setHistorialCierres((prev) => [{ ...cierre, id: `cierre_${Date.now()}` }, ...prev]);
    setSalidaActual(null);
    refrescarLotes();
    return cierre;
  }

  // ---------------- RF04: Venta ----------------
  async function confirmarVenta({ carrito, tipoPago, clienteId }) {
    const venta = crearVenta({ tipoPago, clienteId });
    let subtotal = 0;
    let descuentoTotal = 0;
    let gananciaEstimada = 0;
    const lotesTocados = new Map();
    const envaseUpdates = [];

    carrito.forEach((item) => {
      const { consumo, costoTotal } = engine.venderFIFO(item.productoId, item.cantidad);
      consumo.forEach((c) => {
        const lote = engine.lotes.find((l) => l.id === c.loteId);
        if (lote) lotesTocados.set(lote.id, lote);
      });

      const producto = productos.find((p) => p.id === item.productoId);
      const totalLinea = item.precioUnitario * item.cantidad - item.descuento;
      subtotal += item.precioUnitario * item.cantidad;
      descuentoTotal += item.descuento;
      gananciaEstimada += totalLinea - costoTotal;

      venta.detalles.push({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: item.descuento,
        costoUnitarioFifo: costoTotal / item.cantidad,
        traeCanje: !!item.traeCanje,
        lotesUsados: consumo,
      });

      if (producto?.tipoEnvase === 'Retornable' && item.traeCanje) {
        const env = envaseStockPorProducto[item.productoId];
        if (env) envaseUpdates.push({ productoId: item.productoId, cantidadEnVenta: env.cantidadEnVenta + item.cantidad });
      }
    });

    venta.subtotal = subtotal;
    venta.descuentoTotal = descuentoTotal;
    venta.total = subtotal - descuentoTotal;
    venta.gananciaEstimada = gananciaEstimada;

    const clienteActual = clientes.find((c) => c.id === clienteId);
    const nuevoSaldoCliente = tipoPago === 'Credito' && clienteId ? (clienteActual?.saldoActual ?? 0) + venta.total : null;

    if (firebaseConfigurado) {
      await fs.persistirLotesFS(Array.from(lotesTocados.values()));
      await Promise.all(envaseUpdates.map((e) => fs.actualizarEnvaseStockFS(e.productoId, { cantidadEnVenta: e.cantidadEnVenta })));
      await fs.crearVentaFS(venta);
      if (nuevoSaldoCliente !== null) await fs.actualizarSaldoClienteFS(clienteId, nuevoSaldoCliente);
      refrescarLotes();
      return venta;
    }

    envaseUpdates.forEach((e) => {
      const env = envaseStockPorProducto[e.productoId];
      if (env) env.cantidadEnVenta = e.cantidadEnVenta;
    });
    setVentas((prev) => [venta, ...prev]);
    if (nuevoSaldoCliente !== null) {
      setClientes((prev) => prev.map((c) => (c.id === clienteId ? { ...c, saldoActual: nuevoSaldoCliente } : c)));
    }
    refrescarLotes();
    return venta;
  }

  // ---------------- RF05: Clientes y abonos ----------------
  async function agregarCliente(datos) {
    const nuevo = crearCliente(datos);
    if (firebaseConfigurado) {
      await fs.crearClienteFS(nuevo);
      return nuevo;
    }
    setClientes((prev) => [...prev, nuevo]);
    return nuevo;
  }

  // Elimina al cliente y, en Firestore, también su historial de abonos.
  async function eliminarCliente(clienteId) {
    if (firebaseConfigurado) {
      await fs.eliminarClienteFS(clienteId);
      return;
    }
    setClientes((prev) => prev.filter((c) => c.id !== clienteId));
  }

  async function registrarAbono({ clienteId, monto, ventaId = null, metodoPago = 'efectivo' }) {
    const abono = crearAbono({ clienteId, ventaId, monto, metodoPago });
    const cliente = clientes.find((c) => c.id === clienteId);
    const nuevoSaldo = Math.max(0, (cliente?.saldoActual ?? 0) - monto);

    if (firebaseConfigurado) {
      await fs.crearAbonoFS(abono);
      await fs.actualizarSaldoClienteFS(clienteId, nuevoSaldo);
      return abono;
    }
    setClientes((prev) => prev.map((c) => (c.id === clienteId ? { ...c, saldoActual: nuevoSaldo } : c)));
    return abono;
  }

  // ---------------- RF06: Incidencias manuales de envase ----------------
  async function registrarIncidenciaManual({ productoId, tipo, cantidad, ubicacion = 'almacen' }) {
    const incidencia = crearIncidenciaEnvase({ productoId, tipo, cantidad, origen: 'Manual' });
    const env = envaseStockPorProducto[productoId];
    const campo = ubicacion === 'almacen' ? 'cantidadAlmacen' : 'cantidadEnVenta';
    const nuevoValor = Math.max(0, (env?.[campo] ?? 0) - cantidad);

    if (firebaseConfigurado) {
      await fs.crearIncidenciaFS(incidencia);
      await fs.actualizarEnvaseStockFS(productoId, { [campo]: nuevoValor });
      return;
    }
    if (env) env[campo] = nuevoValor;
    setIncidenciasEnvase((prev) => [...prev, incidencia]);
  }

  const valor = useMemo(
    () => ({
      productos,
      presentaciones,
      clientes,
      ventas,
      incidenciasEnvase,
      envaseStockPorProducto,
      salidaActual,
      historialCierres,
      cargando,
      firebaseConfigurado,
      engine,
      stockAlmacen,
      stockEnVenta,
      agregarProducto,
      actualizarProducto,
      eliminarProducto,
      eliminarProductoPermanente,
      reactivarProducto,
      registrarCompra,
      iniciarSalida,
      cerrarDia,
      confirmarVenta,
      agregarCliente,
      eliminarCliente,
      registrarAbono,
      registrarIncidenciaManual,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productos, presentaciones, clientes, ventas, incidenciasEnvase, salidaActual, historialCierres, cargando, lotes]
  );

  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
