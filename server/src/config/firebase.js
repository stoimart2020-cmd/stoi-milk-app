const admin = require("firebase-admin");
const path = require("path");

const initializeFirebase = async () => {
    try {
        if (admin.apps.length) return;

        const Settings = require("../models/Settings");
        const settings = await Settings.getSettings();
        const firebase = settings.firebase;

        if (firebase && firebase.enabled && firebase.projectId && firebase.privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: firebase.projectId,
                    clientEmail: firebase.clientEmail,
                    privateKey: firebase.privateKey.replace(/\\n/g, '\n'),
                })
            });
            console.log("Firebase Admin initialized using database settings");
        } else {
            // Fallback to Environment Variables or File
            const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, "../../serviceAccountKey.json");

            if (process.env.FIREBASE_CONFIG_JSON) {
                const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
                console.log("Firebase Admin initialized using FIREBASE_CONFIG_JSON");
            } else {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccountPath)
                });
                console.log("Firebase Admin initialized using serviceAccountKey.json");
            }
        }
    } catch (error) {
        console.error("Firebase Admin initialization failed:", error.message);
    }
};


module.exports = { admin, initializeFirebase };
