import React, { createContext, useContext, useState, useEffect } from 'react';

// ============================================================
// Modo oscuro simple: guarda la preferencia en localStorage
// (esto es un proyecto real corriendo en el navegador del usuario,
// no un Artifact de chat, así que localStorage es apropiado aquí)
// y aplica la clase "dark" en <html>. Los estilos correspondientes
// viven en src/styles/index.css bajo el selector `.dark`.
// ============================================================

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [modoOscuro, setModoOscuro] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('stockcerveza_modo_oscuro') === 'true';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', modoOscuro);
    localStorage.setItem('stockcerveza_modo_oscuro', String(modoOscuro));
  }, [modoOscuro]);

  return (
    <ThemeContext.Provider value={{ modoOscuro, alternarModoOscuro: () => setModoOscuro((v) => !v) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
