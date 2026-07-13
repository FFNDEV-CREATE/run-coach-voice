// ==========================================
// 🧠 COACH BRAIN V7
// Silencioso em blocos curtos, com debounce de pace
// ==========================================

class CoachBrain {

  constructor() {
    this.ultimoBloco = -1;
    this.ultimoAvisoPace = 0;
    this.ultimoEstadoPace = "ok";
    this.contadorEstadoConsecutivo = 0;
    this.avisouMetade = false;
    this.menorContagemFalada = null;
  }

  analisar(state) {
    if (!state || !state.bloco) return null;

    const bloco = state.bloco;

    if (state.forcarNovoBloco || state.blocoIndex !== this.ultimoBloco) {
      this.ultimoBloco = state.blocoIndex;
      this.ultimoEstadoPace = "ok";
      this.ultimoAvisoPace = 0;
      this.contadorEstadoConsecutivo = 0;
      this.avisouMetade = false;
      this.menorContagemFalada = null;

      return {
        falar: true,
        prioridade: true,
        tipo: "bloco",
        texto: this.falaInicioBloco(bloco)
      };
    }

    if (this.blocoMuitoCurto(bloco)) {
      return null;
    }

    const contagem = this.analisarContagemRegressiva(state);
    if (contagem) return contagem;

    const metade = this.analisarMetade(state);
    if (metade) return metade;

    if (this.ehDescanso(bloco)) return null;
    if (bloco.ritmo_livre) return null;
    if (!state.paceSegPorKm) return null;
    if (!bloco.pace_alvo_min_seg_km || !bloco.pace_alvo_max_seg_km) return null;

    const pace = state.paceSegPorKm;
    const tolerancia = 10;

    const rapido = pace < bloco.pace_alvo_max_seg_km - tolerancia;
    const lento = pace > bloco.pace_alvo_min_seg_km + tolerancia;

    let estadoBruto = "ok";
    if (lento) estadoBruto = "lento";
    if (rapido) estadoBruto = "rapido";

    if (estadoBruto === this.ultimoEstadoPaceCandidato) {
      this.contadorEstadoConsecutivo++;
    } else {
      this.ultimoEstadoPaceCandidato = estadoBruto;
      this.contadorEstadoConsecutivo = 1;
    }

    if (this.contadorEstadoConsecutivo < 2) {
      return null;
    }

    const estado = estadoBruto;
    const agora = Date.now();

    if (estado === "ok" && this.ultimoEstadoPace !== "ok") {
      if (agora - this.ultimoAvisoPace < 8000) return null;

      this.ultimoEstadoPace = "ok";
      this.ultimoAvisoPace = agora;

      return {
        falar: true,
        tipo: "pace",
        texto: this.fraseVoltouRitmo()
      };
    }

    if (estado !== "ok") {
      if (agora - this.ultimoAvisoPace < 18000) return null;

      this.ultimoAvisoPace = agora;
      this.ultimoEstadoPace = estado;

      return {
        falar: true,
        tipo: "pace",
        texto: estado === "lento" ? this.fraseAcelerar() : this.fraseDiminuir()
      };
    }

    return null;
  }

  blocoMuitoCurto(bloco) {
    if (!bloco || !bloco.meta_tipo || !bloco.meta_valor) return false;

    if (bloco.meta_tipo === "tempo" && bloco.meta_valor <= 20) return true;
    if (bloco.meta_tipo === "distancia" && bloco.meta_valor <= 100) return true;

    return false;
  }

  analisarContagemRegressiva(state) {
    const bloco = state.bloco;
    if (!bloco || !bloco.meta_tipo || !bloco.meta_valor) return null;

    let segundosRestantes = null;

    if (bloco.meta_tipo === "tempo") {
      segundosRestantes = state.tempoRestanteS;
    }

    if (bloco.meta_tipo === "distancia") {
      if (
        state.paceSegPorKm &&
        state.paceSegPorKm > 0 &&
        state.distanciaRestanteM != null
      ) {
        const velocidadeMS = 1000 / state.paceSegPorKm;
        if (velocidadeMS > 0) {
          segundosRestantes = state.distanciaRestanteM / velocidadeMS;
        }
      }
    }

    if (segundosRestantes == null || !isFinite(segundosRestantes)) return null;

    const segundosArredondado = Math.ceil(segundosRestantes);

    if (segundosArredondado < 1 || segundosArredondado > 10) return null;

    if (this.menorContagemFalada != null && segundosArredondado >= this.menorContagemFalada) {
      return null;
    }

    this.menorContagemFalada = segundosArredondado;

    return {
      falar: true,
      prioridade: true,
      tipo: "contagem",
      texto: String(segundosArredondado)
    };
  }

