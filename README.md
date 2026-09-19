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

Abre <http://localhost:5173> en varias pestañas para probar el multijugador.

## Controles

| Acción | Control |
|---|---|
| Moverse | WASD o flechas |
| Apuntar / disparar | Ratón / clic izquierdo |
| Abrir tienda | B |
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

## Roadmap

- [x] Estructura del monorepo y stack
- [x] Conexión cliente-servidor y movimiento sincronizado
- [x] Disparos y balas
- [x] Zombies con IA básica y oleadas (walker, runner, tank)
- [x] Sistema de vida, muerte y reaparición
- [x] Dinero y tienda de mejoras (armas, chaleco, velocidad, daño, cadencia, vida)
- [ ] Lobby: crear sala y unirse por código
- [ ] Sprites, animaciones y sonido
- [x] HUD (vida, oleada, dinero, arma, marcador)
- [ ] Despliegue (cliente estático + servidor Node)
