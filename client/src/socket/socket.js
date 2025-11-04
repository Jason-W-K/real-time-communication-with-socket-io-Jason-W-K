import { io } from "socket.io-client";

// ✅ Force polling and disable autoConnect
const socket = io("http://localhost:5000", {
  transports: ["polling"],
  autoConnect: false,       // 👈 Prevent premature handshake
  forceNew: true,           // 👈 Ensure fresh connection
  reconnectionAttempts: 3,
  timeout: 5000
});

// ✅ Connect manually
socket.connect();

// ✅ Log connection errors
socket.on("connect_error", (err) => {
  console.error("Connection error:", err.message);
});

export default socket;