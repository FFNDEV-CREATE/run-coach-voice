// ================================
// 🏃‍♂️ GPSSIMULATOR (para testes)
// ================================

class GPSSimulator {
  constructor(onUpdate) {
    this.onUpdate = onUpdate;

    this.interval = null;
    this.ativo = false;

    this.distanciaTotalM = 0;
    this.velocidadeMediaMS = 2.8; // ~10 km/h padrão
  }

  iniciar() {
    if (this.ativo) return;

    this.ativo = true;

    this.interval = setInterval(() => {
      this._gerarUpdate();
    }, 1000);
  }

  parar() {
    this.ativo = false;
    clearInterval(this.interval);
  }

  _gerarUpdate() {
    // variação realista de pace
    const variacao = (Math.random() - 0.5) * 0.4;
    const velocidade = this.velocidadeMediaMS + variacao;

    const distanciaDeltaM = Math.max(0, velocidade);

    this.distanciaTotalM += distanciaDeltaM;

    const paceSegPorKm = velocidade > 0
      ? 1000 / velocidade
      : null;

    this.onUpdate({
      distanciaDeltaM,
      paceSegPorKm,
      tempo: Date.now(),
      origem: "simulador"
    });
  }
}

// ================================
// 🌍 EXPOSIÇÃO GLOBAL
// ================================

window.GPSSimulator = GPSSimulator;
