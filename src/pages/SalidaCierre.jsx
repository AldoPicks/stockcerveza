import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

export default function SalidaCierre() {
  const { productos, ventas, stockAlmacen, stockEnVenta, salidaActual, iniciarSalida, regresarStockHuerfanoAAlmacen, cerrarDia } = useApp();

  if (!salidaActual) {
    return (
      <IniciarSalida
        productos={productos}
        stockAlmacen={stockAlmacen}
        stockEnVenta={stockEnVenta}
        onIniciar={iniciarSalida}
        onRegresarHuerfano={regresarStockHuerfanoAAlmacen}
      />
    );
  }

  // Cuánto se ha vendido de cada producto retornable desde que se abrió este
  // ciclo — esto es lo que el cierre debe pedir contar (no solo los canjes).
  const inicioCiclo = new Date(salidaActual.fechaApertura);
  const esperadoEnvasesPorProducto = {};
  ventas
    .filter((v) => v.estado === 'Confirmada' && new Date(v.fecha) >= inicioCiclo)
    .forEach((v) => {
      v.detalles.forEach((d) => {
        const producto = productos.find((p) => p.id === d.productoId);
        if (producto?.tipoEnvase === 'Retornable') {
          esperadoEnvasesPorProducto[d.productoId] = (esperadoEnvasesPorProducto[d.productoId] || 0) + d.cantidad;
        }
      });
    });

  return (
    <CerrarDia
      productos={productos}
      stockEnVenta={stockEnVenta}
      esperadoEnvasesPorProducto={esperadoEnvasesPorProducto}
      onCerrar={cerrarDia}
    />
  );
}

