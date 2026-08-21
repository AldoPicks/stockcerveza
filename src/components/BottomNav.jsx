import React from 'react';
import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Inicio', icon: '🏠' },
  { to: '/venta', label: 'Venta', icon: '🛒' },
  { to: '/productos', label: 'Productos', icon: '📦' },
  { to: '/clientes', label: 'Clientes', icon: '👥' },
  { to: '/mas', label: 'Más', icon: '⋯' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 max-w-md mx-auto">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center text-xs px-2 py-1 rounded-lg ${
              isActive ? 'text-brand font-semibold' : 'text-gray-400'
            }`
          }
        >
          <span className="text-lg">{it.icon}</span>
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}
