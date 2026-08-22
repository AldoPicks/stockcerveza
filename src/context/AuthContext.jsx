import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, firebaseConfigurado } from '../firebase/config.js';

// ============================================================
// Login simple con "usuario" + "PIN" (RNF: Autenticación simple PIN).
// Por debajo usa Firebase Auth con Email/Password: el usuario que
// se escribe se convierte en un correo ficticio (usuario@stockcerveza.local)
// y el PIN de 6 dígitos se usa como password (mínimo que exige Firebase).
//
// Los usuarios se dan de alta manualmente en Firebase Console >
// Authentication > Users (ver instalacion-github-firebase.md, Paso 2.6).
// No hay pantalla de "alta de usuario" dentro de la app a propósito:
// evita que cualquiera con la URL pueda crearse acceso solo.
//
// La sesión se cierra sola después de 2 horas de haber iniciado sesión
// (no 2 horas de inactividad, sino 2 horas desde el login), para que un
// dispositivo compartido en el punto de venta no quede con la sesión
// abierta indefinidamente. El momento del login se guarda en localStorage
// para que el límite se respete incluso si recargas la página o cierras
// y abres el navegador de nuevo dentro de esas 2 horas.
// ============================================================

const DURACION_SESION_MS = 2 * 60 * 60 * 1000; // 2 horas

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargandoAuth, setCargandoAuth] = useState(firebaseConfigurado);

  useEffect(() => {
    if (!firebaseConfigurado) {
      setCargandoAuth(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUsuario(u);
      setCargandoAuth(false);
    });
    return unsub;
  }, []);

  // Temporizador de expiración de sesión (2 horas desde el login).
  useEffect(() => {
    if (!usuario) return;

    const claveInicio = `stockcerveza_login_inicio_${usuario.uid}`;
    let inicio = Number(localStorage.getItem(claveInicio));
    if (!inicio) {
      inicio = Date.now();
      localStorage.setItem(claveInicio, String(inicio));
    }

    const transcurrido = Date.now() - inicio;
    const restante = DURACION_SESION_MS - transcurrido;

    if (restante <= 0) {
      localStorage.removeItem(claveInicio);
      signOut(auth);
      return;
    }

    const temporizador = setTimeout(() => {
      localStorage.removeItem(claveInicio);
      signOut(auth);
    }, restante);

    return () => clearTimeout(temporizador);
  }, [usuario]);

  function emailDe(usuarioTexto) {
    const texto = usuarioTexto.trim().toLowerCase();
    return texto.includes('@') ? texto : `${texto.replace(/\s+/g, '')}@stockcerveza.local`;
  }

  async function loginConPin(usuarioTexto, pin) {
    await signInWithEmailAndPassword(auth, emailDe(usuarioTexto), pin);
  }

  async function logout() {
    if (usuario) localStorage.removeItem(`stockcerveza_login_inicio_${usuario.uid}`);
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargandoAuth, loginConPin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
