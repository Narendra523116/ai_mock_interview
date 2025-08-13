// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_CONFIG_API_KEY,
    authDomain: "prepwise-9009.firebaseapp.com",
    projectId: "prepwise-9009",
    storageBucket: "prepwise-9009.firebasestorage.app",
    messagingSenderId: "1028166645774",
    appId: "1:1028166645774:web:d75eb3a647085d42b1a45f",
    measurementId: "G-0V19EZE3PM"
};

// Initialize Firebase
const app = !getApps.length? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
