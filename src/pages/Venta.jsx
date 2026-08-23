import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import VentaDashboard from './VentaDashboard.jsx';

export default function Venta() {
  const { productos, presentaciones, clientes, stockEnVenta, confirmarVenta, agregarCliente } = useApp();
  const [vista, setVista] = useState('vender'); // 'vender' | 'dashboard'
  const [carrito, setCarrito] = useState([]); // { productoId, cantidad, precioUnitario, descuento, traeCanje }
  const [mostrarCheckout, setMostrarCheckout] = useState(false);
  const [tipoPago, setTipoPago] = useState('Contado');
  const [clienteId, setClienteId] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('');
  const [mensaje, setMensaje] = useState(null);

  function precioDe(productoId) {
    const pres = presentaciones.find((p) => p.productoId === productoId && p.esDefault);
    return pres?.precioVenta ?? 0;
  }

  function agregarAlCarrito(producto) {
    if (stockEnVenta(producto.id) <= 0) {
      setMensaje(`No hay stock de "${producto.nombre}" en el punto de venta. Haz una Salida a venta primero.`);
      return;
    }
    setCarrito((prev) => {
      const existente = prev.find((i) => i.productoId === producto.id);
      if (existente) {
        if (existente.cantidad >= stockEnVenta(producto.id)) {
          setMensaje(`Ya agregaste todo el stock disponible de "${producto.nombre}".`);
          return prev;
        }
        return prev.map((i) => (i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [...prev, { productoId: producto.id, cantidad: 1, precioUnitario: precioDe(producto.id), descuento: 0, traeCanje: false }];
    });
  }

  function cambiarCantidad(productoId, delta) {
    if (delta > 0) {
      const disponible = stockEnVenta(productoId);
      const actual = carrito.find((i) => i.productoId === productoId)?.cantidad ?? 0;
      if (actual + delta > disponible) {
        const producto = productos.find((p) => p.id === productoId);
        setMensaje(`Solo hay ${disponible} en venta de "${producto?.nombre}".`);
        return;
      }
    }
    setCarrito((prev) =>
      prev
        .map((i) => (i.productoId === productoId ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0)
    );
  }

  function toggleCanje(productoId) {
    setCarrito((prev) => prev.map((i) => (i.productoId === productoId ? { ...i, traeCanje: !i.traeCanje } : i)));
  }

  const total = carrito.reduce((s, i) => s + i.precioUnitario * i.cantidad - i.descuento, 0);
  const totalPzas = carrito.reduce((s, i) => s + i.cantidad, 0);

  function irACobrar() {
    if (carrito.length === 0) return;
    setMensaje(null);
    setMostrarCheckout(true);
  }

  function confirmarClienteRapido() {
    if (!nuevoClienteNombre.trim()) return;
    const c = agregarCliente({ nombre: nuevoClienteNombre.trim() });
    setClienteId(c.id);
    setNuevoClienteNombre('');
  }

  async function confirmar() {
    if (tipoPago === 'Credito' && !clienteId) {
      setMensaje('Selecciona o da de alta un cliente para venta a crédito.');
      return;
    }
    try {
      await confirmarVenta({ carrito, tipoPago, clienteId: tipoPago === 'Credito' ? clienteId : null });
      setCarrito([]);
      setMostrarCheckout(false);
      setTipoPago('Contado');
      setClienteId('');
      setMensaje('✅ Venta registrada.');
    } catch (e) {
      setMensaje(e.message);
    }
  }

  const clientesFiltrados = clientes.filter((c) => c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()));
  const retornablesEnCarrito = carrito.filter((i) => productos.find((p) => p.id === i.productoId)?.tipoEnvase === 'Retornable');

  if (mostrarCheckout) {
    return (
      <div className="p-4 space-y-4">
        <button onClick={() => { setMensaje(null); setMostrarCheckout(false); }} className="text-brand text-sm">← Regresar</button>
        <h2 className="font-bold text-lg">Resumen de venta</h2>
        <div className="bg-white rounded-2xl divide-y">
          {carrito.map((i) => {
            const p = productos.find((pp) => pp.id === i.productoId);
            return (
              <div key={i.productoId} className="p-3">
                <div className="flex justify-between">
                  <span>{p.emoji} {p.nombre}</span>
                  <span className="font-semibold">${(i.precioUnitario * i.cantidad - i.descuento).toFixed(0)}</span>
                </div>
                <p className="text-xs text-gray-400">{i.cantidad} × ${i.precioUnitario} {i.traeCanje ? '· Trae envase' : p.tipoEnvase === 'Retornable' ? '· Se lleva envase' : ''}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-brand text-white rounded-2xl p-4 flex justify-between items-center">
          <div>
            <p className="text-xs opacity-80">Total a cobrar</p>
            <p className="text-2xl font-bold">${total.toFixed(0)}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">TIPO DE PAGO</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTipoPago('Contado')}
              className={`rounded-xl p-3 border text-center ${tipoPago === 'Contado' ? 'border-brand bg-green-50 font-semibold' : ''}`}
            >
              💵 Contado
            </button>
            <button
              onClick={() => setTipoPago('Credito')}
              className={`rounded-xl p-3 border text-center ${tipoPago === 'Credito' ? 'border-brand bg-green-50 font-semibold' : ''}`}
            >
              💳 Crédito / Fiado
            </button>
          </div>
        </div>

        {tipoPago === 'Credito' && (
          <div className="bg-white rounded-2xl p-3 space-y-2">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Buscar cliente..."
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
            />
            <div className="max-h-32 overflow-auto space-y-1">
              {clientesFiltrados.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setClienteId(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${clienteId === c.id ? 'bg-green-100 font-semibold' : 'bg-gray-50'}`}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <input
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                placeholder="Cliente nuevo: nombre"
                value={nuevoClienteNombre}
                onChange={(e) => setNuevoClienteNombre(e.target.value)}
              />
              <button onClick={confirmarClienteRapido} className="bg-brand text-white px-3 rounded-lg text-sm">+ Alta</button>
            </div>
          </div>
        )}

        {mensaje && <p className="text-sm text-red-500">{mensaje}</p>}

        <button onClick={confirmar} className="w-full bg-brand-orange text-white rounded-2xl py-4 font-bold">
          Confirmar venta — ${total.toFixed(0)}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-28 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg">{vista === 'vender' ? 'Nueva venta' : 'Dashboard'}</h2>
        <div className="bg-white rounded-full p-1 flex text-xs">
          <button
            onClick={() => setVista('vender')}
            className={`px-3 py-1.5 rounded-full font-semibold ${vista === 'vender' ? 'bg-brand text-white' : 'text-gray-500'}`}
          >
            Vender
          </button>
          <button
            onClick={() => setVista('dashboard')}
            className={`px-3 py-1.5 rounded-full font-semibold ${vista === 'dashboard' ? 'bg-brand text-white' : 'text-gray-500'}`}
          >
            📊 Dashboard
          </button>
        </div>
      </div>

      {vista === 'dashboard' ? (
        <div className="-mx-4">
          <VentaDashboard />
        </div>
      ) : (
        <>
      {mensaje && (
        <div className="bg-yellow-50 text-yellow-700 text-sm rounded-xl p-3 flex justify-between">
          <span>{mensaje}</span>
          <button onClick={() => setMensaje(null)}>✕</button>
        </div>
      )}

      {productos.filter((p) => p.activo).map((p) => {
        const enCarrito = carrito.find((i) => i.productoId === p.id);
        const disponible = stockEnVenta(p.id);
        return (
          <div key={p.id} className="bg-white rounded-2xl p-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{p.emoji} {p.nombre}</p>
              <p className="text-xs text-gray-400">${precioDe(p.id)} · {disponible} en venta {p.tipoEnvase === 'Retornable' && <span className="ml-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">Retornable</span>}</p>
            </div>
            {enCarrito ? (
              <div className="flex items-center gap-2">
                <button onClick={() => cambiarCantidad(p.id, -1)} className="w-7 h-7 rounded-full bg-gray-100">−</button>
                <span className="font-semibold w-4 text-center">{enCarrito.cantidad}</span>
                <button onClick={() => cambiarCantidad(p.id, 1)} className="w-7 h-7 rounded-full bg-brand text-white">+</button>
              </div>
            ) : (
              <button onClick={() => agregarAlCarrito(p)} className="w-8 h-8 rounded-full bg-brand-orange text-white text-lg">+</button>
            )}
          </div>
        );
      })}

      {retornablesEnCarrito.length > 0 && (
        <div className="bg-green-50 rounded-2xl p-3">
          <p className="text-xs font-semibold text-green-700 mb-2">ENVASES RETORNABLES</p>
          {retornablesEnCarrito.map((i) => {
            const p = productos.find((pp) => pp.id === i.productoId);
            return (
              <div key={i.productoId} className="flex justify-between items-center py-1 text-sm">
                <span>{p.nombre}</span>
                <div className="flex gap-2">
                  <button onClick={() => toggleCanje(i.productoId)} className={`px-3 py-1 rounded-full text-xs font-semibold ${!i.traeCanje ? 'bg-brand text-white' : 'bg-white border'}`}>Lleva</button>
                  <button onClick={() => toggleCanje(i.productoId)} className={`px-3 py-1 rounded-full text-xs font-semibold ${i.traeCanje ? 'bg-brand text-white' : 'bg-white border'}`}>Canje</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {carrito.length > 0 && (
        <button
          onClick={irACobrar}
          className="fixed bottom-20 left-4 right-4 max-w-md mx-auto bg-brand-orange text-white rounded-2xl py-4 font-bold flex justify-between px-6"
        >
          <span>Carrito · {totalPzas} pzas</span>
          <span>${total.toFixed(0)}</span>
        </button>
      )}
        </>
      )}
    </div>
  );
}
