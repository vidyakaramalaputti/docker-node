

FROM node:18-alpine

WORKDIR /myapp

EXPOSE 3000

copy package*.json ./

RUN npm install

COPY . .




cmd ["node" , "app.js"]
