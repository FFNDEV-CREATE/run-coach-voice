// ================================
// 🧠 RUN COACH VOICE ENGINE v2 (FIXED)
// ================================

const VoiceEngine = {
  fila: [],
  falando: false,
  ultimoTipo: null,
  ultimoTempo: 0,

  falar(texto, { prioridade = false, tipo = "normal" } = {}) {
    if (!("speechSynthesis" in window)) return;

    const agora = Date.now();

    if (
      tipo === this.ultimoTipo &&
      agora - this.ultimoTempo < 20000 &&
      !prioridade
    ) {
      return;
    }

    if (prioridade) {
      window.speechSynthesis.cancel();
      this.fila = [];
      this.falando = false;
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
// 🧠 COACH BRAIN (FIXED PARA RUNEXECUTOR)
// ================================

class CoachBrain {
  constructor() {
    this.ultimoAvisoPace = 0;
    this.ultimoEstadoPace = "ok";
  }

  analisar(state) {
    const agora = Date.now();
    const { bloco, paceSegPorKm, distanciaNoBloco, tempoTotalS } = state;

    if (!bloco) return null;

    // -------------------------
    // 🎯 INÍCIO DE BLOCO
    // -------------------------
    if (tempoTotalS < 3) {
      return {
        falar: true,
        prioridade: true,
        tipo: "bloco",
        texto: this._falaInicioBloco(bloco)
      };
    }

    // -------------------------
    // 🎯 PACE CONTROL (compatível RunExecutor)
    // -------------------------
    if (bloco.pace_alvo_min_seg_km && bloco.pace_alvo_max_seg_km && paceSegPorKm) {

      const lento = paceSegPorKm > bloco.pace_alvo_min_seg_km;
      const rapido = paceSegPorKm < bloco.pace_alvo_max_seg_km;

      const estado = lento ? "lento" : rapido ? "rapido" : "ok";

      if (estado === "ok") {
        if (this.ultimoEstadoPace !== "ok") {
          this.ultimoEstadoPace = "ok";

          return {
            falar: true,
            tipo: "pace",
            texto: "Perfeito, ritmo estabilizado."
          };
        }

        return null;
      }

      if (agora - this.ultimoAvisoPace > 12000) {
        this.ultimoAvisoPace = agora;
        this.ultimoEstadoPace = estado;

        return {
          falar: true,
          tipo: "pace",
          texto:
            estado === "lento"
              ? "Você está abaixo do ritmo. Acelera um pouco."
              : "Você está acima do ritmo. Controla um pouco."
        };
      }
    }

    return null;
  }

  _falaInicioBloco(bloco) {
    const tipo = bloco.tipo;

    if (tipo === "aquecimento") return "Aquecimento iniciado.";
    if (tipo === "corrida_continua") return "Parte principal do treino começou.";
    if (tipo === "repeticao_tempo" || tipo === "repeticao_distancia") return "Intervalos iniciados.";
    if (tipo === "rampa") return "Agora é subida. Força total.";
    if (tipo === "desaquecimento") return "Último bloco. Desacelera.";

    return "Treino iniciado.";
  }
}

// ================================
// 🔗 INSTÂNCIA GLOBAL
// ================================

const coachBrain = new CoachBrain();
window.VoiceEngine = VoiceEngine;
window.coachBrain = coachBrain;
