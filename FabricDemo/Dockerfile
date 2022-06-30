FROM node:17

WORKDIR /home/demo

COPY . .

WORKDIR ./socket.io
RUN npm install

WORKDIR ../synchronizer
RUN npm install
# RUN npm ci --only=production

WORKDIR /home/demo
EXPOSE 8080