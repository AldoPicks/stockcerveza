import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

export default function Home() {
  const { productos, ventas, clientes, envaseStockPorProducto, incidenciasEnvase, stockAlmacen, salidaActual } = useApp();

  const hoy = new Date().toDateString();
  const ventasHoy = ventas.filter((v) => new Date(v.fecha).toDateString() === hoy);
  const totalVentasHoy = ventasHoy.reduce((s, v) => s + v.total, 0);
  const gananciaHoy = ventasHoy.reduce((s, v) => s + v.gananciaEstimada, 0);
  const cuentasPorCobrar = clientes.reduce((s, c) => s + c.saldoActual, 0);
  const envasesVacios = Object.values(envaseStockPorProducto).reduce((s, e) => s + e.cantidadAlmacen + e.cantidadEnVenta, 0);

  const stockCritico = productos.filter((p) => stockAlmacen(p.id) <= p.stockMinimo);
  const incidenciasSemana = incidenciasEnvase.slice(-5).reverse();

  return (
    <div className="p-4 space-y-4">
      <header className="bg-brand text-white rounded-2xl p-4">
        <h1 className="text-lg font-bold">🍺 StockCerveza</h1>
        <p className="text-xs opacity-80">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Kpi label="Ventas hoy" value={`$${totalVentasHoy.toFixed(0)}`} />
          <Kpi label="Ganancia hoy" value={`$${gananciaHoy.toFixed(0)}`} accent />
          <Kpi label="Cuentas x cobrar" value={`$${cuentasPorCobrar.toFixed(0)}`} />
          <Kpi label="Envases vacíos" value={`${envasesVacios} pzas`} />
        </div>
      </header>

      {stockCritico.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <p className="text-yellow-700 font-semibold text-sm mb-2">⚠️ Stock crítico — {stockCritico.length} productos</p>
          {stockCritico.map((p) => (
            <div key={p.id} className="flex justify-between text-sm py-1">
              <span>{p.emoji} {p.nombre}</span>
              <span className="font-semibold">{stockAlmacen(p.id)} pzas</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">ACCIONES RÁPIDAS</p>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/venta" className="bg-brand-orange text-white rounded-2xl p-4 text-center font-semibold">
            🛒 Nueva Venta
          </Link>
          <Link to="/compras" className="bg-brand text-white rounded-2xl p-4 text-center font-semibold">
            💵 Registrar Compra
          </Link>
          <Link to="/salida-cierre" className="bg-white border rounded-2xl p-4 text-center font-semibold col-span-2">
            📤 {salidaActual ? 'Gestionar día en curso / Cerrar día' : 'Iniciar salida a venta'}
          </Link>
        </div>
      </div>

      {incidenciasSemana.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">INCIDENCIAS RECIENTES</p>
          <div className="bg-white rounded-2xl divide-y">
            {incidenciasSemana.map((inc) => {
              const prod = productos.find((p) => p.id === inc.productoId);
              return (
                <div key={inc.id} className="flex justify-between items-center p-3 text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColor(inc.tipo)}`}>
                    {labelTipo(inc.tipo)}
                  </span>
                  <span className="flex-1 px-2">{prod?.nombre}</span>
                  <span className="font-semibold">{inc.cantidad} pzas</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div className="bg-white/10 rounded-xl p-3">
      <p className="text-xs opacity-80">{label}</p>
      <p className={`text-xl font-bold ${accent ? 'text-orange-300' : ''}`}>{value}</p>
    </div>
  );
}

function labelTipo(tipo) {
  return { Roto: 'Roto', Perdido: 'Perdido', Inaccesible: 'Inaccesible', No_encontrado_cierre: 'Faltante', Otro: 'Otro' }[tipo] || tipo;
}
function badgeColor(tipo) {
  return {
    Roto: 'bg-red-100 text-red-600',
    Perdido: 'bg-yellow-100 text-yellow-700',
    Inaccesible: 'bg-gray-100 text-gray-600',
    No_encontrado_cierre: 'bg-yellow-100 text-yellow-700',
    Otro: 'bg-gray-100 text-gray-600',
  }[tipo] || 'bg-gray-100 text-gray-600';
}
