const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const lobbies = {};  // Structure: { lobbyCode: { users, hostId, currentWord, round, timerId } }

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_lobby', ({ lobbyCode, screenName }) => {
    socket.join(lobbyCode);

    if (!lobbies[lobbyCode]) {
      lobbies[lobbyCode] = {
        users: [],
        hostId: socket.id,
        currentWord: '',
        round: 0,
        timerId: null
      };
      console.log(`${screenName} created lobby ${lobbyCode}`);
    }

    lobbies[lobbyCode].users.push({
      id: socket.id,
      name: screenName,
      score: 0,
      correctThisRound: false
    });

    io.to(lobbyCode).emit('lobby_users', {
      users: lobbies[lobbyCode].users,
      hostId: lobbies[lobbyCode].hostId
    });
  });

  socket.on('start_game', async ({ lobbyCode }) => {
    const lobby = lobbies[lobbyCode];
    if (lobby && lobby.hostId === socket.id) {
      lobby.users.forEach(u => {
        u.score = 0;
        u.correctThisRound = false;
      });
      lobby.round = 0;
      lobby.currentWord = '';

      io.to(lobbyCode).emit('lobby_users', {
        users: lobby.users,
        hostId: lobby.hostId
      });

      startNewRound(lobbyCode);
    }
  });

  socket.on('submit_guess', ({ lobbyCode, guess }) => {
    const lobby = lobbies[lobbyCode];
    if (lobby && lobby.currentWord) {
      const correct = guess.toLowerCase() === lobby.currentWord;
      const user = lobby.users.find(u => u.id === socket.id);

      if (correct && user && !user.correctThisRound) {
        user.score += 10;
        user.correctThisRound = true;

        io.to(lobbyCode).emit('lobby_users', {
          users: lobby.users,
          hostId: lobby.hostId
        });

        io.to(socket.id).emit('correct_guess', { name: user.name });

        // ✅ Check if all users spelled it correctly
        const allCorrect = lobby.users.every(u => u.correctThisRound);

        if (allCorrect) {
          console.log(`All users spelled the word correctly, skipping timer.`);

          if (lobby.timerId) {
            clearTimeout(lobby.timerId);
            lobby.timerId = null;
          }

          io.to(lobbyCode).emit('game_ended', {
            correctGuesser: user.name,
            word: lobby.currentWord
          });

          const savedWord = lobby.currentWord;
          lobby.currentWord = '';

          setTimeout(() => {
            startNewRound(lobbyCode);
          }, 5000); // Show word for 5 seconds before next round
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
        io.to(lobbyCode).emit('lobby_users', {
          users: lobby.users,
          hostId: lobby.hostId
        });
      }
    }
  });
});

async function startNewRound(lobbyCode) {
  const lobby = lobbies[lobbyCode];
  if (!lobby) return;

  if (lobby.timerId) clearTimeout(lobby.timerId);

  if (lobby.round >= 10) {
    io.to(lobbyCode).emit('game_over');
    lobby.currentWord = '';
    return;
  }

  try {
    const res = await fetch('https://random-word-api.herokuapp.com/word?number=1');
    const data = await res.json();
    const randomWord = data[0].toLowerCase();

    lobby.currentWord = randomWord;
    lobby.round += 1;

    lobby.users.forEach(u => u.correctThisRound = false);

    io.to(lobbyCode).emit('lobby_users', {
      users: lobby.users,
      hostId: lobby.hostId
    });

    io.to(lobbyCode).emit('game_started', {
      word: randomWord,
      round: lobby.round
    });

    lobby.timerId = setTimeout(() => {
      const firstCorrect = lobby.users.find(u => u.correctThisRound) || null;
      io.to(lobbyCode).emit('game_ended', {
        correctGuesser: firstCorrect ? firstCorrect.name : null,
        word: lobby.currentWord
      });

      const savedWord = lobby.currentWord;
      lobby.currentWord = '';

      setTimeout(() => {
        startNewRound(lobbyCode);
      }, 5000); // Word revealed for 5 seconds
    }, 20000);

  } catch (err) {
    console.error("Failed to fetch random word:", err);
  }
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
