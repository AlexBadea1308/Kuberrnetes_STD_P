package main

import (
        "context"
        "fmt"
        "log"
        "net/http"
        "os"
        "os/signal"
        "sync"
        "syscall"
        "time"

        "github.com/gorilla/websocket"
        "go.mongodb.org/mongo-driver/bson"
        "go.mongodb.org/mongo-driver/mongo"
        "go.mongodb.org/mongo-driver/mongo/options"
)

// Config holds the application configuration
type Config struct {
        MongoURI string
        Port     string
}

// MessageType defines the type of WebSocket message
type MessageType string

const (
        TypeMessage  MessageType = "message"
        TypeHistory  MessageType = "history"
        TypeUserList MessageType = "userList"
        TypeError    MessageType = "error"
        TypeLogin    MessageType = "login"
        TypePing     MessageType = "ping"
)

// ChatMessage represents a message in the chat
type ChatMessage struct {
        Type      MessageType `bson:"type" json:"type"`
        Username  string      `bson:"username" json:"username"`
        Content   string      `bson:"content" json:"content"`
        Timestamp string      `bson:"timestamp" json:"timestamp"`
}

// UserListMessage represents the list of connected users
type UserListMessage struct {
        Type  MessageType `json:"type"`
        Users []string    `json:"users"`
}

// HistoryMessage represents the chat history
type HistoryMessage struct {
        Type     MessageType   `json:"type"`
        Messages []ChatMessage `json:"messages"`
}

// Client represents a connected WebSocket client
type Client struct {
        Conn     *websocket.Conn
        Username string
        IsAlive  bool
}

// Server holds the server state
type Server struct {
        config      Config
        clients     map[*websocket.Conn]*Client
        broadcast   chan interface{}
        collection  *mongo.Collection
        shutdownCtx context.Context
        shutdownWg  *sync.WaitGroup
        mu          sync.Mutex
        upgrader    websocket.Upgrader
}

func newServer(config Config) *Server {
        return &Server{
                config:     config,
                clients:    make(map[*websocket.Conn]*Client),
                broadcast:  make(chan interface{}),
                shutdownWg: &sync.WaitGroup{},
        }
}

func (s *Server) setupMongo() error {
        log.Println("Setting up MongoDB connection...")
        ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
        defer cancel()

        client, err := mongo.Connect(ctx, options.Client().ApplyURI(s.config.MongoURI))
        if err != nil {
                log.Printf("Failed to connect to MongoDB: %v", err)
                return err
        }

        ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()

        if err := client.Ping(ctx, nil); err != nil {
                log.Printf("Failed to ping MongoDB: %v", err)
                return err
        }

        log.Println("MongoDB connected successfully")
        s.collection = client.Database("chat").Collection("messages")
        return nil
}

