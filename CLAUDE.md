# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Study project (course "jornada-dados", module 1): a browser Snake game ("Jogo da Cobra") in plain JavaScript/HTML/CSS. Requirements live in `.llm/prd.md` — light colors, a high-score display, and wrap-around walls (the snake exits one edge and reappears on the opposite one; walls never kill).

`.llm/CLAUDE.md` is a stale copy of the parent workspace's guidance (describes a sibling `calculadora-python/`) — not accurate for this directory.

## Running and testing

No build, dependencies, or package manager. Open `index.html` directly in a browser.

There is no test suite. The game logic is exported for Node when `module` exists, so it can be checked without a browser:

```bash
node -e "const j = require('./jogo.js'); console.log(j.envolver({x: 20, y: -1}))"
```

## Architecture (`jogo.js`)

- **Pure functions, no DOM:** `envolver` (wall wrap), `gerarComida` (random free cell, `null` when the board is full), `criarEstadoInicial`, and `passo(estado)`, which returns a *new* state: it moves, eats/grows, scores, and detects self-collision. When the snake doesn't eat, the tail cell is excluded from the collision check, because the tail moves away on that same step.
- **Direction buffering:** key presses go into `filaDirecoes` (DOM layer, max 2). Before each step the loop moves one into `proximaDirecao`, and `passo` copies that into `direcao`. Each key is checked for reversal against the last queued direction (or the applied `direcao`), so a quick two-key turn keeps both keys but can't make a 180° turn.
- **DOM layer** (inside `if (typeof document !== "undefined")`): a `requestAnimationFrame` loop with a time accumulator calls `passo` at `velocidade(pontos)` steps per second, which speeds up every 5 points. Frame time is capped at `DELTA_MAXIMO`, and the game pauses when the tab is hidden. `situacao` is `"parado" | "jogando" | "pausado" | "fim"` and drives the canvas overlays; `venceu` marks a full board. Space starts, pauses, or restarts; Enter restarts only in `"fim"`. Key repeats and Ctrl/Meta/Alt combos are ignored. Swipe/tap work on touch screens.
- **High score:** stored in `localStorage` under `cobra.recorde`, wrapped in try/catch. It is updated live in `atualizarPlacar()`, which re-reads storage before saving, and a `storage` listener picks up records from other tabs.
- Canvas colors are in the `CORES` constant in `jogo.js`; page colors are CSS variables in `style.css`. Keep the two in sync and keep the theme light.

## Conventions

Code, identifiers, comments, and UI text are in Portuguese (pt-BR).
