FROM node:20-alpine
WORKDIR /code
COPY package.json package-lock.json* yarn.lock* ./
RUN npm install || true
COPY . .
EXPOSE 3000
CMD ["npm","run","dev"]
