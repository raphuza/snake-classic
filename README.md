# Jogo da Cobra

O clássico jogo da cobrinha dos celulares antigos, feito em JavaScript, HTML e CSS puros, para rodar no navegador.

Projeto de estudo do curso **Jornada Dados** (módulo 1).

## Como jogar

Não precisa instalar nada: basta abrir o arquivo `index.html` no navegador.

Coma a comida para crescer e marcar pontos. Não há paredes: ao sair por uma borda, a cobra volta pela borda oposta. O jogo só termina quando a cobra morde o próprio corpo ou quando ela ocupa o tabuleiro inteiro (aí você vence).

A cada 5 pontos a cobra fica mais rápida.

### Controles

| Ação | Teclado | Tela de toque |
| --- | --- | --- |
| Mover | Setas ou `W` `A` `S` `D` | Deslizar o dedo |
| Começar / pausar | `Espaço` | Tocar na tela |
| Jogar de novo (após o fim) | `Espaço` ou `Enter` | Tocar na tela |

O jogo pausa sozinho quando você troca de aba.

## Recorde

A maior pontuação fica salva no navegador (`localStorage`), então continua lá quando você volta ao jogo. Se o jogo estiver aberto em mais de uma aba, o recorde é sincronizado entre elas.

## Estrutura

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Página do jogo: placar, tabuleiro (canvas) e instruções |
| `style.css` | Visual da página, em cores claras |
| `jogo.js` | Lógica do jogo e interface |
| `.llm/prd.md` | Requisitos do projeto |

## Testando a lógica sem navegador

As funções do jogo em `jogo.js` não dependem da página e podem ser chamadas pelo Node.js:

```bash
node -e "const j = require('./jogo.js'); console.log(j.envolver({x: 20, y: -1}))"
node -e "const j = require('./jogo.js'); console.log(j.passo(j.criarEstadoInicial()))"
```
