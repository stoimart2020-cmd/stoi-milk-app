import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase safely
let app, auth, messaging;

export const initializeFirebase = (config = null) => {
    const finalConfig = config || firebaseConfig;
    if (finalConfig.apiKey) {
        try {
            // Check if already initialized to prevent errors
            if (app) return { app, auth, messaging };

            app = initializeApp(finalConfig);
            auth = getAuth(app);
            messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
            console.log("Firebase initialized successfully");
            return { app, auth, messaging };
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

export { app, auth, messaging };



export const requestForToken = () => {
    if (!messaging) return Promise.resolve(null);
    return getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY })
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
        if (!messaging) return resolve(null);
        onMessage(messaging, (payload) => {
            console.log("OnMessage:", payload);
            resolve(payload);
        });
    });