func (s *Server) handleConnections(w http.ResponseWriter, r *http.Request) {
        log.Println("New WebSocket connection attempt")
        ws, err := s.upgrader.Upgrade(w, r, nil)
        if err != nil {
                log.Printf("Error upgrading to WebSocket: %v", err)
                return
        }

        client := &Client{
                Conn:    ws,
                IsAlive: true,
        }
        s.mu.Lock()
        s.clients[ws] = client
        s.mu.Unlock()

        log.Println("WebSocket connection established")

        // Set pong handler for this connection
        ws.SetPongHandler(func(appData string) error {
                s.mu.Lock()
                if client, exists := s.clients[ws]; exists {
                        client.IsAlive = true
                }
                s.mu.Unlock()
                log.Println("Received pong from client")
                return nil
        })

        defer func() {
                s.mu.Lock()
                if client, exists := s.clients[ws]; exists && client.Username != "" {
                        delete(s.clients, ws)
                        ws.Close()
                        s.mu.Unlock()
                        log.Printf("Client %s disconnected", client.Username)
                        s.broadcast <- ChatMessage{
                                Type:      TypeMessage,
                                Content:   fmt.Sprintf("%s has left the chat", client.Username),
                                Username:  "System",
                                Timestamp: time.Now().UTC().Format(time.RFC3339),
                        }
                        s.broadcastUserList()
                } else {
                        delete(s.clients, ws)
                        ws.Close()
                        s.mu.Unlock()
                        log.Println("Anonymous client disconnected")
                }
        }()

        if err := s.sendChatHistory(ws); err != nil {
                log.Printf("Error sending chat history: %v", err)
                ws.Close() // Închide conexiunea doar dacă e o eroare
                return
        }

        for {
                var msg ChatMessage
                if err := ws.ReadJSON(&msg); err != nil {
                        log.Printf("Error reading WebSocket message: %v", err)
                        break
                }

                log.Printf("Received message: %v", msg)

                switch msg.Type {
                case TypePing:
                        log.Println("Received ping from client, ignoring")
                        continue
                case TypeLogin:
  log.Printf("Mesaj de login primit de la utilizatorul: %s", msg.Username)
  s.mu.Lock()
  s.clients[ws].Username = msg.Username
  s.mu.Unlock()

  log.Printf("Utilizatorul %s s-a conectat cu succes", msg.Username)

  joinMsg := ChatMessage{
    Type:      TypeMessage,
    Content:   fmt.Sprintf("%s s-a alăturat chat-ului", msg.Username),
    Username:  "System",
    Timestamp: time.Now().UTC().Format(time.RFC3339),
  }
  s.broadcast <- joinMsg
  s.broadcastUserList()

                case TypeMessage:
                        s.mu.Lock()
                        if s.clients[ws].Username == "" {
                                s.mu.Unlock()
                                log.Println("User not logged in, sending error")
                                ws.WriteJSON(ChatMessage{
                                        Type:    TypeError,
                                        Content: "Must login before sending messages",
                                })
                                continue
                        }
                        s.mu.Unlock()

                        if msg.Content == "" {
                                log.Println("Empty message content, sending error")
                                ws.WriteJSON(ChatMessage{
                                        Type:    TypeError,
                                        Content: "Message content cannot be empty",
                                })
                                continue
                        }

                        msg.Username = s.clients[ws].Username
                        msg.Timestamp = time.Now().UTC().Format(time.RFC3339)

                        if err := s.saveMessage(&msg); err != nil {
                                log.Printf("Error saving message to MongoDB: %v", err)
                                ws.WriteJSON(ChatMessage{
                                        Type:    TypeError,
                                        Content: "Failed to save message",
                                })
                                continue
                        }

                        log.Println("Broadcasting message")
                        s.broadcast <- msg
                default:
                        log.Printf("Unknown message type: %s", msg.Type)
                }
        }
}

func (s *Server) saveMessage(msg *ChatMessage) error {
        ctx, cancel := context.WithTimeout(s.shutdownCtx, 5*time.Second)
        defer cancel()

        _, err := s.collection.InsertOne(ctx, msg)
        if err != nil {
                log.Printf("MongoDB insert error: %v", err)
        }
        return err
}

func (s *Server) sendChatHistory(client *websocket.Conn) error {
    log.Println("Sending chat history")
    ctx, cancel := context.WithTimeout(s.shutdownCtx, 5*time.Second)
    defer cancel()

    type RawChatMessage struct {
        Type      MessageType `bson:"type"`
        Username  string      `bson:"username"`
        Content   string      `bson:"content"`
        Timestamp interface{} `bson:"timestamp"`
    }

    opts := options.Find().SetSort(bson.D{{Key: "timestamp", Value: -1}}).SetLimit(100)
    cursor, err := s.collection.Find(ctx, bson.D{}, opts)
    if err != nil {
        log.Printf("Error fetching chat history from MongoDB: %v", err)
        return err
    }
    defer cursor.Close(ctx)

    var rawMessages []RawChatMessage
    if err := cursor.All(ctx, &rawMessages); err != nil {
        log.Printf("Error decoding chat history: %v", err)
        return err
    }

    // Initialize messages as an empty slice instead of nil
    messages := make([]ChatMessage, 0)
    for _, raw := range rawMessages {
        var timestampStr string
        switch t := raw.Timestamp.(type) {
        case string:
            timestampStr = t
        case time.Time:
            timestampStr = t.UTC().Format("2006-01-02T15:04:05.999Z")
        default:
            log.Printf("Unknown timestamp type: %T", t)
            timestampStr = time.Now().UTC().Format(time.RFC3339)
        }
        messages = append(messages, ChatMessage{
            Type:      raw.Type,
            Username:  raw.Username,
            Content:   raw.Content,
            Timestamp: timestampStr,
        })
    }

    for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
        messages[i], messages[j] = messages[j], messages[i]
    }

    log.Printf("Sending history with %d messages", len(messages))
    return client.WriteJSON(HistoryMessage{
        Type:     TypeHistory,
        Messages: messages,
    })
}

func (s *Server) broadcastUserList() {
  s.mu.Lock()
  users := make([]string, 0, len(s.clients))
  for _, client := range s.clients {
    if client.Username != "" {
      users = append(users, client.Username)
    }
  }
  s.mu.Unlock()

  log.Printf("Se trimite lista de utilizatori: %v", users)
  s.broadcast <- UserListMessage{
    Type:  TypeUserList,
    Users: users,
  }
}

