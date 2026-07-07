// ==========================================
// 🧠 COACH BRAIN V2
// Compatível com RunExecutor V2
// ==========================================

class CoachBrain {

  constructor() {

    this.ultimoBloco = -1;
    this.ultimoAvisoPace = 0;
    this.ultimoEstadoPace = "ok";

  }

  analisar(state) {

    if (!state || !state.bloco) return null;

    const agora = Date.now();

    // =============================
    // INÍCIO DE BLOCO
    // =============================

    if (
      state.forcarNovoBloco ||
      state.blocoIndex !== this.ultimoBloco
    ) {

      this.ultimoBloco = state.blocoIndex;

      return {
        falar: true,
        prioridade: true,
        tipo: "bloco",
        texto: this.falaInicioBloco(state.bloco)
      };

    }

    // =============================
    // BLOCO LIVRE
    // =============================

    if (state.bloco.ritmo_livre) {

      return null;

    }

    // =============================
    // SEM PACE
    // =============================

    if (!state.paceSegPorKm) {

      return null;

    }

    const pace = state.paceSegPorKm;

    const lento =
      pace > state.bloco.pace_alvo_min_seg_km;

    const rapido =
      pace < state.bloco.pace_alvo_max_seg_km;

    let estado = "ok";

    if (lento) estado = "lento";
    if (rapido) estado = "rapido";

    // =============================
    // VOLTOU AO RITMO
    // =============================

    if (
      estado === "ok" &&
      this.ultimoEstadoPace !== "ok"
    ) {

      this.ultimoEstadoPace = "ok";

      return {
        falar: true,
        tipo: "pace",
        texto: "Perfeito. Ritmo recuperado."
      };

    }

    // =============================
    // EVITA SPAM
    // =============================

    if (estado !== "ok") {

      if (
        agora - this.ultimoAvisoPace < 12000
      ) {

        return null;

      }

      this.ultimoAvisoPace = agora;
      this.ultimoEstadoPace = estado;

      if (estado === "lento") {

        return {
          falar: true,
          tipo: "pace",
          texto: "Acelera um pouco."
        };

      }

      if (estado === "rapido") {

        return {
          falar: true,
          tipo: "pace",
          texto: "Reduz um pouco o ritmo."
        };

      }

    }

    return null;

  }

  // =====================================

  falaInicioBloco(bloco) {

    const nome = (bloco.nome || "").toLowerCase();

    if (nome.includes("aquec")) {

      return "Aquecimento iniciado.";

    }

    if (nome.includes("desaque")) {

      return "Último bloco. Desacelera.";

    }

    if (nome.includes("tiro")) {

      return "Começou o tiro.";

    }

    if (nome.includes("recuper")) {

      return "Recuperação.";

    }

    if (nome.includes("interval")) {

      return "Novo intervalo.";

    }

    if (nome.includes("rodagem")) {

      return "Vamos manter o ritmo.";

    }

    return bloco.nome || "Novo bloco.";

  }

}

// ==========================================
// INSTÂNCIA GLOBAL
// ==========================================

const coachBrain = new CoachBrain();

window.CoachBrain = CoachBrain;
window.coachBrain = coachBrain;

console.log("🧠 CoachBrain carregado.");
