import React from 'react';
import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav.jsx';
import Home from './pages/Home.jsx';
import Venta from './pages/Venta.jsx';
import Productos from './pages/Productos.jsx';
import Clientes from './pages/Clientes.jsx';
import Mas from './pages/Mas.jsx';
import Compras from './pages/Compras.jsx';
import EnvasesIncidencias from './pages/EnvasesIncidencias.jsx';
import SalidaCierre from './pages/SalidaCierre.jsx';
import LoginScreen from './pages/LoginScreen.jsx';
import { useApp } from './context/AppContext.jsx';
import { useAuth } from './context/AuthContext.jsx';

function Pantalla({ texto }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">{texto}</p>
    </div>
  );
}

export default function App() {
  const { cargando, firebaseConfigurado } = useApp();
  const { usuario, cargandoAuth } = useAuth();

  if (firebaseConfigurado && cargandoAuth) {
    return <Pantalla texto="Cargando…" />;
  }
  if (firebaseConfigurado && !usuario) {
    return <LoginScreen />;
  }
  if (cargando) {
    return <Pantalla texto="Conectando con Firebase…" />;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
      <div className={`text-center text-xs py-1 ${firebaseConfigurado ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
        {firebaseConfigurado ? '🟢 Conectado a Firebase' : '🟡 Modo local (datos de prueba, sin Firebase)'}
      </div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/venta" element={<Venta />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/mas" element={<Mas />} />
        <Route path="/compras" element={<Compras />} />
        <Route path="/envases" element={<EnvasesIncidencias />} />
        <Route path="/salida-cierre" element={<SalidaCierre />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
