import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

export default function Compras() {
  const { productos, registrarCompra, stockAlmacen } = useApp();
  const [productoId, setProductoId] = useState(productos[0]?.id ?? '');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [mensaje, setMensaje] = useState(null);

  function guardar() {
    if (!productoId || !costoUnitario || !cantidad) return;
    registrarCompra({ productoId, costoUnitario: Number(costoUnitario), cantidad: Number(cantidad) });
    setMensaje('✅ Compra registrada — se generó un lote nuevo con este costo.');
    setCostoUnitario('');
    setCantidad('');
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="font-bold text-lg">Registrar compra</h2>
      <p className="text-xs text-gray-500">
        Cada compra genera un <strong>lote nuevo</strong> con su propio costo (FIFO). El stock se suma a Almacén.
      </p>

      {mensaje && <div className="bg-green-50 text-green-700 text-sm rounded-xl p-3">{mensaje}</div>}

      <div className="bg-white rounded-2xl p-4 space-y-3">
        <select className="w-full border rounded-xl px-3 py-2" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>{p.emoji} {p.nombre} (Almacén: {stockAlmacen(p.id)})</option>
          ))}
        </select>
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
        <button onClick={guardar} className="w-full bg-brand text-white rounded-xl py-3 font-semibold">
          Registrar compra
        </button>
      </div>
    </div>
  );
}
