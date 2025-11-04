<<<<<<< HEAD
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Socket.io server is running");
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const users = {}; // socket.id -> { username, room }
const usernames = {}; // username -> socket.id
const messages = {}; // room -> [messages]

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", ({ username, room }) => {
    users[socket.id] = { username, room };
    usernames[username] = socket.id;
    socket.join(room);

    if (!messages[room]) messages[room] = [];

    io.to(room).emit("roomMessage", {
      username: "System",
      text: `${username} joined the room`,
      timestamp: new Date().toLocaleTimeString()
    });

    const roomUsers = Object.values(users)
      .filter((u) => u.room === room)
      .map((u) => u.username);
    io.to(room).emit("updateRoomUsers", roomUsers);
  });

  socket.on("roomMessage", (msg) => {
    messages[msg.room].push(msg);
    io.to(msg.room).emit("roomMessage", { ...msg, status: "delivered" });
  });

  socket.on("messageRead", ({ id, room }) => {
    io.to(room).emit("messageReadUpdate", { id });
  });

  socket.on("fileMessage", ({ username, room, fileData, fileType, timestamp }) => {
    io.to(room).emit("receiveFile", { username, fileData, fileType, timestamp });
  });

  socket.on("reactMessage", ({ id, reaction, room }) => {
    io.to(room).emit("messageReactionUpdate", { id, reaction });
  });

  socket.on("searchMessages", ({ room, query }) => {
    const results = messages[room]?.filter(
      (msg) => msg.text?.toLowerCase().includes(query.toLowerCase())
    );
    socket.emit("searchResults", results || []);
  });

  socket.on("loadOlderMessages", ({ room, offset }) => {
    const chunk = messages[room]?.slice(offset, offset + 10) || [];
    socket.emit("olderMessages", chunk);
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      const { username, room } = user;
      delete usernames[username];
      delete users[socket.id];

      io.to(room).emit("roomMessage", {
        username: "System",
        text: `${username} left the room`,
        timestamp: new Date().toLocaleTimeString()
      });

      const roomUsers = Object.values(users)
        .filter((u) => u.room === room)
        .map((u) => u.username);
      io.to(room).emit("updateRoomUsers", roomUsers);
    }
  });
});

server.listen(5000, () => {
  console.log("Server listening on http://localhost:5000");
});
=======
// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users and messages
const users = {};
const messages = [];
const typingUsers = {};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining
  socket.on('user_join', (username) => {
    users[socket.id] = { username, id: socket.id };
    io.emit('user_list', Object.values(users));
    io.emit('user_joined', { username, id: socket.id });
    console.log(`${username} joined the chat`);
  });

  // Handle chat messages
  socket.on('send_message', (messageData) => {
    const message = {
      ...messageData,
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      timestamp: new Date().toISOString(),
    };
    
    messages.push(message);
    
    // Limit stored messages to prevent memory issues
    if (messages.length > 100) {
      messages.shift();
    }
    
    io.emit('receive_message', message);
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    if (users[socket.id]) {
      const username = users[socket.id].username;
      
      if (isTyping) {
        typingUsers[socket.id] = username;
      } else {
        delete typingUsers[socket.id];
      }
      
      io.emit('typing_users', Object.values(typingUsers));
    }
  });

  // Handle private messages
  socket.on('private_message', ({ to, message }) => {
    const messageData = {
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
    };
    
    socket.to(to).emit('private_message', messageData);
    socket.emit('private_message', messageData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (users[socket.id]) {
      const { username } = users[socket.id];
      io.emit('user_left', { username, id: socket.id });
      console.log(`${username} left the chat`);
    }
    
    delete users[socket.id];
    delete typingUsers[socket.id];
    
    io.emit('user_list', Object.values(users));
    io.emit('typing_users', Object.values(typingUsers));
  });
});

// API routes
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

app.get('/api/users', (req, res) => {
  res.json(Object.values(users));
});

// Root route
app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io }; 
>>>>>>> 474be929c7061edab2f8942c6b13d3fb6251e992
