import { useCallback, useEffect, useRef, useState } from "react";

export default function App() {
  const [roomCode, setRoomCode] = useState<string | undefined>(undefined);
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<string[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const setCode = useCallback((code: string, name: string) => {
    window.history.pushState({}, "", `/${code}`);
    setRoomCode(code);
    setDisplayName(name);
  }, []);

  useEffect(() => {
    const code = window.location.pathname.split("/").at(-1);

    if (code) {
      setRoomCode(code);
    } else {
      // Show modal
      (
        document.getElementById("chat_room_code_modal") as unknown as {
          showModal: () => void;
        }
      ).showModal();
    }
  }, []);

  useEffect(() => {
    if (roomCode && displayName) {
      const ws = new WebSocket("ws://localhost:8080");

      ws.onopen = () => {
        console.log("Connected to WebSocket server");
        ws.send(
          JSON.stringify({
            type: "join",
            room: roomCode,
            displayName: displayName,
          }),
        );
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log(message);
        if (message.type === "message") {
          setMessages((prev) => [
            ...prev,
            `${message.displayName}: ${message.text}`,
          ]);
        } else if (message.type === "user-joined") {
          setMessages((prev) => [
            ...prev,
            `${message.displayName} joined the room`,
          ]);
        } else if (message.type === "user-left") {
          setMessages((prev) => [
            ...prev,
            `${message.displayName} left the room`,
          ]);
        }
      };

      ws.onclose = () => {
        console.log("Disconnected from WebSocket server");
      };

      setSocket(ws);

      return () => {
        ws.close();
      };
    }
  }, [roomCode, displayName]);

  const sendMessage = (message: string) => {
    if (socket && roomCode) {
      socket.send(
        JSON.stringify({ type: "message", text: message, displayName }),
      );
    }
  };

  return (
    <>
      <ChatRoomCodeModal callback={setCode} />
      <main className="p-4">
        <h1 className="text-xl font-bold">Chat Room</h1>
        <h2 className="text-lg">Room Code: {roomCode ?? "undefined"}</h2>
        <h3 className="text-lg">Display Name: {displayName ?? "undefined"}</h3>
        <ChatWindow messages={messages} onSendMessage={sendMessage} />
      </main>
    </>
  );
}

function ChatRoomCodeModal(props: {
  callback: (code: string, name: string) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() && name.trim()) {
      props.callback(code, name);
      (
        document.getElementById("chat_room_code_modal") as unknown as {
          close: () => void;
        }
      ).close();
    }
  };

  return (
    <dialog id="chat_room_code_modal" className="modal">
      <div className="modal-box h-[30%]">
        <form
          method="dialog"
          className="w-full h-full flex flex-col justify-center items-center gap-4"
          onSubmit={handleSubmit}
        >
          <input
            name="code"
            className="input input-bordered w-full max-w-xs"
            placeholder="Enter room code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <input
            name="name"
            className="input input-bordered w-full max-w-xs"
            placeholder="Enter your display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Join Room
          </button>
        </form>
      </div>
    </dialog>
  );
}

function ChatWindow(props: {
  messages: string[];
  onSendMessage: (message: string) => void;
}) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [props.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      props.onSendMessage(message);
      setMessage("");
    }
  };

  return (
    <div className="mt-4">
      <div className="chat-window border rounded-lg p-4 h-64 overflow-y-auto">
        {props.messages.map((msg, index) => (
          <div key={index} className="chat-message mb-2">
            {msg}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSendMessage}
        className="mt-4 flex items-center gap-2"
      >
        <input
          type="text"
          className="input input-bordered flex-grow"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          Send
        </button>
      </form>
    </div>
  );
}
