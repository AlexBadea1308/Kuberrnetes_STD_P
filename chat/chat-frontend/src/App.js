import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showUsernameInput, setShowUsernameInput] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Cleanup la unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connectWebSocket = (username) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(process.env.REACT_APP_WEBSOCKET_URL || 'ws://20.73.153.84:30088/ws');
    
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    ws.onopen = () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
      ws.send(JSON.stringify({
        type: 'login',
        username: username
      }));
    };

    ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received message:', data);

  switch (data.type) {
    case 'history':
      setMessages(data.messages || []); // Default to empty array if null
      break;
    case 'message':
      setMessages(prev => [...prev, {
        username: data.username,
        content: data.content,
        timestamp: data.timestamp
      }]);
      break;
    case 'userList':
      setOnlineUsers(data.users);
      break;
    case 'error':
      console.error('Server error:', data.content);
      break;
    default:
      break;
  }
};

    ws.onclose = () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
      clearInterval(pingInterval);

      // Încercăm reconectarea după 3 secunde
      reconnectTimeoutRef.current = setTimeout(() => {
        if (username) {
          console.log('Attempting to reconnect...');
          connectWebSocket(username);
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    wsRef.current = ws;
  };

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setShowUsernameInput(false);
      connectWebSocket(username);
    }
  };

  const handleMessageSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: newMessage
      }));
      setNewMessage('');
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="App">
      <div className="chat-container">
        <div className="chat-header">
          <h1>Chat Room</h1>
          <div className="connection-status">
            Status: {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          {!showUsernameInput && (
            <div className="online-users">
              Online: {onlineUsers.join(', ')}
            </div>
          )}
        </div>

        {showUsernameInput ? (
          <form className="username-form" onSubmit={handleUsernameSubmit}>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <button type="submit">Join Chat</button>
          </form>
        ) : (
          <>
            <div className="messages">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message ${msg.username === username ? 'sent' : 'received'}`}
                >
                  <strong>{msg.username}:</strong> {msg.content}
                  <span className="timestamp">{formatTimestamp(msg.timestamp)}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="message-form" onSubmit={handleMessageSubmit}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                required
              />
              <button type="submit" disabled={!isConnected}>Send</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default App; 