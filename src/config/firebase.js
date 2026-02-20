/**
 * Firebase initialisation.
 * Only initialises if VITE_FIREBASE_API_KEY is configured.
 * Connects to Firebase emulators in development when available.
 */
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import env from './env'

const firebaseConfig = {
  apiKey:            env.FIREBASE_API_KEY,
  authDomain:        env.FIREBASE_AUTH_DOMAIN,
  projectId:         env.FIREBASE_PROJECT_ID,
  storageBucket:     env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.FIREBASE_APP_ID,
}

/** Firebase is considered configured when the API key is set. */
export const isFirebaseConfigured = Boolean(env.FIREBASE_API_KEY)

let app = null
let auth = null

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)

  // Connect to Firebase Auth emulator in development
  // Start with: firebase emulators:start
  if (env.IS_DEV && import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true') {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
      console.log('[Firebase] Connected to Auth emulator at localhost:9099')
    } catch (err) {
      console.warn('[Firebase] Could not connect to Auth emulator:', err.message)
    }
  }
}

export { app, auth }
export default app
