// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyASXexdZXN7mE1FAPuI1EG7clV-pDhGS14",
  authDomain: "tic-tac-toe-multiplayer-eacd9.firebaseapp.com",
  databaseURL: "https://tic-tac-toe-multiplayer-eacd9-default-rtdb.firebaseio.com",
  projectId: "tic-tac-toe-multiplayer-eacd9",
  storageBucket: "tic-tac-toe-multiplayer-eacd9.firebasestorage.app",
  messagingSenderId: "289073556048",
  appId: "1:289073556048:web:33b780d457e7a9ef28bf55",
  measurementId: "G-SJ5LDFKE4E"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Export for use in main file
window.database = database;
