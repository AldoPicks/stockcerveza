import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Mas() {
  const { incidenciasEnvase, historialCierres, firebaseConfigurado } = useApp();
  const { usuario, logout } = useAuth();
  const { modoOscuro, alternarModoOscuro } = useTheme();

  const item = (to, icon, titulo, subtitulo) => (
    <Link to={to} className="bg-white rounded-2xl p-4 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-semibold text-sm">{titulo}</p>
        <p className="text-xs text-gray-400">{subtitulo}</p>
      </div>
    </Link>
  );

  return (
    <div className="p-4 space-y-3">
      <h2 className="font-bold text-lg">Más</h2>
      {item('/envases', '🗑️', 'Envases e Incidencias', `${incidenciasEnvase.length} incidencias registradas`)}
      {item('/ventas-dia', '🧾', 'Ventas del día', 'Ver, cancelar y exportar a Excel/PDF')}
      {item('/compras', '💵', 'Compras', 'Registrar nueva compra')}
      {item('/salida-cierre', '📤', 'Salida a venta / Cierre', `${historialCierres.length} cierres realizados`)}

      <button
        onClick={alternarModoOscuro}
        className="w-full bg-white rounded-2xl p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{modoOscuro ? '🌙' : '☀️'}</span>
          <div className="text-left">
            <p className="font-semibold text-sm">Modo oscuro</p>
            <p className="text-xs text-gray-400">{modoOscuro ? 'Activado' : 'Desactivado'}</p>
          </div>
        </div>
        <div className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${modoOscuro ? 'bg-brand justify-end' : 'bg-gray-200 justify-start'}`}>
          <div className="w-5 h-5 bg-white rounded-full shadow" />
        </div>
      </button>

      {firebaseConfigurado && usuario && (
        <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Sesión activa</p>
            <p className="font-semibold text-sm">{usuario.email?.replace('@stockcerveza.local', '')}</p>
          </div>
          <button onClick={logout} className="text-red-500 text-sm font-semibold">Cerrar sesión</button>
        </div>
      )}

      <div className="text-center text-xs text-gray-400 pt-6">
        🍺 StockCerveza v1.0 MVP
        <br />
        Inventario y Ventas
      </div>
    </div>
  );
}
