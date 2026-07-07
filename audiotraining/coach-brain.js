// ================================
// 🧠 COACH BRAIN v1
// ================================

class CoachBrain {
  constructor() {
    this.ultimoAvisoPace = 0;
    this.estadoPaceAnterior = "ok";
    this.ultimoBlocoFalado = null;
  }

  analisar({ bloco, pace, tempoNoBlocoS }) {
    if (!bloco) return null;

    const agora = Date.now();

    // =========================
    // 🟢 INÍCIO DE BLOCO
    // =========================
    if (tempoNoBlocoS <= 2) {
      if (this.ultimoBlocoFalado !== bloco.id) {
        this.ultimoBlocoFalado = bloco.id;

        return {
          falar: true,
          prioridade: true,
          tipo: "bloco",
          texto: this._falaInicioBloco(bloco)
        };
      }
    }

    // =========================
    // ⏱ CONTROLE DE TEMPO (TIROS / BLOCO)
    // =========================
    if (bloco.duracaoSeg) {
      const restante = bloco.duracaoSeg - tempoNoBlocoS;

      if (restante === 30) {
        return {
          falar: true,
          tipo: "tempo",
          texto: "Faltam 30 segundos."
        };
      }

      if (restante === 10) {
        return {
          falar: true,
          prioridade: true,
          tipo: "tempo",
          texto: "Últimos 10 segundos."
        };
      }
    }

    // =========================
    // 🎯 CONTROLE DE PACE
    // =========================
    if (bloco.paceMin && bloco.paceMax && pace) {
      const lento = pace > bloco.paceMax;
      const rapido = pace < bloco.paceMin;

      const estadoAtual = lento
        ? "lento"
        : rapido
        ? "rapido"
        : "ok";

      // dentro da zona
      if (estadoAtual === "ok") {
        if (this.estadoPaceAnterior !== "ok") {
          this.estadoPaceAnterior = "ok";

          return {
            falar: true,
            tipo: "pace",
            texto: "Perfeito, voltou ao ritmo."
          };
        }

        return null;
      }

      // fora da zona (evita spam)
      if (agora - this.ultimoAvisoPace > 12000) {
        this.ultimoAvisoPace = agora;
        this.estadoPaceAnterior = estadoAtual;

        if (estadoAtual === "lento") {
          return {
            falar: true,
            tipo: "pace",
            texto: "Você está acima do ritmo. Acelera um pouco."
          };
        }

        if (estadoAtual === "rapido") {
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

  // =========================
  // 🧭 FRASES DE INÍCIO
  // =========================
  _falaInicioBloco(bloco) {
    switch (bloco.tipo) {
      case "aquecimento":
        return "Aquecimento iniciado. Vamos com calma.";

      case "corrida_continua":
        return "Parte principal iniciada. Vamos manter o ritmo.";

      case "tiro":
        return "Começaram os tiros. Foco total.";

      case "rampa":
        return "Agora é rampa. Dá o seu máximo.";

      case "desaquecimento":
        return "Último bloco. Desacelera agora.";

      default:
        return "Treino iniciado.";
    }
  }
}

}

// ================================
// 🌍 INSTÂNCIA GLOBAL
// ================================

const coachBrain = new CoachBrain();

window.CoachBrain = CoachBrain;
window.coachBrain = coachBrain;
