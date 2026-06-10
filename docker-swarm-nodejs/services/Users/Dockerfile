FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
RUN npm install 

COPY server.js .

EXPOSE 3001

CMD ["node", "server.js"]