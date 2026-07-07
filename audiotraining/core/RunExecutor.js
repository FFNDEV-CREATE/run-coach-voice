// ==========================================
// 🏃 RUN EXECUTOR V3
// Motor central de execução do treino
// ==========================================

class RunExecutor {
  constructor(blocos = [], onUpdate = () => {}) {
    this.blocos = blocos;
    this.onUpdate = onUpdate;

    this.blocoIndex = 0;

    this.tempoInicioTotal = null;
    this.tempoInicioBloco = null;

    this.distanciaTotalM = 0;
    this.distanciaNoBloco = 0;

    this.ultimoUpdate = null;
    this.paceAtualSegPorKm = null;

    this.onBlocoCompleto = null;
    this.onFinalizado = null;

    this.finalizado = false;
  }

  iniciar() {
    if (!this.blocos.length) return;

    this.tempoInicioTotal = Date.now();
    this.finalizado = false;
    this.blocoIndex = 0;
    this.distanciaTotalM = 0;

    this._iniciarBlocoAtual();
  }

  atualizar(gpsUpdate) {
    if (this.finalizado) return;

    this.ultimoUpdate = gpsUpdate;

    const { distanciaDeltaM, paceSegPorKm } = gpsUpdate || {};

    this.paceAtualSegPorKm = paceSegPorKm || this.paceAtualSegPorKm;

    this.distanciaTotalM += distanciaDeltaM || 0;
    this.distanciaNoBloco += distanciaDeltaM || 0;

    this._emitirEstado(false);
    this._verificarMetaBloco();
  }

  _iniciarBlocoAtual() {
    const bloco = this._blocoAtual();

    if (!bloco) {
      this._finalizarTreino();
      return;
    }

    this.tempoInicioBloco = Date.now();
    this.distanciaNoBloco = 0;
    this.paceAtualSegPorKm = null;

    this._emitirEstado(true);
  }

  _blocoAtual() {
    return this.blocos[this.blocoIndex];
  }

  _proximoBloco() {
    return this.blocos[this.blocoIndex + 1] || null;
  }

  _tempoTotalS() {
    return this.tempoInicioTotal
      ? (Date.now() - this.tempoInicioTotal) / 1000
      : 0;
  }

  _tempoNoBlocoS() {
    return this.tempoInicioBloco
      ? (Date.now() - this.tempoInicioBloco) / 1000
      : 0;
  }

  _verificarMetaBloco() {
    const bloco = this._blocoAtual();
    if (!bloco) return;

    let concluido = false;

    if (bloco.meta_tipo === "distancia") {
      concluido = this.distanciaNoBloco >= bloco.meta_valor;
    }

    if (bloco.meta_tipo === "tempo") {
      concluido = this._tempoNoBlocoS() >= bloco.meta_valor;
    }

    if (concluido) {
      this._finalizarBloco();
    }
  }

  _finalizarBloco() {
    const bloco = this._blocoAtual();

    const tempoBlocoS = this._tempoNoBlocoS();

    const paceMedio =
      this.distanciaNoBloco > 0
        ? tempoBlocoS / (this.distanciaNoBloco / 1000)
        : null;

    if (this.onBlocoCompleto) {
      this.onBlocoCompleto(
        this.blocoIndex,
        bloco,
        paceMedio,
        this.distanciaNoBloco,
        tempoBlocoS
      );
    }

    this.blocoIndex++;

    if (this.blocoIndex >= this.blocos.length) {
      this._finalizarTreino();
      return;
    }

    this._iniciarBlocoAtual();
  }

  _finalizarTreino() {
    this.finalizado = true;

    if (this.onFinalizado) {
      this.onFinalizado();
    }
  }

  _calcularProgressoBloco(bloco) {
    if (!bloco || !bloco.meta_valor) return 0;

    if (bloco.meta_tipo === "distancia") {
      return Math.min(this.distanciaNoBloco / bloco.meta_valor, 1);
    }

    if (bloco.meta_tipo === "tempo") {
      return Math.min(this._tempoNoBlocoS() / bloco.meta_valor, 1);
    }

    return 0;
  }

  _calcularRestanteBloco(bloco) {
    if (!bloco || !bloco.meta_valor) {
      return {
        distanciaRestanteM: null,
        tempoRestanteS: null
      };
    }

    if (bloco.meta_tipo === "distancia") {
      return {
        distanciaRestanteM: Math.max(bloco.meta_valor - this.distanciaNoBloco, 0),
        tempoRestanteS: null
      };
    }

    if (bloco.meta_tipo === "tempo") {
      return {
        distanciaRestanteM: null,
        tempoRestanteS: Math.max(bloco.meta_valor - this._tempoNoBlocoS(), 0)
      };
    }

    return {
      distanciaRestanteM: null,
      tempoRestanteS: null
    };
  }

  _emitirEstado(forcarNovoBloco = false) {
    const bloco = this._blocoAtual();

    const restante = this._calcularRestanteBloco(bloco);

    const state = {
      bloco,
      blocoIndex: this.blocoIndex,
      totalBlocos: this.blocos.length,

      proximoBloco: this._proximoBloco(),

      paceSegPorKm: this.paceAtualSegPorKm,

      distanciaNoBloco: this.distanciaNoBloco,
      distanciaTotalM: this.distanciaTotalM,

      tempoTotalS: this._tempoTotalS(),
      tempoNoBlocoS: this._tempoNoBlocoS(),

      progressoBloco: this._calcularProgressoBloco(bloco),

      distanciaRestanteM: restante.distanciaRestanteM,
      tempoRestanteS: restante.tempoRestanteS,

      forcarNovoBloco,

      finalizado: this.finalizado
    };

    this.onUpdate(state);
  }
}

// ==========================================
// 🌍 EXPOSIÇÃO GLOBAL
// ==========================================

window.RunExecutor = RunExecutor;

console.log("🏃 RunExecutor V3 carregado.");
