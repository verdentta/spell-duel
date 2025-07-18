const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


//wordlists that were generated so it's more efficient at pulling certain words at certain lengths
const easyWords = require('./wordlists/easy_definitions.json');
const mediumWords = require('./wordlists/medium_definitions.json');
const hardWords = require('./wordlists/hard_definitions.json');
const allWords = require('./wordlists/all_definitions.json');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const lobbies = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_lobby', ({ lobbyCode, screenName }) => {
    socket.join(lobbyCode);

    if (!lobbies[lobbyCode]) {
      lobbies[lobbyCode] = {
        users: [],
        hostId: socket.id,
        currentWord: '',
        round: 0,
        maxRounds: 10,
        customWords: [],
        difficulty: 'All',
        timerId: null,
        roundTime: 20,
        testedWords: [] 
      };
    }

    lobbies[lobbyCode].users.push({
      id: socket.id,
      name: screenName,
      score: 0,
      correctThisRound: false
    });

    io.to(lobbyCode).emit('lobby_users', {
      users: lobbies[lobbyCode].users,
      hostId: lobbies[lobbyCode].hostId,
      maxRounds: lobbies[lobbyCode].maxRounds
    });
  });

  socket.on('set_rounds', ({ lobbyCode, maxRounds }) => {
  const lobby = lobbies[lobbyCode];
  if (lobby && lobby.hostId === socket.id) {
    const capped = Math.min(100, Math.max(1, maxRounds));
    lobby.maxRounds = capped;

    io.to(lobbyCode).emit('lobby_users', {
      users: lobby.users,
      hostId: lobby.hostId,
      maxRounds: lobby.maxRounds
    });
  }
});

socket.on('set_round_time', ({ lobbyCode, seconds }) => {
  const lobby = lobbies[lobbyCode];
  if (!lobby || lobby.hostId !== socket.id) return;

  const capped = Math.min(300, Math.max(5, seconds)); // allow 5–300s
  lobby.roundTime = capped;

  // Optional: broadcast updated time to others
  io.to(lobbyCode).emit('round_time_updated', { roundTime: capped });
});

  socket.on('set_custom_words', ({ lobbyCode, words }) => {
  const lobby = lobbies[lobbyCode];
  if (!lobby) return;

  const limitedWords = words.slice(0, 100).map(w => w.toLowerCase()); // normalize to lowercase
  lobby.customWords = limitedWords;

  // Only override maxRounds if there are custom words
  if (limitedWords.length > 0) {
    lobby.maxRounds = limitedWords.length;
  }

  io.to(lobbyCode).emit('lobby_users', {
    users: lobby.users,
    hostId: lobby.hostId,
    maxRounds: lobby.maxRounds
  });
});

  socket.on('set_difficulty', ({ lobbyCode, difficulty }) => {
    const lobby = lobbies[lobbyCode];
    if (lobby && lobby.hostId === socket.id) {
      lobby.difficulty = difficulty;
    }
  });

  socket.on('start_game', ({ lobbyCode }) => {
    const lobby = lobbies[lobbyCode];
    if (lobby && lobby.hostId === socket.id) {
      lobby.users.forEach(u => {
        u.score = 0;
        u.correctThisRound = false;
      });
      lobby.round = 0;
      lobby.currentWord = '';
      lobby.testedWords = [];
      startNewRound(lobbyCode);
    }
  });

  socket.on('submit_guess', ({ lobbyCode, guess }) => {
    const lobby = lobbies[lobbyCode];
    if (lobby && lobby.currentWord) {
      const user = lobby.users.find(u => u.id === socket.id);
      if (guess.toLowerCase() === lobby.currentWord && user && !user.correctThisRound) {
        user.score += 10;
        user.correctThisRound = true;
        io.to(lobbyCode).emit('lobby_users', {
          users: lobby.users,
          hostId: lobby.hostId,
          maxRounds: lobby.maxRounds
        });
        io.to(socket.id).emit('correct_guess', { name: user.name });

        const allCorrect = lobby.users.every(u => u.correctThisRound);
        if (allCorrect) {
          clearTimeout(lobby.timerId);
          endRound(lobbyCode);
        }
      }
    }
  });

  socket.on('end_game', ({ lobbyCode }) => {
    const lobby = lobbies[lobbyCode];
    if (lobby && lobby.hostId === socket.id) {
      endGame(lobbyCode);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`A user disconnected: ${socket.id} | Reason: ${reason}`);

    for (const lobbyCode in lobbies) {
      const lobby = lobbies[lobbyCode];
      lobby.users = lobby.users.filter(u => u.id !== socket.id);

      if (lobby.hostId === socket.id && lobby.users.length > 0) {
        lobby.hostId = lobby.users[0].id;
      }
      if (lobby.users.length === 0) {
        delete lobbies[lobbyCode];
      } else {
        io.to(lobbyCode).emit('lobby_users', {
          users: lobby.users,
          hostId: lobby.hostId,
          maxRounds: lobby.maxRounds
        });
      }
    }
  });
});

