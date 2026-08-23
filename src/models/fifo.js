// ============================================================
// Motor FIFO — corazón del sistema de inventario por lotes.
// Implementa las reglas de negocio de RF02 y RF09:
//   - Cada compra genera un Lote con costo propio.
//   - El stock vive en dos estados: Almacén y En venta.
//   - Al vender, se descuenta usando FIFO (lote más antiguo primero).
//   - Al hacer "Salida a venta", también se usa FIFO para decidir
//     qué lote de Almacén se mueve a En venta.
// ============================================================

export class Lote {
  constructor({
    id,
    productoId,
    costoUnitario,
    cantidadInicial,
    fechaIngreso,
    cantidadAlmacen = null,
    cantidadEnVenta = 0,
  }) {
    this.id = id;
    this.productoId = productoId;
    this.costoUnitario = costoUnitario;
    this.cantidadInicial = cantidadInicial;
    this.fechaIngreso = new Date(fechaIngreso);
    this.cantidadAlmacen = cantidadAlmacen ?? cantidadInicial;
    this.cantidadEnVenta = cantidadEnVenta;
  }
}

export function generarId(prefijo = 'id') {
  return `${prefijo}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class FIFOEngine {
  /**
   * @param {Lote[]} lotes - lista de lotes existentes (normalmente cargados desde Firestore)
   */
  constructor(lotes = []) {
    this.lotes = lotes;
  }

  // ---- Consultas ----

  lotesDeProducto(productoId, ubicacion = 'almacen') {
    const campo = ubicacion === 'almacen' ? 'cantidadAlmacen' : 'cantidadEnVenta';
    return this.lotes
      .filter((l) => l.productoId === productoId && l[campo] > 0)
      .sort((a, b) => a.fechaIngreso - b.fechaIngreso); // más antiguo primero = FIFO
  }

  stockTotal(productoId, ubicacion = 'almacen') {
    const campo = ubicacion === 'almacen' ? 'cantidadAlmacen' : 'cantidadEnVenta';
    return this.lotes
      .filter((l) => l.productoId === productoId)
      .reduce((sum, l) => sum + l[campo], 0);
  }

  costoPromedioPonderado(productoId, ubicacion = 'almacen') {
    const lotes = this.lotesDeProducto(productoId, ubicacion);
    const campo = ubicacion === 'almacen' ? 'cantidadAlmacen' : 'cantidadEnVenta';
    const totalUnidades = lotes.reduce((s, l) => s + l[campo], 0);
    if (totalUnidades === 0) return 0;
    const totalCosto = lotes.reduce((s, l) => s + l[campo] * l.costoUnitario, 0);
    return totalCosto / totalUnidades;
  }

  // ---- Compras: crea un lote nuevo ----

  registrarCompra({ productoId, costoUnitario, cantidad, fecha = new Date() }) {
    const lote = new Lote({
      id: generarId('lote'),
      productoId,
      costoUnitario,
      cantidadInicial: cantidad,
      fechaIngreso: fecha,
      cantidadAlmacen: cantidad,
      cantidadEnVenta: 0,
    });
    this.lotes.push(lote);
    return lote;
  }

  // ---- RF09: Salida a venta (Almacén -> En venta), respetando FIFO ----

  salidaAVenta(productoId, cantidad) {
    if (this.stockTotal(productoId, 'almacen') < cantidad) {
      throw new Error('Stock insuficiente en Almacén para esta salida.');
    }
    let restante = cantidad;
    const movimientos = [];
    for (const lote of this.lotesDeProducto(productoId, 'almacen')) {
      if (restante <= 0) break;
      const tomar = Math.min(lote.cantidadAlmacen, restante);
      lote.cantidadAlmacen -= tomar;
      lote.cantidadEnVenta += tomar;
      movimientos.push({ loteId: lote.id, cantidad: tomar, costoUnitario: lote.costoUnitario });
      restante -= tomar;
    }
    return movimientos;
  }

  // ---- RF04: Venta — descuenta de "En venta" usando FIFO ----

  venderFIFO(productoId, cantidad) {
    if (this.stockTotal(productoId, 'en_venta') < cantidad) {
      throw new Error('Stock insuficiente en el punto de venta.');
    }
    let restante = cantidad;
    const consumo = [];
    for (const lote of this.lotesDeProducto(productoId, 'en_venta')) {
      if (restante <= 0) break;
      const tomar = Math.min(lote.cantidadEnVenta, restante);
      lote.cantidadEnVenta -= tomar;
      consumo.push({ loteId: lote.id, cantidad: tomar, costoUnitario: lote.costoUnitario });
      restante -= tomar;
    }
    const costoTotal = consumo.reduce((s, c) => s + c.cantidad * c.costoUnitario, 0);
    return { consumo, costoTotal, costoUnitarioPromedio: costoTotal / cantidad };
  }

  // ---- RF09: Cierre diario — lo no vendido regresa a Almacén ----

  retornarAAlmacen(productoId, cantidad) {
    let restante = cantidad;
    const afectados = [];
    // Al regresar, no importa tanto el orden FIFO estricto porque no afecta
    // el costo (el costo ya vive en el lote); tomamos cualquier lote con saldo en_venta.
    for (const lote of this.lotesDeProducto(productoId, 'en_venta')) {
      if (restante <= 0) break;
      const mover = Math.min(lote.cantidadEnVenta, restante);
      lote.cantidadEnVenta -= mover;
      lote.cantidadAlmacen += mover;
      restante -= mover;
      afectados.push(lote);
    }
    return afectados;
  }

  // ---- Cancelación de venta: regresa el stock a los lotes exactos de donde salió ----

  revertirConsumo(lotesUsados) {
    const afectados = [];
    (lotesUsados || []).forEach(({ loteId, cantidad }) => {
      const lote = this.lotes.find((l) => l.id === loteId);
      if (lote) {
        lote.cantidadEnVenta += cantidad;
        afectados.push(lote);
      }
      // Si el lote ya no existe (producto eliminado permanentemente), se ignora:
      // no hay a dónde regresar ese stock.
    });
    return afectados;
  }

  // ---- Mermas: reduce stock permanentemente (no se mueve, se pierde) ----

  registrarMerma(productoId, cantidad, ubicacion = 'en_venta') {
    let restante = cantidad;
    const campo = ubicacion === 'almacen' ? 'cantidadAlmacen' : 'cantidadEnVenta';
    const afectados = [];
    for (const lote of this.lotesDeProducto(productoId, ubicacion)) {
      if (restante <= 0) break;
      const quitar = Math.min(lote[campo], restante);
      lote[campo] -= quitar;
      restante -= quitar;
      afectados.push(lote);
    }
    return { mermado: cantidad - restante, afectados };
  }
}
