// ==========================================
// 🧠 COACH BRAIN V3
// Treinadora de voz para conduzir o treino
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

    // =============================
    // INÍCIO DE BLOCO
    // =============================

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

    // =============================
    // AVISOS DE PROGRESSO DO BLOCO
    // =============================

    const avisoProgresso = this.analisarProgresso(state);

    if (avisoProgresso) {
      return avisoProgresso;
    }

    // =============================
    // BLOCO SEM PACE ALVO
    // =============================

    if (bloco.ritmo_livre) {
      return null;
    }

    if (!state.paceSegPorKm) {
      return null;
    }

    // =============================
    // CONTROLE DE PACE
    // =============================

    const pace = state.paceSegPorKm;

    const lento = pace > bloco.pace_alvo_min_seg_km + 8;
    const rapido = pace < bloco.pace_alvo_max_seg_km - 8;

    let estado = "ok";

    if (lento) estado = "lento";
    if (rapido) estado = "rapido";

    if (estado === "ok" && this.ultimoEstadoPace !== "ok") {
      this.ultimoEstadoPace = "ok";

      return {
        falar: true,
        tipo: "pace",
        texto: "Boa. Voltou para o ritmo certo."
      };
    }

    if (estado !== "ok") {
      if (agora - this.ultimoAvisoPace < 15000) {
        return null;
      }

      this.ultimoAvisoPace = agora;
      this.ultimoEstadoPace = estado;

      if (estado === "lento") {
        return {
          falar: true,
          tipo: "pace",
          texto: "Você está um pouco abaixo do ritmo. Acelera aos poucos."
        };
      }

      if (estado === "rapido") {
        return {
          falar: true,
          tipo: "pace",
          texto: "Você está um pouco rápida. Segura um pouco para não quebrar."
        };
      }
    }

    return null;
  }

  // ==========================================
  // PROGRESSO DO BLOCO
  // ==========================================

  analisarProgresso(state) {
    const bloco = state.bloco;

    if (!bloco || !bloco.meta_tipo || !bloco.meta_valor) return null;

    let progresso = 0;
    let restante = 0;

    if (bloco.meta_tipo === "distancia") {
      progresso = state.distanciaNoBloco / bloco.meta_valor;
      restante = bloco.meta_valor - state.distanciaNoBloco;
    }

    if (bloco.meta_tipo === "tempo") {
      progresso = state.tempoNoBlocoS
        ? state.tempoNoBlocoS / bloco.meta_valor
        : 0;

      restante = state.tempoNoBlocoS
        ? bloco.meta_valor - state.tempoNoBlocoS
        : null;
    }

    if (!isFinite(progresso)) return null;

    // Metade do bloco
    if (progresso >= 0.5 && !this.ultimoAvisoProgresso.metade) {
      this.ultimoAvisoProgresso.metade = true;

      return {
        falar: true,
        tipo: "progresso",
        texto: "Metade do bloco concluída. Mantém o foco."
      };
    }

    // Avisos finais por distância
    if (bloco.meta_tipo === "distancia") {
      if (restante <= 100 && restante > 60 && !this.ultimoAvisoProgresso.faltam100) {
        this.ultimoAvisoProgresso.faltam100 = true;

        return {
          falar: true,
          tipo: "progresso",
          texto: "Faltam cem metros."
        };
      }

      if (restante <= 50 && restante > 20 && !this.ultimoAvisoProgresso.faltam50) {
        this.ultimoAvisoProgresso.faltam50 = true;

        return {
          falar: true,
          prioridade: true,
          tipo: "progresso",
          texto: "Últimos cinquenta metros. Mantém."
        };
      }
    }

    // Avisos finais por tempo
    if (bloco.meta_tipo === "tempo" && restante !== null) {
      if (restante <= 30 && restante > 20 && !this.ultimoAvisoProgresso.faltam30) {
        this.ultimoAvisoProgresso.faltam30 = true;

        return {
          falar: true,
          tipo: "progresso",
          texto: "Faltam trinta segundos."
        };
      }

      if (restante <= 10 && restante > 4 && !this.ultimoAvisoProgresso.faltam10) {
        this.ultimoAvisoProgresso.faltam10 = true;

        return {
          falar: true,
          prioridade: true,
          tipo: "progresso",
          texto: "Últimos dez segundos."
        };
      }
    }

    return null;
  }

  // ==========================================
  // FALA DE INÍCIO DO BLOCO
  // ==========================================

  falaInicioBloco(bloco) {
    const nome = (bloco.nome || "").toLowerCase();
    const meta = this.textoMeta(bloco);
    const pace = this.textoPace(bloco);

    if (nome.includes("aquec")) {
      return `Aquecimento iniciado. ${meta}. Corre leve e confortável.`;
    }

    if (nome.includes("desaque")) {
      return `Desaquecimento iniciado. ${meta}. Solta o corpo e desacelera.`;
    }

    if (nome.includes("recuper")) {
      return `Recuperação agora. ${meta}. Respira fundo e controla.`;
    }

    if (nome.includes("tiro")) {
      return `Começou o tiro. ${meta}. ${pace}. Foco na postura e no ritmo.`;
    }

    if (nome.includes("interval")) {
      return `Novo intervalo. ${meta}. ${pace}. Vamos com controle.`;
    }

    if (nome.includes("rodagem")) {
      return `Rodagem iniciada. ${meta}. ${pace}. Mantém constante.`;
    }

    return `${bloco.nome || "Novo bloco"}. ${meta}. ${pace}`;
  }

  textoMeta(bloco) {
    if (!bloco) return "";

    if (bloco.meta_tipo === "distancia") {
      return `Serão ${Math.round(bloco.meta_valor)} metros`;
    }

    if (bloco.meta_tipo === "tempo") {
      const minutos = Math.round(bloco.meta_valor / 60);
      return minutos > 0
        ? `Serão ${minutos} minutos`
        : `Serão ${bloco.meta_valor} segundos`;
    }

    return "";
  }

  textoPace(bloco) {
    if (!bloco || bloco.ritmo_livre) {
      return "Ritmo livre";
    }

    const rapido = this.formatarPace(bloco.pace_alvo_max_seg_km);
    const lento = this.formatarPace(bloco.pace_alvo_min_seg_km);

    if (rapido === lento) {
      return `Pace alvo de ${rapido}`;
    }

    return `Pace alvo entre ${rapido} e ${lento}`;
  }

  formatarPace(segundos) {
    if (!segundos) return "";

    const min = Math.floor(segundos / 60);
    const seg = Math.round(segundos % 60);

    return `${min} e ${String(seg).padStart(2, "0")}`;
  }

}

// ==========================================
// INSTÂNCIA GLOBAL
// ==========================================

const coachBrain = new CoachBrain();

window.CoachBrain = CoachBrain;
window.coachBrain = coachBrain;

console.log("🧠 CoachBrain carregado.");