function IniciarSalida({ productos, stockAlmacen, stockEnVenta, onIniciar, onRegresarHuerfano }) {
  const [cantidades, setCantidades] = useState({});
  const [error, setError] = useState(null);
  const [regresando, setRegresando] = useState(false);

  const productosConStockHuerfano = productos.filter((p) => stockEnVenta(p.id) > 0);

  function set(productoId, valor) {
    setCantidades((prev) => ({ ...prev, [productoId]: valor }));
  }

  async function confirmar() {
    const items = Object.entries(cantidades)
      .filter(([, v]) => Number(v) > 0)
      .map(([productoId, v]) => ({ productoId, cantidad: Number(v) }));
    if (items.length === 0) return;
    setError(null);
    try {
      await onIniciar(items);
    } catch (e) {
      setError(e.message);
    }
  }

  async function regresarHuerfano() {
    setRegresando(true);
    try {
      await onRegresarHuerfano();
    } finally {
      setRegresando(false);
    }
  }

  return (
    <div className="p-4 space-y-3">
      <h2 className="font-bold text-lg">Salida a venta</h2>
      <p className="text-xs text-gray-500">
        Indica cuánto sacas de Almacén al punto de venta. El sistema asigna automáticamente los lotes más antiguos (FIFO).
      </p>

      {productosConStockHuerfano.length > 0 && (
        <div className="bg-yellow-50 rounded-xl p-3 space-y-2">
          <p className="text-sm text-yellow-700">
            ⚠️ Hay stock marcado "en venta" sin que exista un ciclo abierto ({productosConStockHuerfano.map((p) => `${p.nombre}: ${stockEnVenta(p.id)}`).join(', ')}). Esto puede pasar por una venta cancelada de un ciclo ya cerrado.
          </p>
          <button
            onClick={regresarHuerfano}
            disabled={regresando}
            className="w-full bg-yellow-600 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50"
          >
            {regresando ? 'Regresando…' : 'Regresar todo ese stock a Almacén'}
          </button>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{error}</div>}

      <div className="bg-white rounded-2xl divide-y">
        {productos.filter((p) => p.activo).map((p) => (
          <div key={p.id} className="flex justify-between items-center p-3">
            <div>
              <p className="font-semibold text-sm">{p.emoji} {p.nombre}</p>
              <p className="text-xs text-gray-400">{stockAlmacen(p.id)} en almacén</p>
            </div>
            <input
              type="number"
              min="0"
              max={stockAlmacen(p.id)}
              className="w-20 border rounded-lg px-2 py-1 text-right"
              value={cantidades[p.id] ?? ''}
              onChange={(e) => set(p.id, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button onClick={confirmar} className="w-full bg-brand-orange text-white rounded-2xl py-4 font-bold">
        Confirmar salida
      </button>
    </div>
  );
}

function CerrarDia({ productos, stockEnVenta, esperadoEnvasesPorProducto, onCerrar }) {
  const [conteoProducto, setConteoProducto] = useState({});
  const [envasesCompletos, setEnvasesCompletos] = useState({});
  const [envasesQuebrados, setEnvasesQuebrados] = useState({});
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  const productosEnVenta = productos.filter((p) => stockEnVenta(p.id) > 0);
  const retornablesEnVenta = productos.filter((p) => (esperadoEnvasesPorProducto[p.id] ?? 0) > 0);

  async function confirmarCierre() {
    setError(null);
    try {
      const res = await onCerrar({
        conteoProductoPorId: conteoProducto,
        envasesCompletos,
        envasesQuebrados,
      });
      setResultado(res);
    } catch (e) {
      setError(e.message);
    }
  }

  if (resultado) {
    return (
      <div className="p-4 space-y-3">
        <h2 className="font-bold text-lg">✅ Día cerrado</h2>
        <div className="bg-white rounded-2xl p-4 space-y-2">
          <p className="font-semibold text-sm">Producto</p>
          {resultado.resultadoProducto.map((r) => {
            const p = productos.find((pp) => pp.id === r.productoId);
            return (
              <p key={r.productoId} className="text-sm flex justify-between">
                <span>{p?.nombre}</span>
                <span className={r.faltante > 0 ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                  {r.faltante > 0 ? `Faltante: ${r.faltante}` : 'OK'}
                </span>
              </p>
            );
          })}
        </div>
        <div className="bg-white rounded-2xl p-4 space-y-2">
          <p className="font-semibold text-sm">Envases</p>
          {resultado.envasesResultado.map((r) => {
            const p = productos.find((pp) => pp.id === r.productoId);
            return (
              <p key={r.productoId} className="text-sm flex justify-between">
                <span>{p?.nombre}</span>
                <span className={r.faltante > 0 ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                  {r.completos} completos · {r.quebrados} quebrados{r.faltante > 0 ? ` · ${r.faltante} faltante` : ''}
                </span>
              </p>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-bold text-lg">Cierre del día</h2>

      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">PRODUCTO — cuánto regresó</p>
        <div className="bg-white rounded-2xl divide-y">
          {productosEnVenta.map((p) => (
            <div key={p.id} className="flex justify-between items-center p-3">
              <div>
                <p className="font-semibold text-sm">{p.emoji} {p.nombre}</p>
                <p className="text-xs text-gray-400">Sistema espera: {stockEnVenta(p.id)}</p>
              </div>
              <input
                type="number"
                min="0"
                className="w-20 border rounded-lg px-2 py-1 text-right"
                placeholder={String(stockEnVenta(p.id))}
                onChange={(e) => setConteoProducto((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
              />
            </div>
          ))}
          {productosEnVenta.length === 0 && <p className="p-3 text-sm text-gray-400">No hay producto pendiente de contar.</p>}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">ENVASES — conteo físico</p>
        <div className="bg-white rounded-2xl divide-y">
          {retornablesEnVenta.map((p) => (
            <div key={p.id} className="p-3">
              <p className="font-semibold text-sm mb-1">{p.emoji} {p.nombre}</p>
              <p className="text-xs text-gray-400 mb-2">
                Se vendieron {esperadoEnvasesPorProducto[p.id]} — cuenta cuántos envases tienes de vuelta
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  className="flex-1 border rounded-lg px-2 py-1"
                  placeholder="Completos"
                  onChange={(e) => setEnvasesCompletos((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                />
                <input
                  type="number"
                  min="0"
                  className="flex-1 border rounded-lg px-2 py-1"
                  placeholder="Quebrados"
                  onChange={(e) => setEnvasesQuebrados((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                />
              </div>
            </div>
          ))}
          {retornablesEnVenta.length === 0 && <p className="p-3 text-sm text-gray-400">No hay envases pendientes de contar.</p>}
        </div>
      </div>

      <button onClick={confirmarCierre} className="w-full bg-brand-orange text-white rounded-2xl py-4 font-bold">
        Confirmar cierre del día
      </button>
    </div>
  );
}
