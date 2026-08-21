import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

const CATEGORIAS = ['Todo', 'Cerveza', 'Refresco', 'Botana', 'Preparado'];

export default function Productos() {
  const { productos, presentaciones, stockAlmacen, agregarProducto, actualizarProducto, eliminarProducto, eliminarProductoPermanente, reactivarProducto } = useApp();
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todo');
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [productoEditar, setProductoEditar] = useState(null);
  const [verBaja, setVerBaja] = useState(false);

  const activos = productos.filter((p) => p.activo);
  const dadosDeBaja = productos.filter((p) => !p.activo);
  const base = verBaja ? dadosDeBaja : activos;

  const filtrados = base.filter(
    (p) =>
      (categoria === 'Todo' || p.categoria === categoria) &&
      p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  function precioDe(productoId) {
    return presentaciones.find((p) => p.productoId === productoId && p.esDefault)?.precioVenta ?? 0;
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg">Productos</h2>
        {dadosDeBaja.length > 0 && (
          <button onClick={() => setVerBaja((v) => !v)} className="text-xs text-brand font-semibold">
            {verBaja ? '← Ver activos' : `Dados de baja (${dadosDeBaja.length})`}
          </button>
        )}
      </div>

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
            <button
              key={p.id}
              onClick={() => setProductoEditar(p)}
              className="w-full flex justify-between items-center p-3 text-left select-none cursor-pointer"
            >
              <div>
                <p className="font-semibold text-sm">{p.emoji} {p.nombre}</p>
                <p className="text-xs text-gray-400">${precioDe(p.id)} · stock mínimo {p.stockMinimo}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${critico && !verBaja ? 'text-yellow-600' : ''}`}>{stock}</p>
                <p className="text-xs text-gray-400">{critico && !verBaja ? '⚠️ en stock' : 'en stock'}</p>
              </div>
            </button>
          );
        })}
        {filtrados.length === 0 && <p className="p-4 text-sm text-gray-400 text-center">Sin resultados.</p>}
      </div>

      {!verBaja && (
        <button
          onClick={() => setMostrarAlta(true)}
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-brand-orange text-white text-2xl shadow-lg"
        >
          +
        </button>
      )}

      {mostrarAlta && (
        <FormularioProducto
          titulo="Nuevo producto"
          onClose={() => setMostrarAlta(false)}
          onGuardar={(datos) => agregarProducto(datos)}
        />
      )}

      {productoEditar && (
        <FormularioProducto
          titulo="Editar producto"
          inicial={{ ...productoEditar, precioVenta: precioDe(productoEditar.id) }}
          onClose={() => setProductoEditar(null)}
          onGuardar={(datos) => actualizarProducto(productoEditar.id, datos)}
          onEliminar={
            productoEditar.activo
              ? () => {
                  eliminarProducto(productoEditar.id);
                  setProductoEditar(null);
                }
              : null
          }
          onReactivar={
            !productoEditar.activo
              ? () => {
                  reactivarProducto(productoEditar.id);
                  setProductoEditar(null);
                }
              : null
          }
          onEliminarPermanente={() => {
            eliminarProductoPermanente(productoEditar.id);
            setProductoEditar(null);
          }}
        />
      )}
    </div>
  );
}

function FormularioProducto({ titulo, inicial, onClose, onGuardar, onEliminar, onReactivar, onEliminarPermanente }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [categoria, setCategoria] = useState(inicial?.categoria ?? 'Cerveza');
  const [tipoEnvase, setTipoEnvase] = useState(inicial?.tipoEnvase ?? 'N/A');
  const [stockMinimo, setStockMinimo] = useState(inicial?.stockMinimo ?? 10);
  const [precioVenta, setPrecioVenta] = useState(inicial?.precioVenta ?? '');
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const [confirmarPermanente, setConfirmarPermanente] = useState(false);

  function guardar() {
    if (!nombre.trim()) return;
    onGuardar({
      nombre: nombre.trim(),
      categoria,
      tipoEnvase,
      stockMinimo: Number(stockMinimo),
      precioVenta: precioVenta === '' ? undefined : Number(precioVenta),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg">{titulo}</h3>
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
          placeholder="Precio de venta ($)"
          value={precioVenta}
          onChange={(e) => setPrecioVenta(e.target.value)}
        />
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

        {onEliminar && !confirmarBaja && (
          <button onClick={() => setConfirmarBaja(true)} className="w-full text-red-500 text-sm font-semibold py-2">
            Dar de baja este producto
          </button>
        )}
        {onEliminar && confirmarBaja && (
          <div className="bg-red-50 rounded-xl p-3 text-center space-y-2">
            <p className="text-sm text-red-600">
              No aparecerá más en Venta, Compras ni Salida a venta. Su historial de ventas anteriores se conserva. ¿Confirmas?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarBaja(false)} className="flex-1 border rounded-xl py-2 text-sm">Cancelar</button>
              <button onClick={onEliminar} className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-semibold">Sí, dar de baja</button>
            </div>
          </div>
        )}
        {onReactivar && (
          <button onClick={onReactivar} className="w-full text-brand text-sm font-semibold py-2">
            Reactivar producto
          </button>
        )}

        {onEliminarPermanente && !confirmarPermanente && (
          <button onClick={() => setConfirmarPermanente(true)} className="w-full text-red-700 text-xs font-semibold py-2 border-t pt-3">
            Eliminar permanentemente (borra también sus lotes y stock)
          </button>
        )}
        {onEliminarPermanente && confirmarPermanente && (
          <div className="bg-red-100 rounded-xl p-3 text-center space-y-2 border-t pt-3">
            <p className="text-sm text-red-700 font-semibold">
              Esto borra el producto para siempre, junto con sus lotes, presentaciones y stock de envases. No se puede deshacer. Úsalo solo para limpiar catálogo de prueba.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarPermanente(false)} className="flex-1 border rounded-xl py-2 text-sm">Cancelar</button>
              <button onClick={onEliminarPermanente} className="flex-1 bg-red-700 text-white rounded-xl py-2 text-sm font-semibold">Eliminar para siempre</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
