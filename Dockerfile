# Build stage
FROM node:19.3.0-alpine3.16 as build

WORKDIR /usr/src/app

# Copy package files and install dev dependencies
COPY package*.json ./
RUN apk add --no-cache make gcc g++ python3 && \
    npm install && \
    apk del make gcc g++ python3

# Copy source code and build the app
COPY . .
RUN npm run build

# Final runtime stage
FROM node:19.3.0-alpine3.16

# Set timezone (optional)
RUN apk add -U tzdata && \
    cp /usr/share/zoneinfo/Pacific/Auckland /etc/localtime && \
    echo "Pacific/Auckland" > /etc/timezone

WORKDIR /usr/app

# Only copy what's needed
COPY package*.json ./
RUN apk add --no-cache make gcc g++ python3 && \
    npm ci --omit=dev && \
    apk del make gcc g++ python3

COPY --from=build /usr/src/app/dist ./dist
COPY src/app/resources ./src/app/resources

EXPOSE 4941
CMD [ "node", "dist/server.js" ]
