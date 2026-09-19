import Phaser from "phaser";
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
  if (/websocket|network|failed to fetch|ECONNREFUSED/i.test(message)) return "No se pudo conectar con el servidor. ¿Está arrancado?";
  return `No se pudo entrar: ${message}`;
}

function startGame(net: NetworkManager) {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    backgroundColor: "#1a1a22",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [GameScene, HudScene],
    callbacks: {
      // La conexión ya está abierta: la dejamos en el registry antes de que arranquen las escenas
      preBoot: (game) => game.registry.set("net", net),
    },
  });
}
