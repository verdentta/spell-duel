
# Spell Duel

A fun, real-time multiplayer spelling game inspired by Skribbl.io—challenge friends or play solo to see who is the best at spelling! Perfect for classrooms, ESL learners, or anyone who loves a friendly competition.

Check out the Demo Vid: https://www.youtube.com/watch?v=rB9vLTd4T5c&ab_channel=MyLifesAMeme

---

## ✨ Features

- Multiplayer lobby creation and invites
- Timed spelling rounds with voice audio
- Podium finish and score review
- Custom word lists and multiple difficulty levels
- Animated avatars (DiceBear) and sound effects
- Host can control game settings (rounds, time, difficulty)

---

## 🛠️ Tech Stack

- **Frontend:** React
- **Backend:** Node.js + Express + Socket.io
- **Avatar Service:** DiceBear (run locally)
- **Styling:** CSS
- **Audio:** MP3 + browser TTS

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (includes npm)

---

### 1. Clone the repository

```bash
git clone https://github.com/your-username/spell-duel.git
cd spell-duel
```

---

### 2. Install dependencies

Install dependencies separately in each project folder:

```bash
cd client
npm install

cd ../server
npm install

cd ../dicebear-api
npm install
```

---

### 3. Run the applications

You will need **three terminal windows/tabs** (one for each service):

#### Start the React client:
```bash
cd client
npm start
```

#### Start the server:
```bash
cd server
node index.js
```

#### Start the DiceBear avatar API:
```bash
cd dicebear-api
npm start
```

---

### 4. Open the app in your browser

Go to [http://localhost:3000](http://localhost:3000) to play Spell Duel.

---

## 📦 Project Structure

```
spell-duel/
├── client/         # React frontend
├── server/         # Node.js + Socket.io backend
├── dicebear-api/   # Local avatar generation API
├── .gitignore
├── README.md
```

---

## 📝 Notes

- All three apps must be running for Spell Duel to work.
- Create a lobby and invite friends using the shareable link.
- For best audio experience, use Chrome or Firefox.

---

## 👨‍💻 Author

- Built by Romeo Paul
- Contact: discord -> zatchxdxd  
- [GitHub](https://github.com/verdentta)

---

## 🚫 License

Copyright © 2025 Romeo Paul  
All rights reserved.

You may not use, copy, modify, or distribute any part of this project without explicit written permission from the author.
