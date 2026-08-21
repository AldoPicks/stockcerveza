import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

export default function Clientes() {
  const { clientes, registrarAbono, agregarCliente, eliminarCliente } = useApp();
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [mostrarAlta, setMostrarAlta] = useState(false);

  const totalPorCobrar = clientes.reduce((s, c) => s + c.saldoActual, 0);
  const filtrados = clientes.filter((c) => c.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="p-4 space-y-3">
      <h2 className="font-bold text-lg">Clientes</h2>
      <div className="bg-yellow-50 rounded-2xl p-4 flex justify-between items-center">
        <div>
          <p className="text-xs text-yellow-700">TOTAL CUENTAS POR COBRAR</p>
          <p className="text-2xl font-bold text-yellow-700">${totalPorCobrar.toFixed(0)}</p>
        </div>
        <span className="text-2xl">💰</span>
      </div>

      <input
        className="w-full border rounded-xl px-4 py-2 bg-white"
        placeholder="🔍 Buscar cliente..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div className="bg-white rounded-2xl divide-y">
        {filtrados.map((c) => (
          <button key={c.id} onClick={() => setSeleccionado(c)} className="w-full flex justify-between items-center p-3 text-left">
            <div>
              <p className="font-semibold text-sm">{c.nombre}</p>
              <p className="text-xs text-gray-400">📞 {c.telefono || 'sin teléfono'}</p>
            </div>
            <div className="text-right">
              {c.saldoActual === 0 ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Al corriente</span>
              ) : (
                <>
                  <p className={`font-bold ${c.limiteCredito && c.saldoActual > c.limiteCredito ? 'text-red-500' : 'text-yellow-600'}`}>
                    ${c.saldoActual}
                  </p>
                  {c.limiteCredito && c.saldoActual > c.limiteCredito && <p className="text-xs text-red-500">Sobre límite</p>}
                </>
              )}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => setMostrarAlta(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-brand-orange text-white text-2xl shadow-lg"
      >
        +
      </button>

      {seleccionado && (
        <DetalleCliente
          cliente={seleccionado}
          onClose={() => setSeleccionado(null)}
          onAbonar={(monto) => {
            registrarAbono({ clienteId: seleccionado.id, monto });
            setSeleccionado(null);
          }}
          onEliminar={() => {
            eliminarCliente(seleccionado.id);
            setSeleccionado(null);
          }}
        />
      )}

      {mostrarAlta && (
        <AltaCliente
          onClose={() => setMostrarAlta(false)}
          onCrear={(datos) => {
            agregarCliente(datos);
            setMostrarAlta(false);
          }}
        />
      )}
    </div>
  );
}

function DetalleCliente({ cliente, onClose, onAbonar, onEliminar }) {
  const [monto, setMonto] = useState('');
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-4 space-y-3 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg">{cliente.nombre}</h3>
        <p className="text-sm text-gray-500">Saldo actual: <span className="font-bold">${cliente.saldoActual}</span></p>
        {cliente.limiteCredito && <p className="text-xs text-gray-400">Límite de crédito: ${cliente.limiteCredito}</p>}
        <input
          type="number"
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Monto a abonar"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border rounded-xl py-3">Cerrar</button>
          <button
            onClick={() => monto && onAbonar(Number(monto))}
            className="flex-1 bg-brand text-white rounded-xl py-3 font-semibold"
          >
            Registrar abono
          </button>
        </div>

        {!confirmarEliminar && (
          <button onClick={() => setConfirmarEliminar(true)} className="w-full text-red-500 text-sm font-semibold py-2 border-t pt-3">
            Eliminar cliente
          </button>
        )}
        {confirmarEliminar && (
          <div className="bg-red-50 rounded-xl p-3 text-center space-y-2 border-t pt-3">
            <p className="text-sm text-red-600">
              {cliente.saldoActual > 0
                ? `Este cliente tiene una deuda de $${cliente.saldoActual} sin pagar. Al eliminarlo, esa deuda y su historial de abonos se borran también. `
                : 'Su historial de abonos se borra también. '}
              No se puede deshacer. ¿Confirmas?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarEliminar(false)} className="flex-1 border rounded-xl py-2 text-sm">Cancelar</button>
              <button onClick={onEliminar} className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-semibold">Sí, eliminar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AltaCliente({ onClose, onCrear }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [limiteCredito, setLimiteCredito] = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-4 space-y-3">
        <h3 className="font-bold text-lg">Nuevo cliente</h3>
        <input className="w-full border rounded-xl px-3 py-2" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input className="w-full border rounded-xl px-3 py-2" placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        <input
          type="number"
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Límite de crédito (opcional)"
          value={limiteCredito}
          onChange={(e) => setLimiteCredito(e.target.value)}
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border rounded-xl py-3">Cancelar</button>
          <button
            onClick={() => nombre.trim() && onCrear({ nombre: nombre.trim(), telefono, limiteCredito: limiteCredito ? Number(limiteCredito) : null })}
            className="flex-1 bg-brand text-white rounded-xl py-3 font-semibold"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
