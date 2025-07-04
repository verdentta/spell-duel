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

const lobbies = {}; // { lobbyCode: { users, hostId, currentWord, round, timerId } }

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_lobby', ({ lobbyCode, screenName }) => {
    socket.join(lobbyCode);

    if (!lobbies[lobbyCode]) {
      lobbies[lobbyCode] = { users: [], hostId: socket.id, currentWord: '', round: 0, timerId: null };
      console.log(`${screenName} created lobby ${lobbyCode}`);
    }

    lobbies[lobbyCode].users.push({ id: socket.id, name: screenName, score: 0, correctThisRound: false });
    console.log(`${screenName} joined lobby ${lobbyCode}`);

    io.to(lobbyCode).emit('lobby_users', {
      users: lobbies[lobbyCode].users,
      hostId: lobbies[lobbyCode].hostId
    });
  });

  socket.on('start_game', async ({ lobbyCode }) => {
  const lobby = lobbies[lobbyCode];
  if (lobby && lobby.hostId === socket.id) {
    // Reset user scores and flags
    lobby.users.forEach(u => {
      u.score = 0;
      u.correctThisRound = false;
    });

    lobby.round = 0;
    lobby.currentWord = '';

    // Send updated users immediately
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

      if (correct) {
        const user = lobby.users.find(u => u.id === socket.id);
        if (user && !user.correctThisRound) {
          user.score += 10;
          user.correctThisRound = true;

          io.to(lobbyCode).emit('lobby_users', {
            users: lobby.users,
            hostId: lobby.hostId
          });

          io.to(socket.id).emit('correct_guess', { name: user.name });
          console.log(`${user.name} spelled the word correctly and earned 10 points.`);
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
    console.log('A user disconnected:', socket.id);

    for (const lobbyCode in lobbies) {
      const lobby = lobbies[lobbyCode];
      lobby.users = lobby.users.filter(user => user.id !== socket.id);

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

  if (lobby.timerId) {
    clearTimeout(lobby.timerId);
  }

  if (lobby.round >= 10) {
    io.to(lobbyCode).emit('game_over');
    console.log(`Game over in lobby ${lobbyCode}`);
    lobby.currentWord = '';
    return;
  }

  try {
    const res = await fetch('https://random-word-api.herokuapp.com/word?number=1');
    const data = await res.json();
    const randomWord = data[0].toLowerCase();

    lobby.currentWord = randomWord;
    lobby.round += 1;

    // Reset correct flags for new round
    lobby.users.forEach(u => u.correctThisRound = false);

    // Emit updated user list so frontends refresh
    io.to(lobbyCode).emit('lobby_users', {
      users: lobby.users,
      hostId: lobby.hostId
    });

    io.to(lobbyCode).emit('game_started', { word: randomWord, round: lobby.round });

    console.log(`Round ${lobby.round} started in lobby ${lobbyCode} with word: ${randomWord}`);

    lobby.timerId = setTimeout(() => {
  const firstCorrect = lobby.users.find(u => u.correctThisRound) || null;
  io.to(lobbyCode).emit('game_ended', { correctGuesser: firstCorrect ? firstCorrect.name : null });
  lobby.currentWord = '';
  startNewRound(lobbyCode);
}, 5000);  

  } catch (err) {
    console.error("Failed to fetch random word:", err);
  }
}

function endGame(lobbyCode) {
  const lobby = lobbies[lobbyCode];
  if (!lobby) return;

  if (lobby.timerId) {
    clearTimeout(lobby.timerId);
    lobby.timerId = null;
  }

  io.to(lobbyCode).emit('game_over');
  console.log(`Game ended manually in lobby ${lobbyCode}`);

  lobby.currentWord = '';
  lobby.round = 0;
}


const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
