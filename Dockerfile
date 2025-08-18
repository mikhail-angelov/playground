FROM node:22-alpine

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built assets and necessary files from builder
COPY ./.next ./.next
COPY ./public ./public
# COPY --from=builder /app/node_modules ./node_modules
COPY ./next.config.ts ./next.config.ts
COPY ./next-env.d.ts ./next-env.d.ts
# COPY --from=builder /app/src ./src

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
