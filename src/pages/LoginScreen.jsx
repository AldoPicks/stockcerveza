import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginScreen() {
  const { loginConPin } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setError(null);
    if (!usuario.trim() || pin.length !== 6) {
      setError('Escribe tu usuario y un PIN de 6 dígitos.');
      return;
    }
    setCargando(true);
    try {
      await loginConPin(usuario, pin);
    } catch (err) {
      setError('Usuario o PIN incorrecto.');
      setPin('');
    } finally {
      setCargando(false);
    }
  }

  function tocarDigito(d) {
    if (pin.length < 6) setPin(pin + d);
  }
  function borrar() {
    setPin(pin.slice(0, -1));
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand p-4">
      <form onSubmit={entrar} className="bg-white rounded-3xl p-6 w-full max-w-xs space-y-4">
        <div className="text-center">
          <p className="text-4xl">🍺</p>
          <h1 className="font-bold text-lg">StockCerveza</h1>
          <p className="text-xs text-gray-400">Ingresa tu usuario y PIN</p>
        </div>

        <input
          className="w-full border rounded-xl px-3 py-3 text-center"
          placeholder="Usuario (ej. punto1)"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />

        <div className="flex justify-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`w-8 h-10 rounded-lg border flex items-center justify-center text-xl font-bold ${i < pin.length ? 'bg-green-50 border-brand' : ''}`}>
              {i < pin.length ? '•' : ''}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button type="button" key={d} onClick={() => tocarDigito(d)} className="bg-gray-100 rounded-xl py-3 text-lg font-semibold">
              {d}
            </button>
          ))}
          <button type="button" onClick={borrar} className="bg-gray-100 rounded-xl py-3 text-sm font-semibold">⌫</button>
          <button type="button" onClick={() => tocarDigito('0')} className="bg-gray-100 rounded-xl py-3 text-lg font-semibold">0</button>
          <div />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button disabled={cargando} className="w-full bg-brand-orange text-white rounded-xl py-3 font-bold disabled:opacity-50">
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
