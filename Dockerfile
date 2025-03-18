# Stage 1: Build the client
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build the server
FROM node:22-alpine AS server-builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# Stage 3: Create the final image
FROM node:22-alpine AS production
WORKDIR /app

# Copy server build
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/package.json ./server/package.json
COPY --from=server-builder /app/server/node_modules ./server/node_modules

# Copy client build
COPY --from=client-builder /app/client/build ./client/build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose the server port
EXPOSE 5000

# Start the server
CMD ["node", "server/dist/server.js"]