  analisarMetade(state) {
    const bloco = state.bloco;
    if (!bloco || !bloco.meta_tipo || !bloco.meta_valor) return null;
    if (this.avisouMetade) return null;

    if (bloco.meta_tipo === "tempo" && bloco.meta_valor < 120) return null;
    if (bloco.meta_tipo === "distancia" && bloco.meta_valor < 400) return null;

    let progresso = 0;

    if (bloco.meta_tipo === "distancia") {
      progresso = state.distanciaNoBloco / bloco.meta_valor;
    }

    if (bloco.meta_tipo === "tempo") {
      progresso = state.tempoNoBlocoS / bloco.meta_valor;
    }

    if (!isFinite(progresso)) return null;

    if (progresso >= 0.5) {
      this.avisouMetade = true;

      return {
        falar: true,
        tipo: "progresso",
        texto: "Metade do bloco."
      };
    }

    return null;
  }

  fraseAcelerar() {
    const opcoes = [
      "Acelera um pouco.",
      "Um pouco mais rápido.",
      "Puxa mais o ritmo."
    ];
    return opcoes[Math.floor(Math.random() * opcoes.length)];
  }

  fraseDiminuir() {
    const opcoes = [
      "Diminui um pouco.",
      "Segura o ritmo.",
      "Desacelera um pouco."
    ];
    return opcoes[Math.floor(Math.random() * opcoes.length)];
  }

  fraseVoltouRitmo() {
    const opcoes = [
      "Boa, voltou no ritmo.",
      "Isso, agora tá certo.",
      "Boa, é isso aí."
    ];
    return opcoes[Math.floor(Math.random() * opcoes.length)];
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

      return pace ? `Tiro. ${meta}. ${pace}.` : `Tiro. ${meta}.`;
    }

    if (nome.includes("rodagem")) {
      return pace ? `Rodagem. ${meta}. ${pace}.` : `Rodagem. ${meta}.`;
    }

    if (bloco.ritmo_livre) {
      return `${bloco.nome || "Bloco livre"}. ${meta}.`;
    }

    return pace ? `${bloco.nome || "Novo bloco"}. ${meta}. ${pace}.` : `${bloco.nome || "Novo bloco"}. ${meta}.`;
  }

  ehDescanso(bloco) {
    if (!bloco) return false;

    const nome = (bloco.nome || "").toLowerCase();

    return (
      nome.includes("descanso") ||
      nome.includes("descans") ||
      nome.includes("recuper") ||
      nome.includes("caminh") ||
      (nome.includes("leve") && bloco.ritmo_livre === true)
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

  textoPace(bloco) {
    if (!bloco || bloco.ritmo_livre || this.ehDescanso(bloco)) {
      return "";
    }

    const rapido = this.formatarRitmoCurto(bloco.pace_alvo_max_seg_km);
    const lento = this.formatarRitmoCurto(bloco.pace_alvo_min_seg_km);

    if (!rapido || !lento) return "";

    if (rapido === lento) {
      return `Ritmo ${rapido}`;
    }

    return `Ritmo entre ${rapido} e ${lento}`;
  }

  formatarRitmoCurto(segundos) {
    if (!segundos) return "";

    const min = Math.floor(segundos / 60);
    const seg = Math.round(segundos % 60);

    if (seg === 0) {
      return `${min}`;
    }

    return `${min} e ${seg}`;
  }

}

const coachBrain = new CoachBrain();

window.CoachBrain = CoachBrain;
window.coachBrain = coachBrain;

console.log("🧠 CoachBrain V7 carregado.");
