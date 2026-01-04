// Módulo simple para autenticar con Firebase (modular v9).
// Reemplaza firebaseConfig con tu propia configuración.
//
// NOTA: Si no quieres usar Firebase, omite este archivo y elimina initFirebase() en app.js.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

let auth = null;

// Rellena con tu config de Firebase (del proyecto)
const firebaseConfig = {
  apiKey: "REPLACE_APIKEY",
  authDomain: "REPLACE_PROJECT.firebaseapp.com",
  projectId: "REPLACE_PROJECT",
  storageBucket: "REPLACE_PROJECT.appspot.com",
  messagingSenderId: "XXXXX",
  appId: "1:XXXXX:web:YYYYYYY"
};

export function initFirebase() {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (e) {
    console.warn('Firebase no inicializado. Reemplaza firebaseConfig si quieres auth.');
  }
}

export async function authSignInWithEmail(email, password) {
  if (!auth) throw new Error('Firebase no inicializado');
  return signInWithEmailAndPassword(auth, email, password);
}

export async function authSignInWithGoogle() {
  if (!auth) throw new Error('Firebase no inicializado');
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function authSignOut() {
  if (!auth) throw new Error('Firebase no inicializado');
  return signOut(auth);
}

export function authOnStateChanged(cb) {
  if (!auth) { cb(null); return; }
  return onAuthStateChanged(auth, cb);
}