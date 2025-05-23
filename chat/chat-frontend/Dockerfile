FROM node:16-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# aici am verificat structura directorului
RUN ls -la && \
    echo "Contents of public directory:" && \
    ls -la public || true

RUN npm run build

# am configurat serverul nginx pentru servirea aplicatiei
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 90
CMD ["nginx", "-g", "daemon off;"] 