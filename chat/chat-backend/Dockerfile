# Build stage
FROM golang:1.16-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
COPY main.go ./

# Set up proxy
ENV GOPROXY=https://proxy.golang.org,direct
ENV GOSUMDB=off

# Download dependencies
RUN go mod download

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o chat-backend .

# Final stage
FROM alpine:latest

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/chat-backend .

EXPOSE 88

CMD ["./chat-backend"]