func (s *Server) handleMessages() {
        for {
                select {
                case <-s.shutdownCtx.Done():
                        log.Println("Shutting down message handler")
                        return
                case msg := <-s.broadcast:
                        s.mu.Lock()
                        for conn, client := range s.clients {
                                if err := conn.WriteJSON(msg); err != nil {
                                        log.Printf("Error writing message to client %s: %v", client.Username, err)
                                        conn.Close()
                                        delete(s.clients, conn)
                                        if client.Username != "" {
                                                s.broadcast <- ChatMessage{
                                                        Type:      TypeMessage,
                                                        Content:   fmt.Sprintf("%s has left the chat", client.Username),
                                                        Username:  "System",
                                                        Timestamp: time.Now().UTC().Format(time.RFC3339),
                                                }
                                                s.broadcastUserList()
                                        }
                                }
                        }
                        s.mu.Unlock()
                }
        }
}

func (s *Server) pingClients() {
        ticker := time.NewTicker(30 * time.Second)
        defer ticker.Stop()

        for {
                select {
                case <-s.shutdownCtx.Done():
                        log.Println("Shutting down ping handler")
                        return
                case <-ticker.C:
                        s.mu.Lock()
                        for conn, client := range s.clients {
                                if !client.IsAlive {
                                        log.Printf("Client %s not alive, disconnecting", client.Username)
                                        conn.Close()
                                        delete(s.clients, conn)
                                        if client.Username != "" {
                                                s.broadcast <- ChatMessage{
                                                        Type:      TypeMessage,
                                                        Content:   fmt.Sprintf("%s has left the chat", client.Username),
                                                        Username:  "System",
                                                        Timestamp: time.Now().UTC().Format(time.RFC3339),
                                                }
                                                s.broadcastUserList()
                                        }
                                        continue
                                }
                                client.IsAlive = false
                                if err := conn.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(10*time.Second)); err != nil {
                                        log.Printf("Error sending ping to client %s: %v", client.Username, err)
                                        conn.Close()
                                        delete(s.clients, conn)
                                        if client.Username != "" {
                                                s.broadcast <- ChatMessage{
                                                        Type:      TypeMessage,
                                                        Content:   fmt.Sprintf("%s has left the chat", client.Username),
                                                        Username:  "System",
                                                        Timestamp: time.Now().UTC().Format(time.RFC3339),
                                                }
                                                s.broadcastUserList()
                                        }
                                }
                        }
                        s.mu.Unlock()
                }
        }
}

func main() {
        // Load configuration
        config := Config{
                MongoURI: os.Getenv("MONGODB_URI"),
                Port:     os.Getenv("PORT"),
        }

        if config.MongoURI == "" {
                config.MongoURI = "mongodb://mongodb:27017/chat"
          }

       if config.Port == "" {
        config.Port = "8080"
        }

        log.Printf("Starting server with MongoURI: %s, Port: %s", config.MongoURI, config.Port)

        // Create server
        server := newServer(config)

        // Setup MongoDB
        if err := server.setupMongo(); err != nil {
                log.Fatal("Failed to setup MongoDB: ", err)
        }

        // Setup WebSocket upgrader
        server.upgrader = websocket.Upgrader{
                CheckOrigin: func(r *http.Request) bool {
                        log.Printf("Checking origin for request from: %s", r.Header.Get("Origin"))
                        return true // Allow all origins for development
                },
        }

        // Start broadcast goroutine
        server.shutdownWg.Add(1)
        go func() {
                defer server.shutdownWg.Done()
                server.handleMessages()
        }()

        // Start ping goroutine
        server.shutdownWg.Add(1)
        go func() {
                defer server.shutdownWg.Done()
                server.pingClients()
        }()

        // Setup graceful shutdown
        shutdownCtx, cancel := context.WithCancel(context.Background())
        server.shutdownCtx = shutdownCtx

        // Handle shutdown signals
        shutdown := make(chan os.Signal, 1)
        signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)

        go func() {
                <-shutdown
                log.Println("Shutting down server...")
                cancel()

                // Wait for goroutines to finish
                server.shutdownWg.Wait()

                // Close all client connections
                server.mu.Lock()
                for conn := range server.clients {
                        conn.Close()
                }
                server.mu.Unlock()

                log.Println("Server shutdown complete")
        }()

        // Setup HTTP handler
        http.HandleFunc("/ws", server.handleConnections)

        // Start HTTP server
        serverAddr := ":" + config.Port
        log.Printf("Server starting on %s", serverAddr)
        if err := http.ListenAndServe(serverAddr, nil); err != nil && err != http.ErrServerClosed {
                log.Fatal("Error starting server: ", err)
        }
}
