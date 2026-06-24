import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCR7Og7YXMdnzrVf3TaoHyepxZta3xSaLA",
  authDomain: "ai-studio-applet-webapp-b9fd2.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-b9fd2",
  storageBucket: "ai-studio-applet-webapp-b9fd2.firebasestorage.app",
  messagingSenderId: "482282247394",
  appId: "1:482282247394:web:2ff9d304ac6d6f098dfabb"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-33115df2-55d6-426e-b3b7-0a0a09fcb3d3");

export const subscribeToConfig = (callback: (data: any) => void) => {
  return onSnapshot(doc(db, "config", "global"), (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  });
};

export const updateConfig = async (data: any) => {
  await setDoc(doc(db, "config", "global"), data, { merge: true });
};

