import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

const CATEGORIAS = ['Todo', 'Cerveza', 'Refresco', 'Botana', 'Preparado'];

export default function Productos() {
  const { productos, presentaciones, stockAlmacen, agregarProducto } = useApp();
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todo');
  const [mostrarAlta, setMostrarAlta] = useState(false);

  const filtrados = productos.filter(
    (p) =>
      (categoria === 'Todo' || p.categoria === categoria) &&
      p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  function precioDe(productoId) {
    return presentaciones.find((p) => p.productoId === productoId && p.esDefault)?.precioVenta ?? 0;
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="font-bold text-lg">Productos</h2>
      <input
        className="w-full border rounded-xl px-4 py-2 bg-white"
        placeholder="🔍 Buscar..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            onClick={() => setCategoria(c)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              categoria === c ? 'bg-brand text-white' : 'bg-white border'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl divide-y">
        {filtrados.map((p) => {
          const stock = stockAlmacen(p.id);
          const critico = stock <= p.stockMinimo;
          return (
            <div key={p.id} className="flex justify-between items-center p-3">
              <div>
                <p className="font-semibold text-sm">{p.emoji} {p.nombre}</p>
                <p className="text-xs text-gray-400">Costo ${'—'} · ${precioDe(p.id)}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${critico ? 'text-yellow-600' : ''}`}>{stock}</p>
                <p className="text-xs text-gray-400">{critico ? '⚠️ en stock' : 'en stock'}</p>
              </div>
            </div>
          );
        })}
        {filtrados.length === 0 && <p className="p-4 text-sm text-gray-400 text-center">Sin resultados.</p>}
      </div>

      <button
        onClick={() => setMostrarAlta(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-brand-orange text-white text-2xl shadow-lg"
      >
        +
      </button>

      {mostrarAlta && <AltaProducto onClose={() => setMostrarAlta(false)} onCrear={agregarProducto} />}
    </div>
  );
}

function AltaProducto({ onClose, onCrear }) {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('Cerveza');
  const [tipoEnvase, setTipoEnvase] = useState('N/A');
  const [stockMinimo, setStockMinimo] = useState(10);

  function guardar() {
    if (!nombre.trim()) return;
    onCrear({ nombre: nombre.trim(), categoria, tipoEnvase, stockMinimo: Number(stockMinimo) });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-4 space-y-3">
        <h3 className="font-bold text-lg">Nuevo producto</h3>
        <input className="w-full border rounded-xl px-3 py-2" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <select className="w-full border rounded-xl px-3 py-2" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {['Cerveza', 'Refresco', 'Botana', 'Preparado'].map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="w-full border rounded-xl px-3 py-2" value={tipoEnvase} onChange={(e) => setTipoEnvase(e.target.value)}>
          <option value="N/A">Sin envase</option>
          <option value="Retornable">Retornable</option>
          <option value="No retornable">No retornable</option>
        </select>
        <input
          type="number"
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Stock mínimo"
          value={stockMinimo}
          onChange={(e) => setStockMinimo(e.target.value)}
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border rounded-xl py-3">Cancelar</button>
          <button onClick={guardar} className="flex-1 bg-brand text-white rounded-xl py-3 font-semibold">Guardar</button>
        </div>
      </div>
    </div>
  );
}
