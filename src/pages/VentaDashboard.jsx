import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';

export default function VentaDashboard() {
  const { ventas, productos } = useApp();

  const hoy = new Date().toDateString();
  const ventasHoy = useMemo(() => ventas.filter((v) => new Date(v.fecha).toDateString() === hoy), [ventas, hoy]);

  const porHora = useMemo(() => {
    const mapa = {};
    ventasHoy.forEach((v) => {
      const h = new Date(v.fecha).getHours();
      mapa[h] = (mapa[h] || 0) + 1;
    });
    const horas = Object.keys(mapa).map(Number);
    if (horas.length === 0) return [];
    const min = Math.min(...horas);
    const max = Math.max(...horas);
    const resultado = [];
    for (let h = min; h <= max; h++) resultado.push({ hora: h, cantidad: mapa[h] || 0 });
    return resultado;
  }, [ventasHoy]);

  const maxVentasHora = Math.max(1, ...porHora.map((p) => p.cantidad));

  const productosVendidos = useMemo(() => {
    const mapa = {};
    ventasHoy.forEach((v) => {
      v.detalles.forEach((d) => {
        if (!mapa[d.productoId]) mapa[d.productoId] = { cantidad: 0, monto: 0 };
        mapa[d.productoId].cantidad += d.cantidad;
        mapa[d.productoId].monto += d.precioUnitario * d.cantidad - d.descuento;
      });
    });
    const lista = Object.entries(mapa)
      .map(([productoId, datos]) => ({ producto: productos.find((p) => p.id === productoId), ...datos }))
      .filter((x) => x.producto);
    lista.sort((a, b) => b.cantidad - a.cantidad);
    const totalCantidad = lista.reduce((s, x) => s + x.cantidad, 0) || 1;
    return lista.map((x) => ({ ...x, porcentaje: Math.round((x.cantidad / totalCantidad) * 100) }));
  }, [ventasHoy, productos]);

  const totalGanancia = ventasHoy.reduce((s, v) => s + v.gananciaEstimada, 0);
  const totalVendido = ventasHoy.reduce((s, v) => s + v.total, 0);

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="bg-brand text-white rounded-2xl p-4">
        <div className="flex justify-between mb-3">
          <div>
            <p className="text-xs opacity-70">Ventas de hoy</p>
            <p className="text-xl font-bold">${totalVendido.toFixed(0)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-70">Ganancia</p>
            <p className="text-xl font-bold text-orange-300">${totalGanancia.toFixed(0)}</p>
          </div>
        </div>

        <p className="text-xs opacity-80 mb-2">Ventas por hora</p>
        {porHora.length === 0 ? (
          <p className="text-xs opacity-60 py-6 text-center">Aún no hay ventas hoy.</p>
        ) : (
          <div className="flex items-end gap-1 h-24">
            {porHora.map((p) => (
              <div key={p.hora} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                <span className="text-[10px] opacity-0 group-hover:opacity-100 absolute -top-4">{p.cantidad}</span>
                <div
                  className="w-full bg-brand-orange rounded-t transition-all"
                  style={{ height: `${Math.max((p.cantidad / maxVentasHora) * 100, p.cantidad > 0 ? 8 : 2)}%` }}
                />
                <span className="text-[10px] opacity-70">{p.hora}h</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">PRODUCTOS VENDIDOS HOY · {productosVendidos.length} items</p>
        <div className="bg-white rounded-2xl divide-y">
          {productosVendidos.length === 0 && <p className="p-4 text-sm text-gray-400 text-center">Sin ventas todavía.</p>}
          {productosVendidos.map((x) => (
            <div key={x.producto.id} className="p-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold">{x.producto.emoji} {x.producto.nombre}</span>
                <span className="text-gray-500">{x.cantidad} uds · ${x.monto.toFixed(0)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-brand-orange h-1.5 rounded-full" style={{ width: `${x.porcentaje}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
