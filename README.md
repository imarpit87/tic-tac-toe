# Tic Tac Toe - Real-Time Multiplayer Game

A modern Tic Tac Toe game with AI opponent and real-time multiplayer capabilities.

## 🎮 Features

- **AI Mode**: Play against computer with 3 difficulty levels
- **Local Multiplayer**: Play with friends on the same device
- **Real-Time Multiplayer**: Play with friends online from different devices
- **Player Profiles**: Custom names and avatars
- **Multiple Themes**: Light, Dark, and Kids themes
- **Sound Effects**: Immersive audio feedback
- **Mobile Responsive**: Works perfectly on all devices

## 🌐 Real-Time Multiplayer Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it: `tic-tac-toe-multiplayer`
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Realtime Database

1. In Firebase Console, go to "Realtime Database"
2. Click "Create Database"
3. Choose "Start in test mode" (for development)
4. Select a location close to your users
5. Click "Done"

### Step 3: Get Firebase Configuration

1. Click the gear icon → "Project settings"
2. Scroll down to "Your apps"
3. Click the web icon (</>)
4. Register app: `tic-tac-toe-web`
5. Copy the config object

### Step 4: Update Firebase Config

1. Open `firebase-config.js`
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### Step 5: Deploy Your Game

1. Push your code to GitHub
2. Enable GitHub Pages in your repository settings
3. Your game will be live at: `https://yourusername.github.io/tic-tac-toe/`

## 🎯 How to Play Real-Time Multiplayer

### For Host (Room Creator):
1. Click "Play with Friend"
2. Enter your name and choose avatar
3. Click "🌐 Create Online Room"
4. Share the room code with your friend
5. Wait for friend to join
6. Start playing!

### For Friend (Joiner):
1. Click "Play with Friend"
2. Enter your name and choose avatar
3. Enter the room code from your friend
4. Click "🚀 Join Room"
5. Start playing!

## 🔧 Technical Details

### Real-Time Features:
- **Firebase Realtime Database**: Stores game state and player data
- **Real-time synchronization**: Game updates instantly across devices
- **Room management**: Automatic room creation and joining
- **Player tracking**: Shows online status and player information
- **Turn management**: Prevents invalid moves and ensures proper turn order

### Security Rules (Optional):
For production, update Firebase security rules:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['code', 'status', 'board'])"
      }
    }
  }
}
```

## 📱 Mobile Support

The game is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- All modern browsers

## 🎨 Themes

- **Light Theme**: Clean, professional look
- **Dark Theme**: Easy on the eyes
- **Kids Theme**: Bright, playful colors

## 🔊 Sound Effects

- Click sounds for moves
- Win celebration sounds
- Draw game sounds
- Toggle to enable/disable

## 🚀 Deployment

The game is ready to deploy on:
- GitHub Pages (current)
- Netlify
- Vercel
- Firebase Hosting
- Any static hosting service

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Feel free to contribute by:
- Reporting bugs
- Suggesting features
- Submitting pull requests

## 📞 Support

If you need help with setup or have questions, please open an issue on GitHub.
