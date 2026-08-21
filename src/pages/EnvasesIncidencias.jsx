import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

const TIPOS = ['Roto', 'Perdido', 'Inaccesible', 'Otro'];

export default function EnvasesIncidencias() {
  const { productos, envaseStockPorProducto, incidenciasEnvase, registrarIncidenciaManual } = useApp();
  const [productoId, setProductoId] = useState('');
  const [tipo, setTipo] = useState('Roto');
  const [cantidad, setCantidad] = useState(1);

  const retornables = productos.filter((p) => p.tipoEnvase === 'Retornable');

  function registrar() {
    if (!productoId) return;
    registrarIncidenciaManual({ productoId, tipo, cantidad: Number(cantidad) });
    setCantidad(1);
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-bold text-lg">Envases e incidencias</h2>

      <div className="bg-white rounded-2xl divide-y">
        {retornables.map((p) => {
          const env = envaseStockPorProducto[p.id];
          return (
            <div key={p.id} className="flex justify-between p-3 text-sm">
              <span>{p.emoji} {p.nombre}</span>
              <span className="font-semibold">
                {env?.cantidadAlmacen ?? 0} en almacén · {env?.cantidadEnVenta ?? 0} en venta
              </span>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl p-4 space-y-3">
        <p className="font-semibold text-sm">Registrar incidencia manual</p>
        <select className="w-full border rounded-xl px-3 py-2" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
          <option value="">Selecciona producto retornable...</option>
          {retornables.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <div className="flex gap-2">
          {TIPOS.map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`flex-1 rounded-xl py-2 text-xs font-semibold ${tipo === t ? 'bg-brand text-white' : 'bg-gray-100'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          type="number"
          className="w-full border rounded-xl px-3 py-2"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
        <button onClick={registrar} className="w-full bg-brand-orange text-white rounded-xl py-3 font-semibold">
          Registrar
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">HISTORIAL DE INCIDENCIAS</p>
        <div className="bg-white rounded-2xl divide-y">
          {incidenciasEnvase.slice().reverse().map((inc) => {
            const p = productos.find((pp) => pp.id === inc.productoId);
            return (
              <div key={inc.id} className="flex justify-between p-3 text-sm">
                <span>{inc.tipo} — {p?.nombre}</span>
                <span className="font-semibold">{inc.cantidad} pzas</span>
              </div>
            );
          })}
          {incidenciasEnvase.length === 0 && <p className="p-4 text-sm text-gray-400 text-center">Sin incidencias todavía.</p>}
        </div>
      </div>
    </div>
  );
}
