// ==========================================
// 🧠 COACH BRAIN V4
// Treinadora de voz com transições antecipadas
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

    if (bloco.ritmo_livre || !state.paceSegPorKm) return null;

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
      if (agora - this.ultimoAvisoPace < 15000) return null;

      this.ultimoAvisoPace = agora;
      this.ultimoEstadoPace = estado;

      return {
        falar: true,
        tipo: "pace",
        texto: estado === "lento"
          ? "Você está um pouco abaixo do ritmo. Acelera aos poucos."
          : "Você está um pouco rápida. Segura um pouco para não quebrar."
      };
    }

    return null;
  }

  analisarProgresso(state) {
    const bloco = state.bloco;
    if (!bloco || !bloco.meta_tipo || !bloco.meta_valor) return null;

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

    if (progresso >= 0.5 && !this.ultimoAvisoProgresso.metade) {
      this.ultimoAvisoProgresso.metade = true;

      return {
        falar: true,
        tipo: "progresso",
        texto: "Metade do bloco concluída. Mantém o foco."
      };
    }

    if (bloco.meta_tipo === "distancia") {
      if (restante <= 100 && restante > 60 && !this.ultimoAvisoProgresso.faltam100) {
        this.ultimoAvisoProgresso.faltam100 = true;

        return {
          falar: true,
          tipo: "progresso",
          texto: proximoTexto
            ? `Faltam cem metros. Depois entra ${proximoTexto}.`
            : "Faltam cem metros."
        };
      }

      if (restante <= 50 && restante > 20 && !this.ultimoAvisoProgresso.faltam50) {
        this.ultimoAvisoProgresso.faltam50 = true;

        return {
          falar: true,
          prioridade: true,
          tipo: "progresso",
          texto: proximoTexto
            ? `Últimos cinquenta metros. Em seguida, ${proximoTexto}.`
            : "Últimos cinquenta metros. Mantém."
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
            ? `Faltam trinta segundos. Depois entra ${proximoTexto}.`
            : "Faltam trinta segundos."
        };
      }

      if (restante <= 10 && restante > 4 && !this.ultimoAvisoProgresso.faltam10) {
        this.ultimoAvisoProgresso.faltam10 = true;

        return {
          falar: true,
          prioridade: true,
          tipo: "progresso",
          texto: proximoTexto
            ? `Últimos dez segundos. Em seguida, ${proximoTexto}.`
            : "Últimos dez segundos."
        };
      }
    }

    return null;
  }

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

  textoProximoBloco(bloco) {
    if (!bloco) return "";

    const nome = (bloco.nome || "o próximo bloco").toLowerCase();
    const meta = this.textoMeta(bloco).toLowerCase();
    const pace = this.textoPace(bloco);

    if (nome.includes("recuper")) return `recuperação. ${meta}`;
    if (nome.includes("tiro")) return `tiro. ${meta}. ${pace}`;
    if (nome.includes("desaque")) return `desaquecimento. ${meta}`;
    if (nome.includes("aquec")) return `aquecimento. ${meta}`;

    return `${bloco.nome}. ${meta}`;
  }

  textoMeta(bloco) {
    if (!bloco) return "";

    if (bloco.meta_tipo === "distancia") {
      return `Serão ${Math.round(bloco.meta_valor)} metros`;
    }

    if (bloco.meta_tipo === "tempo") {
      if (bloco.meta_valor >= 60) {
        const minutos = Math.round(bloco.meta_valor / 60);
        return `Serão ${minutos} minutos`;
      }

      return `Serão ${Math.round(bloco.meta_valor)} segundos`;
    }

    return "";
  }

  textoPace(bloco) {
    if (!bloco || bloco.ritmo_livre) return "Ritmo livre";

    const rapido = this.formatarPace(bloco.pace_alvo_max_seg_km);
    const lento = this.formatarPace(bloco.pace_alvo_min_seg_km);

    if (rapido === lento) return `Pace alvo de ${rapido}`;

    return `Pace alvo entre ${rapido} e ${lento}`;
  }

  formatarPace(segundos) {
    if (!segundos) return "";

    const min = Math.floor(segundos / 60);
    const seg = Math.round(segundos % 60);

    return `${min} e ${String(seg).padStart(2, "0")}`;
  }

}

const coachBrain = new CoachBrain();

window.CoachBrain = CoachBrain;
window.coachBrain = coachBrain;

console.log("🧠 CoachBrain V4 carregado.");
