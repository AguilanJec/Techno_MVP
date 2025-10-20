import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCXml71jy89ryMPt32ZnLa82Od8ZRkPXuw",
    authDomain: "hirayag.firebaseapp.com",
    projectId: "hirayag",
    storageBucket: "hirayag.firebasestorage.app",
    messagingSenderId: "308001835959",
    appId: "1:308001835959:web:1cdfc2c95b6a658539f632",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);