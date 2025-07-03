const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const lobbies = {}; // { lobbyCode: { users: [], hostId: '' } }

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_lobby', ({ lobbyCode, screenName }) => {
    socket.join(lobbyCode);

    if (!lobbies[lobbyCode]) {
      lobbies[lobbyCode] = { users: [], hostId: socket.id };
      console.log(`${screenName} created lobby ${lobbyCode}`);
    }

    lobbies[lobbyCode].users.push({ id: socket.id, name: screenName });
    console.log(`${screenName} joined lobby ${lobbyCode}`);

    io.to(lobbyCode).emit('lobby_users', {
      users: lobbies[lobbyCode].users,
      hostId: lobbies[lobbyCode].hostId
    });
  });

  socket.on('start_game', ({ lobbyCode }) => {
    const lobby = lobbies[lobbyCode];
    if (lobby && lobby.hostId === socket.id) {
      io.to(lobbyCode).emit('game_started');
      console.log(`Game started in lobby ${lobbyCode}`);
    }
  });

  socket.on('end_game', ({ lobbyCode }) => {
    const lobby = lobbies[lobbyCode];
    if (lobby && lobby.hostId === socket.id) {
      io.to(lobbyCode).emit('game_ended');
      console.log(`Game ended in lobby ${lobbyCode}`);
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

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
