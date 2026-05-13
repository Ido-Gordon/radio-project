// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBUs0xjCyOBIFnCbgyp6eYjrN9iQLx3AfI",
  authDomain: "interactive-chat1.firebaseapp.com",
  databaseURL: "https://interactive-chat1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "interactive-chat1",
  storageBucket: "interactive-chat1.firebasestorage.app",
  messagingSenderId: "494321000342",
  appId: "1:494321000342:web:8a045d2cf5577d5a3ec7b7",
  measurementId: "G-LJYDKVHMW7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {auth,app};