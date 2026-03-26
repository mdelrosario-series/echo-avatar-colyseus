# Build from the echoAvatar app root (parent of server/):
#   cd path/to/echoAvatar
#   docker build -f server/Dockerfile .
FROM node:22-alpine

# Shared protocol types (imported from server as ../../../src/multiplayer/protocol/...)
WORKDIR /app
COPY src/multiplayer/protocol ./src/multiplayer/protocol

WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/tsconfig.json ./
COPY server/src ./src

# Listen port: Render sets PORT; Fly sets COLYSEUS_PORT via fly.toml [env].
ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "run", "start"]
