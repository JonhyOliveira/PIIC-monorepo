FROM node:17

WORKDIR /home/demo

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install
# RUN npm ci --only=production

COPY client-app-automerge/build client-app-automerge/build

COPY out out

EXPOSE 8080

CMD [ "/bin/sh" ]