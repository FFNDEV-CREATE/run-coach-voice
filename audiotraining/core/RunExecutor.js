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

    this.onBlocoCompleto = null;
    this.onFinalizado = null;

    this.finalizado = false;
  }

  iniciar() {
    if (!this.blocos.length) return;

    this.tempoInicioTotal = Date.now();
    this.finalizado = false;

    this._iniciarBlocoAtual();
  }

  atualizar(gpsUpdate) {
    if (this.finalizado) return;

    this.ultimoUpdate = gpsUpdate;

    const { distanciaDeltaM, paceSegPorKm } = gpsUpdate || {};

    this.distanciaTotalM += distanciaDeltaM || 0;
    this.distanciaNoBloco += distanciaDeltaM || 0;

    this._emitirEstado(paceSegPorKm);
    this._verificarMetaBloco();
  }

  _iniciarBlocoAtual() {
    const bloco = this._blocoAtual();
    if (!bloco) return this._finalizarTreino();

    this.tempoInicioBloco = Date.now();
    this.distanciaNoBloco = 0;

    this._emitirEstado(null, true);
  }

  _blocoAtual() {
    return this.blocos[this.blocoIndex];
  }

  _verificarMetaBloco() {
    const bloco = this._blocoAtual();
    if (!bloco) return;

    const tempoDecorrido = (Date.now() - this.tempoInicioBloco) / 1000;

    let concluido = false;

    if (bloco.meta_tipo === "distancia") {
      concluido = this.distanciaNoBloco >= bloco.meta_valor;
    }

    if (bloco.meta_tipo === "tempo") {
      concluido = tempoDecorrido >= bloco.meta_valor;
    }

    if (concluido) {
      this._finalizarBloco();
    }
  }

  _finalizarBloco() {
    const bloco = this._blocoAtual();

    const tempoBloco = (Date.now() - this.tempoInicioBloco) / 1000;

    const paceMedio =
      this.distanciaNoBloco > 0
        ? tempoBloco / (this.distanciaNoBloco / 1000)
        : null;

    if (this.onBlocoCompleto) {
      this.onBlocoCompleto(
        this.blocoIndex,
        bloco,
        paceMedio,
        this.distanciaNoBloco,
        tempoBloco
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

  _emitirEstado(paceSegPorKm, forcarNovoBloco = false) {
    const bloco = this._blocoAtual();

    const state = {
      bloco,
      blocoIndex: this.blocoIndex,
      paceSegPorKm,
      distanciaNoBloco: this.distanciaNoBloco,
      distanciaTotalM: this.distanciaTotalM,
      tempoTotalS: this.tempoInicioTotal
        ? (Date.now() - this.tempoInicioTotal) / 1000
        : 0,
      forcarNovoBloco
    };

    this.onUpdate(state);
  }
}

// EXPOSIÇÃO GLOBAL (IMPORTANTE PARA SEU APP ATUAL)
window.RunExecutor = RunExecutor;
