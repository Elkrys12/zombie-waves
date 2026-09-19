# Servidor de juego (Colyseus). Build: docker build -t zombie-waves-server .
FROM node:22-alpine
WORKDIR /app

# Solo lo necesario para instalar dependencias del servidor y shared
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
RUN npm ci --omit=dev --workspace=server --workspace=shared

COPY shared shared
COPY server server

ENV NODE_ENV=production
ENV PORT=2567
EXPOSE 2567
CMD ["npm", "start", "-w", "server"]
