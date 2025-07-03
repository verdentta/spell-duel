const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for now, restrict later for production
    methods: ["GET", "POST"]
  }
});

// Lobby tracking (for now, in-memory)
const lobbies = {}; 

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_lobby', ({ lobbyCode, screenName }) => {
    socket.join(lobbyCode);
    console.log(`${screenName} joined lobby ${lobbyCode}`);

    // Track users per lobby
    if (!lobbies[lobbyCode]) {
      lobbies[lobbyCode] = [];
    }
    lobbies[lobbyCode].push({ id: socket.id, name: screenName });

    // Send updated user list to the lobby
    io.to(lobbyCode).emit('lobby_users', lobbies[lobbyCode]);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);

    // Remove user from all lobbies
    for (const lobbyCode in lobbies) {
      lobbies[lobbyCode] = lobbies[lobbyCode].filter(user => user.id !== socket.id);
      
      // Notify others if lobby still has users
      io.to(lobbyCode).emit('lobby_users', lobbies[lobbyCode]);
    }
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
