
FROM node:22-alpine

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built assets and necessary files from builder
COPY ./.next ./.next
COPY ./dist ./dist
COPY ./public ./public
COPY ./next.config.ts ./next.config.ts

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
