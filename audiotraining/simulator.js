// ================================
// 🏃‍♂️ GPSSIMULATOR v2
// Simulador de GPS para testes
// ================================

class GPSSimulator {

  constructor(onUpdate) {

    this.onUpdate = onUpdate;

    this.interval = null;
    this.ativo = false;

    this.distanciaTotalM = 0;

    // velocidade média (~10 km/h)
    this.velocidadeMediaMS = 2.8;

    // velocidade atual
    this.velocidadeAtualMS = this.velocidadeMediaMS;
  }

  iniciar() {

    if (this.ativo) return;

    this.ativo = true;

    console.log("🧪 GPSSimulator iniciado");

    this.interval = setInterval(() => {

      this._gerarUpdate();

    }, 1000);

  }

  parar() {

    this.ativo = false;

    clearInterval(this.interval);

    console.log("🛑 GPSSimulator parado");

  }

  _gerarUpdate() {

    // pequena variação aleatória (simula GPS real)
    const variacao = (Math.random() - 0.5) * 0.35;

    this.velocidadeAtualMS += variacao;

    // evita velocidades absurdas
    this.velocidadeAtualMS = Math.max(
      2.2,
      Math.min(4.2, this.velocidadeAtualMS)
    );

    const distanciaDeltaM = this.velocidadeAtualMS;

    this.distanciaTotalM += distanciaDeltaM;

    const paceSegPorKm =
      this.velocidadeAtualMS > 0
        ? 1000 / this.velocidadeAtualMS
        : null;

    this.onUpdate({

      distanciaDeltaM,

      distanciaTotalM: this.distanciaTotalM,

      paceSegPorKm,

      velocidadeMS: this.velocidadeAtualMS,

      tempo: Date.now(),

      origem: "simulador"

    });

  }

}

// ================================
// 🌍 EXPOSIÇÃO GLOBAL
// ================================

window.GPSSimulator = GPSSimulator;
