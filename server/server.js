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