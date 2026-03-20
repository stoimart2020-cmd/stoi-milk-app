import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Shared state object — ensures references stay current after re-init
const firebaseState = {
    app: null,
    auth: null,
    messaging: null,
};

export const initializeFirebase = (config = null) => {
    const finalConfig = config || firebaseConfig;
    if (finalConfig.apiKey) {
        try {
            // If already initialized with a valid app, reuse it
            if (getApps().length > 0) {
                firebaseState.app = getApps()[0];
                firebaseState.auth = getAuth(firebaseState.app);
                try {
                    firebaseState.messaging = typeof window !== 'undefined' ? getMessaging(firebaseState.app) : null;
                } catch { /* messaging may not be available */ }
                console.log("Firebase reused existing app");
                return firebaseState;
            }

            firebaseState.app = initializeApp(finalConfig);
            firebaseState.auth = getAuth(firebaseState.app);
            try {
                firebaseState.messaging = typeof window !== 'undefined' ? getMessaging(firebaseState.app) : null;
            } catch { /* messaging may not be available */ }
            console.log("Firebase initialized successfully");
            return firebaseState;
        } catch (error) {
            console.error("Firebase initialization failed:", error);
        }
    } else {
        console.warn("Firebase config missing. Some features may not work.");
    }
    return null;
};

// Auto-initialize if env vars are present
initializeFirebase();

// Export getters so consumers always get the latest reference
export const getFirebaseAuth = () => firebaseState.auth;
export const getFirebaseApp = () => firebaseState.app;
export const getFirebaseMessaging = () => firebaseState.messaging;

// Also export direct references for backward compatibility
export { RecaptchaVerifier, signInWithPhoneNumber, firebaseState };

export const requestForToken = () => {
    const msg = firebaseState.messaging;
    if (!msg) return Promise.resolve(null);
    return getToken(msg, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY })
        .then((currentToken) => {
            if (currentToken) {
                console.log('FCM Token:', currentToken);
                return currentToken;
            } else {
                console.log('No registration token available. Request permission to generate one.');
                return null;
            }
        })
        .catch((err) => {
            console.log('An error occurred while retrieving token. ', err);
            return null;
        });
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        const msg = firebaseState.messaging;
        if (!msg) return resolve(null);
        onMessage(msg, (payload) => {
            console.log("OnMessage:", payload);
            resolve(payload);
        });
    });
