import { initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore/lite";

/**
 * Sammensetningsrot for Firebase: modul-singleton som initialiserer
 * Firebase App + Auth + Firestore fra `import.meta.env.VITE_FIREBASE_*` (se
 * `.env.example`).
 *
 * OBS — `getAuth(firebaseApp)` under kaster synkront (`auth/invalid-api-key`)
 * når `firebaseConfig` er tom eller ugyldig, selv om `initializeApp` i seg
 * selv ikke gjør det. Denne modulen må derfor aldri importeres uten at ekte
 * `VITE_FIREBASE_*`-verdier er satt i miljøet den kjører i (dev, e2e,
 * CI-build).
 *
 * `firebase/firestore/lite` (ikke full `firebase/firestore`) — appen bruker
 * aldri realtime-lyttere (`onSnapshot`), kun engangs
 * `getDocs`/`addDoc`/`updateDoc`/`deleteDoc`. Lite-SDK-en bruker Firestores
 * vanlige REST-API direkte (ett `fetch`-kall per operasjon) i stedet for den
 * fulle SDK-ens stateful WebChannel-sesjonsprotokoll, som er upraktisk å
 * stubbe pålitelig i e2e-tester.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);

export const firestore: Firestore = getFirestore(firebaseApp);
