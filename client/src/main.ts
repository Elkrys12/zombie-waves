import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { HudScene } from "./scenes/HudScene";
import { NetworkManager } from "./net/NetworkManager";
import { ROOM_CODE_LENGTH } from "@zombie-waves/shared";

const menu = document.getElementById("menu")!;
const nameInput = document.getElementById("name") as HTMLInputElement;
const codeInput = document.getElementById("code") as HTMLInputElement;
const errorBox = document.getElementById("menu-error")!;
const buttons = Array.from(menu.querySelectorAll("button"));

nameInput.value = localStorage.getItem("zw-name") ?? "";

// Enlace compartido: http://host/?sala=ABCDE rellena el código automáticamente
const sharedCode = new URLSearchParams(location.search).get("sala");
if (sharedCode) codeInput.value = sharedCode.toUpperCase();

// Ayuda para pruebas: ?auto=1 entra directamente (en la sala de ?sala=, o partida rápida)
const params = new URLSearchParams(location.search);
if (params.get("auto")) {
  if (params.get("name")) nameInput.value = params.get("name")!;
  queueMicrotask(() => document.getElementById(sharedCode ? "btn-join" : "btn-quick")!.click());
}

codeInput.addEventListener("input", () => {
  codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});

document.getElementById("btn-quick")!.addEventListener("click", () => connect((net, name) => net.quickPlay(name)));
document.getElementById("btn-create")!.addEventListener("click", () => connect((net, name) => net.createPrivate(name)));
document.getElementById("btn-join")!.addEventListener("click", () => {
  const code = codeInput.value.trim();
  if (code.length !== ROOM_CODE_LENGTH) {
    errorBox.textContent = `El código tiene ${ROOM_CODE_LENGTH} caracteres.`;
    return;
  }
  connect((net, name) => net.joinByCode(code, name));
});
codeInput.addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById("btn-join")!.click(); });
nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById("btn-quick")!.click(); });

async function connect(action: (net: NetworkManager, name: string) => Promise<unknown>) {
  errorBox.textContent = "";
  buttons.forEach((b) => (b.disabled = true));

  const name = nameInput.value.trim();
  localStorage.setItem("zw-name", name);

  try {
    const net = new NetworkManager();
    await action(net, name);
    menu.classList.add("hidden");
    startGame(net);
    // ?start=1 (pruebas): el anfitrión arranca la partida sin pulsar ENTER
    if (params.get("start")) setTimeout(() => net.startGame(), 500);
  } catch (err) {
    console.error(err);
    errorBox.textContent = describeError(err);
    buttons.forEach((b) => (b.disabled = false));
  }
}

function describeError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/not found|no encontrad/i.test(message)) return "No existe ninguna sala con ese código.";
  if (/locked|full|lleno/i.test(message)) return "La sala está llena.";
  if (/websocket|network|failed to fetch|ECONNREFUSED/i.test(message)) {
    return location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? "No se pudo conectar con el servidor. ¿Está arrancado?"
      : "No se pudo conectar con el servidor de juego. Comprueba que esté desplegado y configurado.";
  }
  return `No se pudo entrar: ${message}`;
}

function startGame(net: NetworkManager) {
  const game = new Phaser.Game({
    // ?renderer=canvas (pruebas): fuerza Canvas 2D, útil en navegadores headless sin WebGL
    type: params.get("renderer") === "canvas" ? Phaser.CANVAS : Phaser.AUTO,
    parent: "game",
    backgroundColor: "#1a1a22",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // En modo prueba (?auto=1) conservamos el buffer para que las capturas headless no salgan negras
    render: { preserveDrawingBuffer: !!params.get("auto") },
    scene: [BootScene, GameScene, HudScene],
    callbacks: {
      // La conexión ya está abierta: la dejamos en el registry antes de que arranquen las escenas
      preBoot: (g) => {
        g.registry.set("net", net);
        // Salir de la partida: cerrar la conexión, destruir el juego y volver al menú
        g.registry.set("onExit", async () => {
          await net.leave();
          game.destroy(true);
          menu.classList.remove("hidden");
          buttons.forEach((b) => (b.disabled = false));
          history.replaceState(null, "", location.pathname); // limpia ?sala=... y ?auto=
        });
      },
    },
  });
}
