FROM golang:1.19-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:latest

WORKDIR /app

# Copy the executable from the builder stage
COPY --from=builder /app/server .

EXPOSE 8080

CMD ["./server"]