import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";
import { HudScene } from "./scenes/HudScene";
import { NetworkManager } from "./net/NetworkManager";

const menu = document.getElementById("menu")!;
const form = document.getElementById("menu-form") as HTMLFormElement;
const nameInput = document.getElementById("name") as HTMLInputElement;
const errorBox = document.getElementById("menu-error")!;

nameInput.value = localStorage.getItem("zw-name") ?? "";

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.textContent = "";
  const button = form.querySelector("button")!;
  button.disabled = true;
  button.textContent = "Conectando...";

  const name = nameInput.value.trim();
  localStorage.setItem("zw-name", name);

  try {
    const net = new NetworkManager();
    await net.join(name);
    menu.classList.add("hidden");
    startGame(net);
  } catch (err) {
    console.error(err);
    errorBox.textContent = "No se pudo conectar con el servidor. ¿Está arrancado?";
    button.disabled = false;
    button.textContent = "Jugar";
  }
});

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
