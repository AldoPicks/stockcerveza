// ============================================================
// Configuración de Firebase.
// Las claves se leen de variables de entorno (.env), nunca se escriben aquí.
// Mientras no configures .env, la app sigue funcionando con datos de prueba
// (ver src/data/seedData.js) — Firebase simplemente no se usará todavía.
// ============================================================
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigurado = Boolean(firebaseConfig.apiKey);

let app, db, auth;
if (firebaseConfigurado) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} else {
  console.warn(
    '[StockCerveza] Firebase no está configurado todavía (falta .env). ' +
    'La app está usando datos de prueba en memoria. Ver instalacion-github-firebase.md'
  );
}

export { app, db, auth };
