import http from "node:http";
import express from "express";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameRoom } from "./rooms/GameRoom.js";

const PORT = Number(process.env.PORT ?? 2567);

const app = express();
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

// Sala de partida: cada grupo de amigos crea/entra a una sala "game"
gameServer.define("game", GameRoom);

gameServer.listen(PORT).then(() => {
  console.log(`[server] Escuchando en ws://localhost:${PORT}`);
});
