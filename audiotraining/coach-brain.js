// ==========================================
// 🧠 COACH BRAIN V5
// Voz objetiva para não quebrar blocos curtos
// ==========================================

class CoachBrain {

  constructor() {
    this.ultimoBloco = -1;
    this.ultimoAvisoPace = 0;
    this.ultimoEstadoPace = "ok";
    this.ultimoAvisoProgresso = {};
  }

  analisar(state) {
    if (!state || !state.bloco) return null;

    const agora = Date.now();
    const bloco = state.bloco;

    if (state.forcarNovoBloco || state.blocoIndex !== this.ultimoBloco) {
      this.ultimoBloco = state.blocoIndex;
      this.ultimoEstadoPace = "ok";
      this.ultimoAvisoPace = 0;
      this.ultimoAvisoProgresso = {};

      return {
        falar: true,
        prioridade: true,
        tipo: "bloco",
        texto: this.falaInicioBloco(bloco)
      };
    }

    const avisoProgresso = this.analisarProgresso(state);
    if (avisoProgresso) return avisoProgresso;

    if (this.ehDescanso(bloco)) return null;
    if (bloco.ritmo_livre) return null;
    if (!state.paceSegPorKm) return null;
    if (!bloco.pace_alvo_min_seg_km || !bloco.pace_alvo_max_seg_km) return null;

    const pace = state.paceSegPorKm;

    // Tolerância correta:
    // Ex: alvo 5:40 a 6:00
    // rápido demais abaixo de 5:35
    // lento demais acima de 6:05
    const tolerancia = 5;

    const rapido = pace < bloco.pace_alvo_max_seg_km - tolerancia;
    const lento = pace > bloco.pace_alvo_min_seg_km + tolerancia;

    let estado = "ok";
    if (lento) estado = "lento";
    if (rapido) estado = "rapido";

    if (estado === "ok" && this.ultimoEstadoPace !== "ok") {
      this.ultimoEstadoPace = "ok";

      return {
        falar: true,
        tipo: "pace",
        texto: "Boa. Voltou para o ritmo."
      };
    }

    if (estado !== "ok") {
      if (agora - this.ultimoAvisoPace < 18000) return null;

      this.ultimoAvisoPace = agora;
      this.ultimoEstadoPace = estado;

      return {
        falar: true,
        tipo: "pace",
        texto: estado === "lento"
          ? "Está acima do pace. Acelera um pouco."
          : "Está rápida demais. Segura um pouco."
      };
    }

    return null;
  }

  analisarProgresso(state) {
    const bloco = state.bloco;
    if (!bloco || !bloco.meta_tipo || !bloco.meta_valor) return null;

    // Blocos curtos não podem ter fala extra.
    // Ex: 20s de tiro + 20s descanso.
    if (bloco.meta_tipo === "tempo" && bloco.meta_valor <= 45) {
      return null;
    }

    if (this.ehDescanso(bloco) && bloco.meta_valor <= 90) {
      return null;
    }

    let progresso = 0;
    let restante = null;

    if (bloco.meta_tipo === "distancia") {
      progresso = state.distanciaNoBloco / bloco.meta_valor;
      restante = bloco.meta_valor - state.distanciaNoBloco;
    }

    if (bloco.meta_tipo === "tempo") {
      progresso = state.tempoNoBlocoS / bloco.meta_valor;
      restante = bloco.meta_valor - state.tempoNoBlocoS;
    }

    if (!isFinite(progresso)) return null;

    const proximoTexto = this.textoProximoBloco(state.proximoBloco);

    // Metade apenas em blocos longos
    if (progresso >= 0.5 && !this.ultimoAvisoProgresso.metade) {
      if (
        bloco.meta_tipo === "distancia" && bloco.meta_valor >= 400 ||
        bloco.meta_tipo === "tempo" && bloco.meta_valor >= 120
      ) {
        this.ultimoAvisoProgresso.metade = true;

        return {
          falar: true,
          tipo: "progresso",
          texto: "Metade do bloco."
        };
      }
    }

    if (bloco.meta_tipo === "distancia") {
      if (restante <= 100 && restante > 60 && !this.ultimoAvisoProgresso.faltam100) {
        this.ultimoAvisoProgresso.faltam100 = true;

        return {
          falar: true,
          tipo: "progresso",
          texto: proximoTexto
            ? `Faltam cem metros. Depois, ${proximoTexto}.`
            : "Faltam cem metros."
        };
      }

      if (restante <= 50 && restante > 20 && !this.ultimoAvisoProgresso.faltam50) {
        this.ultimoAvisoProgresso.faltam50 = true;

        return {
          falar: true,
          prioridade: true,
          tipo: "progresso",
          texto: "Últimos cinquenta metros."
        };
      }
    }

    if (bloco.meta_tipo === "tempo") {
      if (restante <= 30 && restante > 20 && !this.ultimoAvisoProgresso.faltam30) {
        this.ultimoAvisoProgresso.faltam30 = true;

        return {
          falar: true,
          tipo: "progresso",
          texto: proximoTexto
            ? `Faltam trinta segundos. Depois, ${proximoTexto}.`
            : "Faltam trinta segundos."
        };
      }
    }

    return null;
  }

