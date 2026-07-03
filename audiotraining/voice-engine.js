// ================================
// 🧠 RUN COACH VOICE ENGINE v2
// ================================

const VoiceEngine = {
  fila: [],
  falando: false,
  ultimoTipo: null,
  ultimoTempo: 0,

  prioridadeAtiva: false,

  falar(texto, { prioridade = false, tipo = "normal" } = {}) {
    if (!("speechSynthesis" in window)) return;

    const agora = Date.now();

    // 🔥 anti repetição agressiva
    if (
      tipo === this.ultimoTipo &&
      agora - this.ultimoTempo < 25000 &&
      !prioridade
    ) {
      return;
    }

    if (prioridade) {
      window.speechSynthesis.cancel();
      this.fila = [];
      this.falando = false;
      this.prioridadeAtiva = true;
    }

    this.fila.push({ texto, tipo });
    this._processar();
  },

  _processar() {
    if (this.falando || this.fila.length === 0) return;

    this.falando = true;

    const item = this.fila.shift();

    this.ultimoTipo = item.tipo;
    this.ultimoTempo = Date.now();

    const utt = new SpeechSynthesisUtterance(item.texto);
    utt.lang = "pt-BR";
    utt.rate = 1.02;
    utt.pitch = 1.0;
    utt.volume = 1.0;

    utt.onend = () => {
      this.falando = false;
      this._processar();
    };

    utt.onerror = () => {
      this.falando = false;
      this._processar();
    };

    window.speechSynthesis.speak(utt);
  }
};

// ================================
// 🧠 DECISOR DA TREINADORA
// ================================

class CoachBrain {
  constructor() {
    this.ultimoAvisoPace = 0;
    this.ultimoEstadoPace = "ok";
    this.tempoInicioBloco = Date.now();
    this.inicioAquecimento = false;
  }

  analisar({ bloco, pace, tempoNoBlocoS }) {
    const agora = Date.now();

    if (!bloco) return null;

    // -------------------------
    // 🟢 MUDANÇA DE BLOCO
    // -------------------------
    if (tempoNoBlocoS < 3) {
      this.inicioAquecimento = true;

      return {
        falar: true,
        prioridade: true,
        tipo: "bloco",
        texto: this._falaInicioBloco(bloco)
      };
    }

    // -------------------------
    // ⏱ ALERTA DE TEMPO FINAL
    // -------------------------
    const tempoRestante =
      (bloco.duracaoSeg || 0) - tempoNoBlocoS;

    if (tempoRestante <= 30 && tempoRestante > 25) {
      return {
        falar: true,
        tipo: "tempo",
        texto: "Faltam 30 segundos."
      };
    }

    if (tempoRestante <= 10 && tempoRestante > 5) {
      return {
        falar: true,
        prioridade: true,
        tipo: "tempo",
        texto: "Últimos 10 segundos."
      };
    }

    // -------------------------
    // 🎯 CONTROLE DE PACE (REGRA PRINCIPAL)
    // -------------------------
    if (bloco.paceMin && bloco.paceMax && pace) {
      const erro =
        pace < bloco.paceMin
          ? "rapido"
          : pace > bloco.paceMax
          ? "lento"
          : "ok";

      // dentro da zona
      if (erro === "ok") {
        if (this.ultimoEstadoPace !== "ok") {
          this.ultimoEstadoPace = "ok";

          return {
            falar: true,
            tipo: "pace",
            texto: "Perfeito, voltou ao ritmo."
          };
        }

        return null;
      }

      // fora da zona (só fala se persistir)
      if (agora - this.ultimoAvisoPace > 12000) {
        this.ultimoAvisoPace = agora;
        this.ultimoEstadoPace = erro;

        if (erro === "lento") {
          return {
            falar: true,
            tipo: "pace",
            texto: "Você está acima do ritmo. Acelera um pouco."
          };
        }

        if (erro === "rapido") {
          return {
            falar: true,
            tipo: "pace",
            texto: "Você está rápido demais. Segura um pouco."
          };
        }
      }
    }

    return null;
  }

  _falaInicioBloco(bloco) {
    if (bloco.tipo === "aquecimento") {
      return "Aquecimento iniciado. Vamos com calma.";
    }

    if (bloco.tipo === "corrida_continua") {
      return "Começou a parte principal. Vamos manter o ritmo.";
    }

    if (bloco.tipo === "repeticao_tempo" || bloco.tipo === "repeticao_distancia") {
      return "Começam os intervalos. Foco agora.";
    }

    if (bloco.tipo === "rampa") {
      return "Agora é rampa. Dá o seu máximo.";
    }

    if (bloco.tipo === "desaquecimento") {
      return "Último bloco. Desacelera agora.";
    }

    return "Treino iniciado.";
  }
}

// ================================
// 🔗 INTEGRAÇÃO SIMPLES
// ================================

const coachBrain = new CoachBrain();

// Exemplo de uso dentro do RunExecutor:
// const resultado = coachBrain.analisar(...)
// if(resultado?.falar) VoiceEngine.falar(...)