async function startNewRound(lobbyCode) {
  const lobby = lobbies[lobbyCode];
  if (!lobby) return;

  if (lobby.timerId) clearTimeout(lobby.timerId);

const isCustomMode = lobby.customWords.length > 0;
const roundsLimit = isCustomMode ? lobby.customWords.length : lobby.maxRounds;

if (lobby.round >= roundsLimit) {
  io.to(lobbyCode).emit('game_over', {
    testedWords: lobby.testedWords || [],
    isCustomMode: lobby.customWords.length > 0
  });
  lobby.currentWord = '';
  return;
}

  let word = '';
  if (lobby.customWords.length > 0 && lobby.round < lobby.customWords.length) {
  word = lobby.customWords[lobby.round];
} else {
  lobby.customWords = []; // Reset just in case
  let wordList = allWords;
  switch (lobby.difficulty) {
    case 'Easy': wordList = easyWords; break;
    case 'Medium': wordList = mediumWords; break;
    case 'Hard': wordList = hardWords; break;
  }

  const wordKeys = Object.keys(wordList);
  word = wordKeys[Math.floor(Math.random() * wordKeys.length)];
}

  lobby.testedWords.push({ word });

  lobby.currentWord = word;
  lobby.round += 1;
  lobby.users.forEach(u => u.correctThisRound = false);

  io.to(lobbyCode).emit('lobby_users', {
    users: lobby.users,
    hostId: lobby.hostId,
    maxRounds: lobby.maxRounds
  });

  io.to(lobbyCode).emit('game_started', {
  word,
  round: lobby.round,
  roundTime: lobby.roundTime // send it to the client
});

  lobby.timerId = setTimeout(() => {
    endRound(lobbyCode);
  }, lobby.roundTime * 1000);
}

async function endRound(lobbyCode) {
  const lobby = lobbies[lobbyCode];
  if (!lobby) return;

  const firstCorrect = lobby.users.find(u => u.correctThisRound) || null;
  const word = lobby.currentWord;

  const wordList =
  lobby.difficulty === 'Easy' ? easyWords :
  lobby.difficulty === 'Medium' ? mediumWords :
  lobby.difficulty === 'Hard' ? hardWords :
  allWords;

  const rawDefinition = wordList[word] || "Definition not available.";
  const definition = rawDefinition.replace(/^"|"$/g, '');

  if (lobby.testedWords.length > 0) {
    lobby.testedWords[lobby.testedWords.length - 1].definition = definition;
  }

  io.to(lobbyCode).emit('game_ended', {
    correctGuesser: firstCorrect ? firstCorrect.name : null,
    word,
    definition,
    isCustom: lobby.customWords.includes(word) // set this flag so it doesn't show the definition
  });

  setTimeout(() => {
    startNewRound(lobbyCode);
  }, 5000);

  lobby.currentWord = '';
}

function endGame(lobbyCode) {
  const lobby = lobbies[lobbyCode];
  if (!lobby) return;

  if (!lobby.testedWords) {
    lobby.testedWords = [];  
  }

  if (lobby.timerId) clearTimeout(lobby.timerId);

  io.to(lobbyCode).emit('game_over', {
    testedWords: lobby.testedWords,
    isCustomMode: lobby.customWords.length > 0
  });

  lobby.currentWord = '';
  lobby.round = 0;
}

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
