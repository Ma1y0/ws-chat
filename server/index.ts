import WebSocket, { WebSocketServer } from "ws";

type User = {
  id: string;
  displayName: string;
  socket: WebSocket;
  room: string | null;
};

type ChatRoom = {
  name: string;
  users: Set<User>;
};

const PORT = 8080;

const users: Map<string, User> = new Map();
const chatRooms: Map<string, ChatRoom> = new Map();

const app = new WebSocketServer({ port: PORT });

console.log(`WebSocket server is running on ws://localhost:${PORT}`);

function broadcastToRoom(roomName: string, message: string) {
  const room = chatRooms.get(roomName);
  if (!room) return;

  room.users.forEach((user) => {
    user.socket.send(
      JSON.stringify({
        ...JSON.parse(message),
      }),
    );
  });
}

app.on("connection", (socket) => {
  const userId = crypto.randomUUID();
  const user: User = { id: userId, socket, room: null, displayName: "" };
  users.set(userId, user);

  console.log(`User connected: ${userId}:`);

  socket.send(
    JSON.stringify({ type: "welcome", userId, displayName: user.displayName }),
  );

  socket.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(message);

      switch (message.type) {
        case "join":
          const { room, displayName } = message;
          user.displayName = displayName;
          handleJoinRoom(user, room);
          break;

        case "message":
          handleMessage(user, message.text);
          break;

        default:
          console.error("Unknown message type:", message.type);
      }
    } catch (err) {
      console.error("Error parsing message:", err);
    }
  });

  socket.on("close", () => {
    console.log(`User disconnected: ${userId}`);
    handleLeaveRoom(user);
    users.delete(userId);
  });
});

function handleJoinRoom(user: User, roomName: string) {
  if (user.room) {
    handleLeaveRoom(user);
  }

  let room = chatRooms.get(roomName);
  if (!room) {
    room = { name: roomName, users: new Set() };
    chatRooms.set(roomName, room);
  }

  room.users.add(user);
  user.room = roomName;

  console.log(`User ${user.id} joined room: ${roomName}`);

  user.socket.send(
    JSON.stringify({
      type: "joined",
      room: roomName,
      displayName: user.displayName,
    }),
  );
  broadcastToRoom(
    roomName,
    JSON.stringify({
      type: "user-joined",
      userId: user.id,
      displayName: user.displayName,
    }),
  );
}

function handleLeaveRoom(user: User) {
  if (!user.room) return;

  const room = chatRooms.get(user.room);
  if (room) {
    room.users.delete(user);

    broadcastToRoom(
      user.room,
      JSON.stringify({ type: "user-left", userId: user.id }),
    );

    if (room.users.size === 0) {
      chatRooms.delete(user.room);
    }
  }

  user.room = null;
}

function handleMessage(user: User, text: string) {
  if (!user.room) {
    user.socket.send(
      JSON.stringify({ type: "error", message: "You are not in a room." }),
    );
    return;
  }

  console.log(`Message from ${user.id} in room ${user.room}: ${text}`);

  broadcastToRoom(
    user.room,
    JSON.stringify({
      type: "message",
      userId: user.id,
      text,
      displayName: user.displayName,
    }),
  );
}
