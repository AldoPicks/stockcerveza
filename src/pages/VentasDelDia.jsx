import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { exportarVentasExcel, exportarVentasPDF } from '../utils/reportes.js';

// Compara por fecha calendario en horario local (no UTC), para que
// "hoy" sea hoy sin importar la zona horaria del dispositivo.
function fechaLocalISO(d) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

export default function VentasDelDia() {
  const { ventas, productos, clientes, cancelarVenta } = useApp();
  const [fecha, setFecha] = useState(fechaLocalISO(new Date()));
  const [filtroEstado, setFiltroEstado] = useState('Todas');
  const [seleccionada, setSeleccionada] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const ventasDelDia = useMemo(
    () => ventas.filter((v) => fechaLocalISO(new Date(v.fecha)) === fecha),
    [ventas, fecha]
  );
  const filtradas = ventasDelDia.filter((v) => filtroEstado === 'Todas' || v.estado === filtroEstado);

  const totalConfirmado = ventasDelDia.filter((v) => v.estado === 'Confirmada').reduce((s, v) => s + v.total, 0);
  const gananciaConfirmada = ventasDelDia.filter((v) => v.estado === 'Confirmada').reduce((s, v) => s + v.gananciaEstimada, 0);

  async function confirmarCancelacion(ventaId) {
    try {
      await cancelarVenta(ventaId);
      setMensaje('✅ Venta cancelada — el stock y el saldo del cliente ya se regresaron.');
      setSeleccionada(null);
    } catch (e) {
      setMensaje(e.message);
    }
  }

  return (
    <div className="p-4 space-y-3 pb-24">
      <h2 className="font-bold text-lg">Ventas del día</h2>

      <input
        type="date"
        className="w-full border rounded-xl px-3 py-2 bg-white"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
      />

      <div className="bg-brand text-white rounded-2xl p-4 flex justify-between">
        <div>
          <p className="text-xs opacity-70">Total confirmado</p>
          <p className="text-xl font-bold">${totalConfirmado.toFixed(0)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-70">Ganancia</p>
          <p className="text-xl font-bold text-orange-300">${gananciaConfirmada.toFixed(0)}</p>
        </div>
      </div>

      {mensaje && (
        <div className="bg-yellow-50 text-yellow-700 text-sm rounded-xl p-3 flex justify-between">
          <span>{mensaje}</span>
          <button onClick={() => setMensaje(null)}>✕</button>
        </div>
      )}

      <div className="flex gap-2">
        {['Todas', 'Confirmada', 'Cancelada'].map((e) => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              filtroEstado === e ? 'bg-brand text-white' : 'bg-white border'
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => exportarVentasExcel(filtradas, productos, `ventas_${fecha}`)}
          disabled={filtradas.length === 0}
          className="flex-1 bg-white border rounded-xl py-2 text-sm font-semibold disabled:opacity-40"
        >
          📊 Exportar Excel
        </button>
        <button
          onClick={() => exportarVentasPDF(filtradas, productos, `ventas_${fecha}`)}
          disabled={filtradas.length === 0}
          className="flex-1 bg-white border rounded-xl py-2 text-sm font-semibold disabled:opacity-40"
        >
          📄 Exportar PDF
        </button>
      </div>

      <div className="bg-white rounded-2xl divide-y">
        {filtradas.length === 0 && (
          <p className="p-4 text-sm text-gray-400 text-center">Sin ventas para esta fecha/filtro.</p>
        )}
        {filtradas.map((v) => (
          <button
            key={v.id}
            onClick={() => setSeleccionada(v)}
            className="w-full flex justify-between items-center p-3 text-left select-none cursor-pointer"
          >
            <div>
              <p className="font-semibold text-sm">
                {new Date(v.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · {v.detalles.length} producto(s)
              </p>
              <p className="text-xs text-gray-400">
                {v.tipoPago}
                {v.clienteId ? ` · ${clientes.find((c) => c.id === v.clienteId)?.nombre ?? 'Cliente'}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className={`font-bold ${v.estado === 'Cancelada' ? 'text-gray-300 line-through' : ''}`}>
                ${v.total.toFixed(0)}
              </p>
              <p className={`text-xs ${v.estado === 'Cancelada' ? 'text-red-400' : 'text-green-600'}`}>{v.estado}</p>
            </div>
          </button>
        ))}
      </div>

      {seleccionada && (
        <DetalleVenta
          venta={seleccionada}
          productos={productos}
          clientes={clientes}
          onClose={() => setSeleccionada(null)}
          onCancelar={() => confirmarCancelacion(seleccionada.id)}
        />
      )}
    </div>
  );
}

function DetalleVenta({ venta, productos, clientes, onClose, onCancelar }) {
  const [confirmar, setConfirmar] = useState(false);
  const cliente = venta.clienteId ? clientes.find((c) => c.id === venta.clienteId) : null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg">Venta · {new Date(venta.fecha).toLocaleString('es-MX')}</h3>
        <p className="text-xs text-gray-400">
          {venta.tipoPago}
          {cliente ? ` · ${cliente.nombre}` : ''} · Estado:{' '}
          <span className={venta.estado === 'Cancelada' ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold'}>
            {venta.estado}
          </span>
        </p>

        <div className="bg-gray-50 rounded-xl divide-y">
          {venta.detalles.map((d, i) => {
            const producto = productos.find((p) => p.id === d.productoId);
            return (
              <div key={i} className="flex justify-between p-2 text-sm">
                <span>{producto?.emoji} {producto?.nombre ?? 'Producto eliminado'} × {d.cantidad}</span>
                <span className="font-semibold">${(d.precioUnitario * d.cantidad - d.descuento).toFixed(0)}</span>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total</span>
          <span className="font-bold">${venta.total.toFixed(0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Ganancia estimada</span>
          <span className="font-bold text-brand">${venta.gananciaEstimada.toFixed(0)}</span>
        </div>

        <button onClick={onClose} className="w-full border rounded-xl py-3">Cerrar</button>

        {venta.estado === 'Confirmada' && !confirmar && (
          <button onClick={() => setConfirmar(true)} className="w-full text-red-500 text-sm font-semibold py-2">
            Cancelar esta venta
          </button>
        )}
        {venta.estado === 'Confirmada' && confirmar && (
          <div className="bg-red-50 rounded-xl p-3 text-center space-y-2">
            <p className="text-sm text-red-600">
              Se regresa el stock vendido al punto de venta{cliente ? ' y se descuenta del saldo del cliente' : ''}. No se puede deshacer. ¿Confirmas?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmar(false)} className="flex-1 border rounded-xl py-2 text-sm">No</button>
              <button onClick={onCancelar} className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-semibold">
                Sí, cancelar venta
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
