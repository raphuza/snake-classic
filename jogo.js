// Jogo da Cobra — lógica, desenho e controles.

const COLUNAS = 20;
const LINHAS = 20;
const TAMANHO_CELULA = 20;
const PASSOS_POR_SEGUNDO_INICIAL = 8;
const PASSOS_POR_SEGUNDO_MAXIMO = 18;
const CHAVE_RECORDE = "cobra.recorde";

// Tela de cristal líquido monocromática. Mantenha em sincronia com style.css.
const CORES = {
  lcd: "#c7f0d8",
  tinta: "#43523d",
  pixelApagado: "rgba(67, 82, 61, 0.07)",
  sobreposicao: "rgba(199, 240, 216, 0.75)",
};
const FONTE_TELA = "'Pixelify Sans', 'Courier New', monospace";

const DIRECOES = {
  cima: { x: 0, y: -1 },
  baixo: { x: 0, y: 1 },
  esquerda: { x: -1, y: 0 },
  direita: { x: 1, y: 0 },
};

const TECLAS = {
  ArrowUp: "cima", w: "cima", W: "cima",
  ArrowDown: "baixo", s: "baixo", S: "baixo",
  ArrowLeft: "esquerda", a: "esquerda", A: "esquerda",
  ArrowRight: "direita", d: "direita", D: "direita",
};

// ---------- Funções puras (sem DOM) ----------

// Faz a posição atravessar as paredes, reaparecendo do lado oposto.
function envolver(pos) {
  return {
    x: (pos.x + COLUNAS) % COLUNAS,
    y: (pos.y + LINHAS) % LINHAS,
  };
}

function mesmaPosicao(a, b) {
  return a.x === b.x && a.y === b.y;
}

function saoOpostas(a, b) {
  return a.x === -b.x && a.y === -b.y;
}

// Sorteia uma célula que não esteja ocupada pela cobra.
function gerarComida(cobra, aleatorio = Math.random) {
  const ocupadas = new Set(cobra.map((parte) => parte.y * COLUNAS + parte.x));
  const livres = [];
  for (let y = 0; y < LINHAS; y++) {
    for (let x = 0; x < COLUNAS; x++) {
      if (!ocupadas.has(y * COLUNAS + x)) {
        livres.push({ x, y });
      }
    }
  }
  if (livres.length === 0) return null;
  return livres[Math.floor(aleatorio() * livres.length)];
}

function criarEstadoInicial() {
  const meioX = Math.floor(COLUNAS / 2);
  const meioY = Math.floor(LINHAS / 2);
  const cobra = [
    { x: meioX, y: meioY },
    { x: meioX - 1, y: meioY },
    { x: meioX - 2, y: meioY },
  ];
  return {
    cobra,
    direcao: DIRECOES.direita,
    proximaDirecao: DIRECOES.direita,
    comida: gerarComida(cobra),
    pontos: 0,
    situacao: "parado", // "parado" | "jogando" | "pausado" | "fim"
    venceu: false,
  };
}

// Avança a cobra uma célula. Retorna um novo estado.
function passo(estado) {
  const direcao = estado.proximaDirecao;
  const cabeca = estado.cobra[0];
  const novaCabeca = envolver({ x: cabeca.x + direcao.x, y: cabeca.y + direcao.y });
  const comeu = estado.comida !== null && mesmaPosicao(novaCabeca, estado.comida);

  // Sem comer, a cauda sai neste passo, então a cabeça pode ocupar o lugar dela.
  const corpo = comeu ? estado.cobra : estado.cobra.slice(0, -1);
  if (corpo.some((parte) => mesmaPosicao(parte, novaCabeca))) {
    return { ...estado, direcao, situacao: "fim" };
  }

  const cobra = [novaCabeca, ...corpo];
  const comida = comeu ? gerarComida(cobra) : estado.comida;
  return {
    ...estado,
    cobra,
    direcao,
    comida,
    pontos: comeu ? estado.pontos + 1 : estado.pontos,
    // Tabuleiro cheio: não há mais onde pôr comida, e o jogador venceu.
    situacao: comida === null ? "fim" : estado.situacao,
    venceu: comida === null,
  };
}

function velocidade(pontos) {
  return Math.min(PASSOS_POR_SEGUNDO_INICIAL + Math.floor(pontos / 5), PASSOS_POR_SEGUNDO_MAXIMO);
}

// ---------- Recorde (localStorage) ----------

function lerRecorde() {
  try {
    return Number(localStorage.getItem(CHAVE_RECORDE)) || 0;
  } catch {
    return 0;
  }
}

function salvarRecorde(valor) {
  try {
    localStorage.setItem(CHAVE_RECORDE, String(valor));
  } catch {
    // Sem armazenamento disponível: o recorde vale só nesta sessão.
  }
}