  falaInicioBloco(bloco) {
    const nome = (bloco.nome || "").toLowerCase();
    const meta = this.textoMeta(bloco);
    const pace = this.textoPace(bloco);

    if (this.ehDescanso(bloco)) {
      return `Descanso. ${meta}.`;
    }

    if (nome.includes("aquec")) {
      return `Aquecimento. ${meta}.`;
    }

    if (nome.includes("desaque")) {
      return `Desaquecimento. ${meta}.`;
    }

    if (nome.includes("tiro")) {
      if (bloco.meta_tipo === "tempo" && bloco.meta_valor <= 45) {
        return `Tiro curto. ${meta}.`;
      }

      return `Tiro. ${meta}. ${pace}.`;
    }

    if (nome.includes("rodagem")) {
      return `Rodagem. ${meta}. ${pace}.`;
    }

    if (bloco.ritmo_livre) {
      return `${bloco.nome || "Bloco livre"}. ${meta}.`;
    }

    return `${bloco.nome || "Novo bloco"}. ${meta}. ${pace}.`;
  }

  textoProximoBloco(bloco) {
    if (!bloco) return "";

    if (this.ehDescanso(bloco)) return `descanso de ${this.textoMetaCurto(bloco)}`;

    const nome = (bloco.nome || "").toLowerCase();

    if (nome.includes("tiro")) return `tiro de ${this.textoMetaCurto(bloco)}`;
    if (nome.includes("desaque")) return `desaquecimento`;
    if (nome.includes("aquec")) return `aquecimento`;

    return bloco.nome || "próximo bloco";
  }

  ehDescanso(bloco) {
    if (!bloco) return false;

    const nome = (bloco.nome || "").toLowerCase();

    return (
      nome.includes("descanso") ||
      nome.includes("descans") ||
      nome.includes("recuper") ||
      nome.includes("caminh") ||
      nome.includes("leve") && bloco.ritmo_livre === true
    );
  }

  textoMeta(bloco) {
    if (!bloco) return "";

    if (bloco.meta_tipo === "distancia") {
      return `${Math.round(bloco.meta_valor)} metros`;
    }

    if (bloco.meta_tipo === "tempo") {
      if (bloco.meta_valor >= 60) {
        const minutos = Math.round(bloco.meta_valor / 60);
        return `${minutos} minuto${minutos > 1 ? "s" : ""}`;
      }

      return `${Math.round(bloco.meta_valor)} segundos`;
    }

    return "";
  }

  textoMetaCurto(bloco) {
    return this.textoMeta(bloco);
  }

  textoPace(bloco) {
    if (!bloco || bloco.ritmo_livre || this.ehDescanso(bloco)) {
      return "";
    }

    const rapido = this.formatarPace(bloco.pace_alvo_max_seg_km);
    const lento = this.formatarPace(bloco.pace_alvo_min_seg_km);

    if (!rapido || !lento) return "";

    if (rapido === lento) {
      return `Pace ${rapido}`;
    }

    return `Pace entre ${rapido} e ${lento}`;
  }

  formatarPace(segundos) {
    if (!segundos) return "";

    const min = Math.floor(segundos / 60);
    const seg = Math.round(segundos % 60);

    return `${min}:${String(seg).padStart(2, "0")}`;
  }

}

const coachBrain = new CoachBrain();

window.CoachBrain = CoachBrain;
window.coachBrain = coachBrain;

console.log("🧠 CoachBrain V5 carregado.");
