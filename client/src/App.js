import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const socket = io("http://localhost:5000");

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("General");
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [roomUsers, setRoomUsers] = useState([]);
  const [file, setFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef(null);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    socket.on("connect", () => console.log("Connected:", socket.id));

    socket.on("roomMessage", (data) => {
      setChat((prev) => [...prev, data]);
      if (data.username !== username) {
        setUnreadCount((count) => count + 1);
        audioRef.current?.play();
        showBrowserNotification(data);
      }
    });

    socket.on("messageReadUpdate", ({ id }) => {
      setChat((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, status: "read" } : msg))
      );
    });

    socket.on("receiveFile", (data) => {
      setChat((prev) => [...prev, { ...data, isFile: true }]);
    });

    socket.on("messageReactionUpdate", ({ id, reaction }) => {
      setChat((prev) =>
        prev.map((msg) =>
          msg.id === id ? { ...msg, reaction } : msg
        )
      );
    });

    socket.on("updateRoomUsers", (users) => setRoomUsers(users));

    socket.on("searchResults", (results) => setChat(results));

    socket.on("olderMessages", (older) => {
      setChat((prev) => [...older, ...prev]);
    });

    return () => {
      socket.off("roomMessage");
      socket.off("messageReadUpdate");
      socket.off("receiveFile");
      socket.off("messageReactionUpdate");
      socket.off("updateRoomUsers");
      socket.off("searchResults");
      socket.off("olderMessages");
    };
  }, [username]);

  useEffect(() => {
    if (joined) {
      const unread = chat.filter(
        (msg) => msg.username !== username && msg.status === "delivered"
      );
      unread.forEach((msg) => {
        socket.emit("messageRead", { id: msg.id, room });
      });
      setUnreadCount(0);
    }
  }, [chat, joined,room,username]);

  useEffect(() => {
    chatBoxRef.current?.scrollTo(0, chatBoxRef.current.scrollHeight);
  }, [chat]);

  const handleJoin = () => {
    if (username.trim()) {
      socket.emit("joinRoom", { username, room });
      setJoined(true);
      Notification.requestPermission();
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      const timestamp = new Date().toLocaleTimeString();
      const id = uuidv4();
      socket.emit("roomMessage", { id, username, room, text: message, timestamp });
      setChat((prev) => [
        ...prev,
        { id, username, text: message, timestamp, status: "delivered" }
      ]);
      setMessage("");
    }
  };

  const sendFile = () => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileData = reader.result;
        const timestamp = new Date().toLocaleTimeString();
        socket.emit("fileMessage", {
          username,
          room,
          fileData,
          fileType: file.type,
          timestamp
        });
        setFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const reactToMessage = (id, reaction) => {
    socket.emit("reactMessage", { id, reaction, room });
  };

  const searchMessages = () => {
    socket.emit("searchMessages", { room, query: searchQuery });
  };

  const loadOlderMessages = () => {
    socket.emit("loadOlderMessages", { room, offset: 0 });
  };

  const showBrowserNotification = (msg) => {
    if (Notification.permission === "granted") {
      new Notification(`${msg.username} says:`, { body: msg.text });
    }
  };

    return (
      <div style={{ padding: "1rem", fontFamily: "Arial", maxWidth: "600px", margin: "auto" }}>
        <h2>Chat Room: {room}</h2>
        <audio ref={audioRef} src="https://www.soundjay.com/button/sounds/button-3.mp3" preload="auto" />
        {!joined ? (
          <div>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
            <select value={room} onChange={(e) => setRoom(e.target.value)}>
              <option value="General">General</option>
              <option value="Sports">Sports</option>
              <option value="Tech">Tech</option>
            </select>
            <button onClick={handleJoin}>Join</button>
          </div>
        ) : (
          <>
            <div>
              <strong>Online Users:</strong> <span>{roomUsers.length}</span>
              <button style={{ marginLeft: "0.5rem" }} onClick={() => { socket.emit("leaveRoom", { username, room }); setJoined(false); }}>
                Leave
              </button>
            </div>
  
            <div style={{ marginTop: "0.5rem" }}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages"
                style={{ marginRight: "0.5rem" }}
              />
              <button onClick={searchMessages}>Search</button>
              <button style={{ marginLeft: "0.5rem" }} onClick={loadOlderMessages}>Load older</button>
            </div>
  
            <div
              ref={chatBoxRef}
              style={{
                height: "300px",
                overflowY: "auto",
                border: "1px solid #ccc",
                padding: "0.5rem",
                marginTop: "0.5rem",
                borderRadius: "4px",
                background: "#fafafa"
              }}
            >
              {chat.map((msg) => (
                <div
                  key={msg.id || msg.timestamp}
                  style={{
                    marginBottom: "0.5rem",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    background: msg.username === username ? "#e6ffe6" : "#ffffff",
                    border: "1px solid #eee"
                  }}
                >
                  <div style={{ fontSize: "0.85rem", color: "#333", marginBottom: "0.25rem" }}>
                    <strong>{msg.username}</strong>{" "}
                    <span style={{ fontSize: "0.75rem", color: "#888" }}>{msg.timestamp}</span>
                  </div>
  
                  {msg.isFile ? (
                    <div>
                      {msg.fileType && msg.fileType.startsWith("image/") ? (
                        <img src={msg.fileData} alt="uploaded" style={{ maxWidth: "100%" }} />
                      ) : (
                        <a href={msg.fileData} download>
                          Download file
                        </a>
                      )}
                    </div>
                  ) : (
                    <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                  )}
  
                  <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#666" }}>
                    <span>{msg.status}</span>
                    {msg.reaction && <span style={{ marginLeft: "0.5rem" }}>· {msg.reaction}</span>}
                    <button style={{ marginLeft: "0.5rem" }} onClick={() => reactToMessage(msg.id, "👍")}>👍</button>
                    {msg.username !== username && msg.status === "delivered" && (
                      <button
                        style={{ marginLeft: "0.5rem" }}
                        onClick={() => socket.emit("messageRead", { id: msg.id, room })}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
  
            <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message"
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                style={{ flex: 1 }}
              />
              <input type="file" onChange={(e) => setFile(e.target.files[0])} />
              <button onClick={sendMessage}>Send</button>
              <button onClick={sendFile} disabled={!file}>Send File</button>
              {unreadCount > 0 && <span style={{ marginLeft: "0.5rem", color: "red" }}>Unread: {unreadCount}</span>}
            </div>
          </>
        )}
      </div>
    );
  }
    
  export default App;