// ---------- Interface (DOM) ----------

if (typeof document !== "undefined") {
  const canvas = document.getElementById("tabuleiro");
  const ctx = canvas.getContext("2d");
  const elPontos = document.getElementById("pontos");
  const elRecorde = document.getElementById("recorde");
  // Em telas de toque, as mensagens falam de tocar em vez de teclas.
  const TELA_DE_TOQUE = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  canvas.width = COLUNAS * TAMANHO_CELULA;
  canvas.height = LINHAS * TAMANHO_CELULA;

  let estado = criarEstadoInicial();
  let recorde = lerRecorde();
  let novoRecorde = false;
  let ultimoTempo = 0;
  let acumulado = 0;
  // Direções pressionadas que ainda não foram aplicadas, uma por passo.
  let filaDirecoes = [];
  const TAMANHO_MAXIMO_FILA = 2;
  // Teto do tempo de um quadro, para a cobra não "teleportar" após uma pausa longa.
  const DELTA_MAXIMO = 250;

  function atualizarPlacar() {
    if (estado.pontos > recorde) {
      // Relê o armazenamento: outra aba pode ter salvo um recorde maior.
      recorde = Math.max(recorde, lerRecorde());
      if (estado.pontos > recorde) {
        recorde = estado.pontos;
        novoRecorde = true;
        salvarRecorde(recorde);
      }
    }
    // Quatro dígitos, como no placar dos celulares antigos.
    elPontos.textContent = String(estado.pontos).padStart(4, "0");
    elRecorde.textContent = String(recorde).padStart(4, "0");
    elRecorde.classList.toggle("piscando", novoRecorde);
  }

  function desenharCelula(pos, cor, margem = 1) {
    ctx.fillStyle = cor;
    ctx.fillRect(
      pos.x * TAMANHO_CELULA + margem,
      pos.y * TAMANHO_CELULA + margem,
      TAMANHO_CELULA - margem * 2,
      TAMANHO_CELULA - margem * 2
    );
  }

  // Comida em losango de quatro pixels, como na cobrinha original.
  function desenharComida(pos) {
    const meio = TAMANHO_CELULA / 2;
    const p = 5;
    const cx = pos.x * TAMANHO_CELULA + meio;
    const cy = pos.y * TAMANHO_CELULA + meio;
    ctx.fillStyle = CORES.tinta;
    ctx.fillRect(cx - p / 2, cy - p * 1.5, p, p);
    ctx.fillRect(cx - p * 1.5, cy - p / 2, p, p);
    ctx.fillRect(cx + p / 2, cy - p / 2, p, p);
    ctx.fillRect(cx - p / 2, cy + p / 2, p, p);
  }

  // Cabeça cheia, com um olho voltado para onde a cobra anda.
  function desenharCabeca(pos, direcao) {
    desenharCelula(pos, CORES.tinta);
    const olho = 4;
    const cx = pos.x * TAMANHO_CELULA + TAMANHO_CELULA / 2 + direcao.x * 4 - olho / 2;
    const cy = pos.y * TAMANHO_CELULA + TAMANHO_CELULA / 2 + direcao.y * 4 - olho / 2;
    ctx.fillStyle = CORES.lcd;
    ctx.fillRect(cx, cy, olho, olho);
  }

  function desenharMensagem(titulo, subtitulo) {
    ctx.fillStyle = CORES.sobreposicao;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Caixa de diálogo com borda dupla, no estilo dos menus do celular.
    const largura = 300;
    const altura = 110;
    const x = (canvas.width - largura) / 2;
    const y = (canvas.height - altura) / 2;
    ctx.fillStyle = CORES.lcd;
    ctx.fillRect(x, y, largura, altura);
    ctx.strokeStyle = CORES.tinta;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, largura - 3, altura - 3);
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 6.5, y + 6.5, largura - 13, altura - 13);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = CORES.tinta;
    ctx.font = `600 28px ${FONTE_TELA}`;
    ctx.fillText(titulo, canvas.width / 2, canvas.height / 2 - 16);
    ctx.font = `400 16px ${FONTE_TELA}`;
    ctx.fillText(subtitulo, canvas.width / 2, canvas.height / 2 + 20);
  }

  function desenhar() {
    ctx.fillStyle = CORES.lcd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pixels apagados do cristal líquido, em vez de linhas de grade.
    for (let y = 0; y < LINHAS; y++) {
      for (let x = 0; x < COLUNAS; x++) {
        desenharCelula({ x, y }, CORES.pixelApagado);
      }
    }

    if (estado.comida) desenharComida(estado.comida);
    estado.cobra.forEach((parte, i) => {
      if (i === 0) desenharCabeca(parte, estado.direcao);
      else desenharCelula(parte, CORES.tinta);
    });

    if (estado.situacao === "parado") {
      desenharMensagem("Jogo da Cobra", TELA_DE_TOQUE ? "Toque para começar" : "Pressione Espaço para começar");
    } else if (estado.situacao === "pausado") {
      desenharMensagem("Pausado", TELA_DE_TOQUE ? "Toque para continuar" : "Pressione Espaço para continuar");
    } else if (estado.situacao === "fim") {
      let titulo = "Fim de jogo";
      if (estado.venceu) titulo = "Você venceu!";
      else if (novoRecorde) titulo = "Novo recorde!";
      desenharMensagem(
        titulo,
        `${estado.pontos} pontos. ${TELA_DE_TOQUE ? "Toque" : "Enter"} joga de novo`
      );
    }
  }

  function reiniciar() {
    estado = { ...criarEstadoInicial(), situacao: "jogando" };
    novoRecorde = false;
    acumulado = 0;
    filaDirecoes = [];
    atualizarPlacar();
  }

  function mudarDirecao(nome) {
    const nova = DIRECOES[nome];
    if (estado.situacao !== "jogando" || filaDirecoes.length >= TAMANHO_MAXIMO_FILA) return;
    // Compara com a última direção enfileirada (ou a já aplicada) para impedir
    // meia-volta, mas sem perder a segunda tecla de uma curva rápida.
    const ultima = filaDirecoes.length ? filaDirecoes[filaDirecoes.length - 1] : estado.direcao;
    if (!saoOpostas(nova, ultima) && !mesmaPosicao(nova, ultima)) {
      filaDirecoes.push(nova);
    }
  }

  function alternarPausa() {
    if (estado.situacao === "parado" || estado.situacao === "pausado") {
      estado.situacao = "jogando";
    } else if (estado.situacao === "jogando") {
      estado.situacao = "pausado";
    } else if (estado.situacao === "fim") {
      reiniciar();
    }
  }

  document.addEventListener("keydown", (evento) => {
    // Deixa os atalhos do navegador (Ctrl+S, Ctrl+D, ...) funcionarem.
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
    if (TECLAS[evento.key]) {
      evento.preventDefault();
      mudarDirecao(TECLAS[evento.key]);
    } else if (evento.key === " ") {
      evento.preventDefault();
      if (!evento.repeat) alternarPausa();
    } else if (evento.key === "Enter") {
      // Só reinicia depois do fim, para um Enter acidental não apagar a partida.
      if (!evento.repeat && estado.situacao === "fim") reiniciar();
    }
  });

  // Pausa ao trocar de aba.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && estado.situacao === "jogando") estado.situacao = "pausado";
  });

  // Recorde salvo em outra aba.
  window.addEventListener("storage", (evento) => {
    if (evento.key === CHAVE_RECORDE) {
      recorde = Math.max(recorde, lerRecorde());
      atualizarPlacar();
    }
  });

  // Toque: deslizar muda a direção, tocar inicia/pausa.
  let inicioToque = null;
  canvas.addEventListener("touchstart", (evento) => {
    const t = evento.changedTouches[0];
    inicioToque = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener("touchend", (evento) => {
    if (!inicioToque) return;
    const t = evento.changedTouches[0];
    const dx = t.clientX - inicioToque.x;
    const dy = t.clientY - inicioToque.y;
    inicioToque = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) {
      alternarPausa();
    } else if (Math.abs(dx) > Math.abs(dy)) {
      mudarDirecao(dx > 0 ? "direita" : "esquerda");
    } else {
      mudarDirecao(dy > 0 ? "baixo" : "cima");
    }
  });

  function loop(tempo) {
    const delta = ultimoTempo ? Math.min(tempo - ultimoTempo, DELTA_MAXIMO) : 0;
    ultimoTempo = tempo;

    if (estado.situacao === "jogando") {
      acumulado += delta;
      const intervalo = 1000 / velocidade(estado.pontos);
      while (acumulado >= intervalo && estado.situacao === "jogando") {
        acumulado -= intervalo;
        if (filaDirecoes.length) estado.proximaDirecao = filaDirecoes.shift();
        estado = passo(estado);
        atualizarPlacar();
      }
    } else {
      acumulado = 0;
    }

    desenhar();
    requestAnimationFrame(loop);
  }

  atualizarPlacar();
  requestAnimationFrame(loop);
}

// Permite testar as funções puras no Node.
if (typeof module !== "undefined") {
  module.exports = { envolver, gerarComida, criarEstadoInicial, passo, velocidade, DIRECOES, COLUNAS, LINHAS };
}
