FROM node:19.3.0-alpine3.16 as build

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN apk add --no-cache make gcc g++ python3 && \
    npm install -g npm@9.2.0 && \
    npm install -g typescript && \
    npm install -g ts-node && \
    npm install -g tslint &&  \
    npm install --silent && \
    apk del make gcc g++ python3

# Bundle app source
COPY . /usr/src/app
RUN npm run build

# Note that we are building the app in one container (named as build) and running it in a 2nd container, this sort of
# simulates the distinction environment between dev and production
FROM node:19.3.0-alpine3.16
# change timezone to fix datetime issue
RUN apk add -U tzdata
ENV TZ=Pacific/Auckland
RUN cp /usr/share/zoneinfo/Pacific/Auckland /etc/localtime

RUN npm install -g npm@9.2.0

WORKDIR /usr/app
COPY --from=build /usr/src/app .

EXPOSE 4941
CMD [ "node", "dist/server.js" ]
