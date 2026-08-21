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
// ============================================================

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

  function emailDe(usuarioTexto) {
    const texto = usuarioTexto.trim().toLowerCase();
    return texto.includes('@') ? texto : `${texto.replace(/\s+/g, '')}@stockcerveza.local`;
  }

  async function loginConPin(usuarioTexto, pin) {
    await signInWithEmailAndPassword(auth, emailDe(usuarioTexto), pin);
  }

  async function logout() {
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
