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
        maxRounds: 10,
        customWords: [],
        difficulty: 'All',
        timerId: null
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

  socket.on('set_custom_words', ({ lobbyCode, words }) => {
  const lobby = lobbies[lobbyCode];
  if (!lobby) return;

  const limitedWords = words.slice(0, 100); // limit to 100 words
  lobby.customWords = limitedWords;
  lobby.maxRounds = limitedWords.length;

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

  if (lobby.round >= (lobby.customWords.length || lobby.maxRounds)) {
    io.to(lobbyCode).emit('game_over');
    lobby.currentWord = '';
    return;
  }

  let word = '';
  if (lobby.customWords.length) {
    word = lobby.customWords[lobby.round].toLowerCase();
  } else {
    let validWord = '';
    while (!validWord) {
      const res = await fetch('https://random-word-api.herokuapp.com/word?number=1');
      const data = await res.json();
      const candidate = data[0].toLowerCase();

      const length = candidate.length;
      if (
        lobby.difficulty === 'Easy' && length >= 3 && length <= 4 ||
        lobby.difficulty === 'Medium' && length >= 5 && length <= 7 ||
        lobby.difficulty === 'Hard' && length >= 8 ||
        lobby.difficulty === 'All'
      ) {
        validWord = candidate;
      }
    }
    word = validWord;
  }

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
    round: lobby.round
  });

  lobby.timerId = setTimeout(() => {
    endRound(lobbyCode);
  }, 20000);
}

function endRound(lobbyCode) {
  const lobby = lobbies[lobbyCode];
  if (!lobby) return;
  const firstCorrect = lobby.users.find(u => u.correctThisRound) || null;

  io.to(lobbyCode).emit('game_ended', {
    correctGuesser: firstCorrect ? firstCorrect.name : null,
    word: lobby.currentWord
  });

  setTimeout(() => {
    startNewRound(lobbyCode);
  }, 5000);

  lobby.currentWord = '';
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
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
