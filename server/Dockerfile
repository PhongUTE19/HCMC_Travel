FROM node:22-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY src/ ./src/

# Create data directory placeholder
RUN mkdir -p /app/data/knowledge

ENV NODE_ENV=production
ENV PORT=3000
ENV KNOWLEDGE_DIR=/app/data/knowledge
ENV QDRANT_URL=http://qdrant:6333
ENV QDRANT_COLLECTION_NAME=hcmc_travel

EXPOSE 3000

CMD ["node", "src/server.js"]
