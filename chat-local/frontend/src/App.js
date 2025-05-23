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
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

 const getWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = '8080';
  return `${protocol}//${host}:${port}/ws`;
};

  const connectWebSocket = (username) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = getWebSocketUrl();
    console.log(`Connecting to WebSocket at: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

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
      try {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);

        switch (data.type) {
          case 'history':
            if (Array.isArray(data.messages)) {
              setMessages(data.messages);
            } else {
              console.error('Invalid history format:', data);
              setMessages([]);
            }
            break;
          case 'message':
            if (data.username && data.content) {
              setMessages(prev => [...prev, {
                username: data.username,
                content: data.content,
                timestamp: data.timestamp || new Date().toISOString()
              }]);
            }
            break;
          case 'userList':
            if (Array.isArray(data.users)) {
              setOnlineUsers(data.users);
            } else {
              console.error('Invalid userList format:', data);
              setOnlineUsers([]);
            }
            break;
          case 'error':
            console.error('Server error:', data.content);
            break;
          default:
            console.log('Unknown message type:', data.type);
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
      clearInterval(pingInterval);

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
              Online: {onlineUsers && onlineUsers.length > 0 ? onlineUsers.join(', ') : 'No users online'}
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
              {messages && messages.length > 0 ? (
                messages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`message ${msg.username === username ? 'sent' : 'received'}`}
                  >
                    <strong>{msg.username}:</strong> {msg.content}
                    <span className="timestamp">{formatTimestamp(msg.timestamp)}</span>
                  </div>
                ))
              ) : (
                <div className="no-messages">No messages yet</div>
              )}
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