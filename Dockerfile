# Web image for BookShelf
FROM node:22-alpine
WORKDIR /app

# Copy package files first so Docker can cache the npm install layer
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public

ENV NODE_ENV=production
EXPOSE 3000

# Do not run as root inside the container
USER node
CMD ["node", "src/server.js"]
