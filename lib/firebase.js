// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDYGWa2IUwxZDWSowERldz9vN08WNBHOa8",
  authDomain: "share-dom.firebaseapp.com",
  projectId: "share-dom",
  storageBucket: "share-dom.appspot.com",
  messagingSenderId: "712985248638",
  appId: "1:712985248638:web:de35f6ea50e88b20f9692f",
  measurementId: "G-S3RNW4745N",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
