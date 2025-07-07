const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

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
        timerId: null,
        maxRounds: 10,
        customWords: []
      };
      console.log(`${screenName} created lobby ${lobbyCode}`);
    }

    lobbies[lobbyCode].users.push({
      id: socket.id,
      name: screenName,
      score: 0,
      correctThisRound: false
    });

    emitLobbyUpdate(lobbyCode);
  });

  socket.on('set_rounds', ({ lobbyCode, maxRounds }) => {
    const lobby = lobbies[lobbyCode];
    if (lobby && socket.id === lobby.hostId) {
      lobby.maxRounds = maxRounds;
      emitLobbyUpdate(lobbyCode);
    }
  });

  socket.on('set_custom_words', ({ lobbyCode, words }) => {
    const lobby = lobbies[lobbyCode];
    if (lobby && socket.id === lobby.hostId) {
      lobby.customWords = Array.isArray(words) ? words : [];
      emitLobbyUpdate(lobbyCode);
    }
  });

  socket.on('start_game', ({ lobbyCode }) => {
    const lobby = lobbies[lobbyCode];
    if (lobby && socket.id === lobby.hostId) {
      lobby.users.forEach(u => {
        u.score = 0;
        u.correctThisRound = false;
      });
      lobby.round = 0;
      lobby.currentWord = '';

      emitLobbyUpdate(lobbyCode);
      startNewRound(lobbyCode);
    }
  });

  socket.on('submit_guess', ({ lobbyCode, guess }) => {
    const lobby = lobbies[lobbyCode];
    if (lobby && lobby.currentWord) {
      const user = lobby.users.find(u => u.id === socket.id);
      if (user && !user.correctThisRound && guess.toLowerCase() === lobby.currentWord) {
        user.score += 10;
        user.correctThisRound = true;

        emitLobbyUpdate(lobbyCode);
        io.to(socket.id).emit('correct_guess', { name: user.name });

        if (lobby.users.every(u => u.correctThisRound)) {
          if (lobby.timerId) clearTimeout(lobby.timerId);
          endRound(lobbyCode);
        }
      }
    }
  });

  socket.on('end_game', ({ lobbyCode }) => {
    const lobby = lobbies[lobbyCode];
    if (lobby && socket.id === lobby.hostId) {
      endGame(lobbyCode);
    }
  });

  socket.on('disconnect', () => {
    for (const lobbyCode in lobbies) {
      const lobby = lobbies[lobbyCode];
      lobby.users = lobby.users.filter(u => u.id !== socket.id);

      if (lobby.hostId === socket.id && lobby.users.length > 0) {
        lobby.hostId = lobby.users[0].id;
      }

      if (lobby.users.length === 0) {
        delete lobbies[lobbyCode];
      } else {
        emitLobbyUpdate(lobbyCode);
      }
    }
  });
});

function emitLobbyUpdate(lobbyCode) {
  const lobby = lobbies[lobbyCode];
  if (lobby) {
    io.to(lobbyCode).emit('lobby_users', {
      users: lobby.users,
      hostId: lobby.hostId,
      maxRounds: lobby.customWords.length > 0 ? lobby.customWords.length : lobby.maxRounds
    });
  }
}

async function startNewRound(lobbyCode) {
  const lobby = lobbies[lobbyCode];
  if (!lobby) return;

  if (lobby.timerId) clearTimeout(lobby.timerId);

  const totalRounds = lobby.customWords.length > 0 ? lobby.customWords.length : lobby.maxRounds;
  if (lobby.round >= totalRounds) {
    io.to(lobbyCode).emit('game_over');
    lobby.currentWord = '';
    return;
  }

  let randomWord;
  if (lobby.customWords.length > 0) {
    randomWord = lobby.customWords[lobby.round].toLowerCase();
  } else {
    try {
      const res = await fetch('https://random-word-api.herokuapp.com/word?number=1');
      const data = await res.json();
      randomWord = data[0].toLowerCase();
    } catch (err) {
      console.error("Failed to fetch random word:", err);
      return;
    }
  }

  lobby.currentWord = randomWord;
  lobby.round += 1;
  lobby.users.forEach(u => u.correctThisRound = false);

  emitLobbyUpdate(lobbyCode);

  io.to(lobbyCode).emit('game_started', {
    word: randomWord,
    round: lobby.round
  });

  lobby.timerId = setTimeout(() => {
    endRound(lobbyCode);
  }, 20000);
}

function endRound(lobbyCode) {
  const lobby = lobbies[lobbyCode];
  if (!lobby) return;

  io.to(lobbyCode).emit('game_ended', {
    correctGuesser: null,
    word: lobby.currentWord
  });

  lobby.currentWord = '';
  lobby.timerId = setTimeout(() => {
    startNewRound(lobbyCode);
  }, 5000);
}

function endGame(lobbyCode) {
  const lobby = lobbies[lobbyCode];
  if (!lobby) return;

  if (lobby.timerId) clearTimeout(lobby.timerId);

  io.to(lobbyCode).emit('game_over');
  lobby.currentWord = '';
  lobby.round = 0;
}

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
