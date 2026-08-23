import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

export default function Compras() {
  const { productos, registrarCompra, stockAlmacen } = useApp();
  const activos = productos.filter((p) => p.activo);
  const [productoId, setProductoId] = useState(activos[0]?.id ?? '');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [numeroCajas, setNumeroCajas] = useState('');
  const [costoPorCaja, setCostoPorCaja] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);

  const productoSeleccionado = productos.find((p) => p.id === productoId);
  const esPorCaja = productoSeleccionado?.tipoVenta === 'Caja';
  const unidadesPorCaja = productoSeleccionado?.unidadesPorCaja ?? 1;

  const costoUnitarioCalculado = esPorCaja && costoPorCaja ? Number(costoPorCaja) / unidadesPorCaja : null;
  const cantidadCalculada = esPorCaja && numeroCajas ? Number(numeroCajas) * unidadesPorCaja : null;

  async function guardar() {
    setError(null);
    const costoFinal = esPorCaja ? costoUnitarioCalculado : Number(costoUnitario);
    const cantidadFinal = esPorCaja ? cantidadCalculada : Number(cantidad);

    if (!productoId || !costoFinal || !cantidadFinal) return;

    try {
      await registrarCompra({ productoId, costoUnitario: costoFinal, cantidad: cantidadFinal });
      setMensaje('✅ Compra registrada — se generó un lote nuevo con este costo.');
      setCostoUnitario('');
      setCantidad('');
      setNumeroCajas('');
      setCostoPorCaja('');
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="font-bold text-lg">Registrar compra</h2>
      <p className="text-xs text-gray-500">
        Cada compra genera un <strong>lote nuevo</strong> con su propio costo (FIFO). El stock se suma a Almacén.
      </p>

      {mensaje && <div className="bg-green-50 text-green-700 text-sm rounded-xl p-3">{mensaje}</div>}
      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{error}</div>}

      <div className="bg-white rounded-2xl p-4 space-y-3">
        <select
          className="w-full border rounded-xl px-3 py-2"
          value={productoId}
          onChange={(e) => setProductoId(e.target.value)}
        >
          {activos.map((p) => (
            <option key={p.id} value={p.id}>{p.emoji} {p.nombre} (Almacén: {stockAlmacen(p.id)})</option>
          ))}
        </select>

        {esPorCaja ? (
          <>
            <div className="bg-blue-50 text-blue-700 text-xs rounded-xl p-3">
              Este producto se compra por caja — {unidadesPorCaja} unidades por caja. Captura cuántas cajas y a cuánto cada una; el costo por unidad se calcula solo.
            </div>
            <input
              type="number"
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Número de cajas"
              value={numeroCajas}
              onChange={(e) => setNumeroCajas(e.target.value)}
            />
            <input
              type="number"
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Costo por caja ($)"
              value={costoPorCaja}
              onChange={(e) => setCostoPorCaja(e.target.value)}
            />
            {costoUnitarioCalculado !== null && cantidadCalculada !== null && (
              <p className="text-xs text-gray-500">
                = {cantidadCalculada} unidades a ${costoUnitarioCalculado.toFixed(2)} c/u
              </p>
            )}
          </>
        ) : (
          <>
            <input
              type="number"
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Costo unitario ($)"
              value={costoUnitario}
              onChange={(e) => setCostoUnitario(e.target.value)}
            />
            <input
              type="number"
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Cantidad"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </>
        )}

        <button onClick={guardar} className="w-full bg-brand text-white rounded-xl py-3 font-semibold">
          Registrar compra
        </button>
      </div>
    </div>
  );
}
