FROM node:18-alpine as dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install


FROM node:18-alpine as build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . . 
RUN npm run build


FROM node:18-alpine as final
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node" ,"dist/service.js"]

