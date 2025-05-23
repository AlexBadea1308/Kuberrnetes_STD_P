FROM node:16-alpine AS builder

WORKDIR /app

COPY package*.json ./


RUN npm install

# copiem restul fisierelor in direcotrul curent de pe docker
COPY . .

RUN npm run build

FROM nginx:alpine

# Copy the build output to replace the default nginx contents
COPY --from=builder /app/build /usr/share/nginx/html

# copiem nginx ul cusotm in fisierul default nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]