# 🧟 Zombie Waves

Juego multijugador online de disparos con oleadas de zombies, jugable desde el navegador. Vista cenital (top-down), movimiento en 4 direcciones y apuntado con el ratón. Sobrevive junto a tus amigos, gana dinero por cada zombie y compra mejoras entre oleadas: armas, chaleco, velocidad, daño y más.

## Stack

| Capa | Tecnología | Rol |
|---|---|---|
| Cliente | [Phaser 3](https://phaser.io/) + TypeScript + [Vite](https://vite.dev/) | Renderizado, input, animaciones, físicas locales |
| Servidor | [Node.js](https://nodejs.org/) + [Colyseus](https://colyseus.io/) | Salas de partida, servidor autoritativo, sincronización de estado |
| Compartido | TypeScript | Constantes de armas, mejoras, zombies y tipos de mensajes |

### ¿Por qué este stack?

- **Phaser 3**: motor 2D maduro, ideal para shooters top-down (sprites, tilemaps, físicas arcade, partículas).
- **Colyseus**: framework hecho para juegos multijugador en tiempo real. Gestiona las salas (lobby con amigos), sincroniza automáticamente el estado (posiciones, vida, zombies, mejoras) y permite que el servidor sea autoritativo (evita trampas).
- **Monorepo con npm workspaces**: cliente, servidor y código compartido en un solo repo, sin duplicar la configuración del juego.

## Estructura

```
zombie-waves/
├── client/            # Juego en el navegador (Phaser + Vite)
│   └── src/
│       ├── main.ts           # Configuración de Phaser
│       ├── scenes/           # Escenas (juego, menú, HUD...)
│       └── net/              # Conexión con el servidor
├── server/            # Servidor de juego (Colyseus)
│   └── src/
│       ├── index.ts          # Arranque del servidor
│       └── rooms/            # Salas y estado sincronizado
├── shared/            # Código compartido (armas, mejoras, zombies, tipos)
└── package.json       # Workspaces y scripts globales
```

## Requisitos

- Node.js 20 o superior
- npm 10 o superior

## Puesta en marcha

```bash
npm install          # instala todos los workspaces
npm run dev          # levanta servidor (puerto 2567) y cliente (puerto 5173)
```

Abre <http://localhost:5173>. Desde el menú puedes:

- **Partida rápida**: entras en una sala pública con hueco (o se crea una nueva).
- **Crear sala privada**: obtienes un código de 5 letras; solo entra quien lo tenga.
- **Unirse**: escribe el código de un amigo. También sirve el enlace `http://localhost:5173/?sala=CÓDIGO`.

En la sala de espera el anfitrión pulsa **ENTER** para empezar. Para probar el multijugador en local, abre varias pestañas.

## Controles

| Acción | Control |
|---|---|
| Moverse | WASD o flechas |
| Apuntar / disparar | Ratón / clic izquierdo |
| Empezar partida (anfitrión, en el lobby) | ENTER |
| Abrir tienda | B |
| Silenciar sonido | M |
| Comprar | 1-4 armas · 5-9 mejoras (con la tienda abierta) |

Entre oleada y oleada hay 15 s para comprar. Si mueres, reapareces al empezar la siguiente oleada; si mueren todos, la partida se reinicia.

Scripts útiles:

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor + cliente en modo desarrollo |
| `npm run dev:server` | Solo el servidor |
| `npm run dev:client` | Solo el cliente |
| `npm run build` | Compila todo para producción |
| `npm run typecheck` | Comprueba tipos en todos los workspaces |

## Despliegue online

El cliente es estático y el servidor es un proceso Node con WebSockets, así que se despliegan por separado:

### 1. Servidor (Render, gratis)

1. Crea una cuenta en <https://render.com> y entra en **New > Blueprint**.
2. Conecta este repositorio: Render lee `render.yaml` y construye el `Dockerfile`.
3. Al terminar tendrás una URL tipo `https://zombie-waves-server.onrender.com`. Comprueba `/health`.

> El plan gratuito "duerme" tras 15 min sin uso; la primera conexión puede tardar ~30 s en despertar.

Cualquier otro proveedor que ejecute Docker o Node sirve igual (Railway, Fly.io, un VPS...). El servidor solo necesita la variable `PORT`.

### 2. Cliente (GitHub Pages, automático)

Cada push a `main` ejecuta [deploy-client.yml](.github/workflows/deploy-client.yml) y publica el cliente en
<https://elkrys12.github.io/zombie-waves/>.

Para que apunte a tu servidor, define la variable de repositorio **`VITE_SERVER_URL`** (Settings > Secrets and variables > Actions > Variables) con la URL del servidor usando `wss://`, por ejemplo `wss://zombie-waves-server.onrender.com`, y vuelve a lanzar el workflow.

Mientras tanto puedes probar cualquier servidor sin reconstruir añadiendo `?server=wss://tu-servidor` a la URL del cliente.

## Roadmap

- [x] Estructura del monorepo y stack
- [x] Conexión cliente-servidor y movimiento sincronizado
- [x] Disparos y balas
- [x] Zombies con IA básica y oleadas (walker, runner, tank)
- [x] Sistema de vida, muerte y reaparición
- [x] Dinero y tienda de mejoras (armas, chaleco, velocidad, daño, cadencia, vida)
- [x] Lobby: crear sala privada, unirse por código o enlace, anfitrión inicia
- [x] Sprites procedurales, animaciones, efectos y sonido sintetizado (M para silenciar)
- [x] HUD (vida, oleada, dinero, arma, marcador)
- [x] Despliegue: cliente en GitHub Pages (automático) + servidor en Render (Dockerfile + blueprint)
