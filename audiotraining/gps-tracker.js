// ==========================================
// 🛰️ GPS TRACKER V5
// GPS real + modo teste + pausar/retomar
// ==========================================

class GPSTracker {

  constructor(onUpdate) {
    this.onUpdate = onUpdate;

    this.watchId = null;
    this.intervaloTeste = null;

    this.ativo = false;
    this.modoTeste = false;
    this.pausado = false;

    this.distanciaTotalM = 0;

    this.ultimaPosicao = null;
    this.ultimoTimestamp = null;

    this.velocidadeTesteMS = 2.8;
  }

  iniciar() {
    if (this.ativo) return;

    if (!("geolocation" in navigator)) {
      throw new Error("Geolocalização não disponível neste navegador.");
    }

    this.ativo = true;
    this.pausado = false;

    this.watchId = navigator.geolocation.watchPosition(
      (posicao) => this._processarPosicao(posicao),
      (erro) => console.error("Erro de GPS:", erro),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );

    console.log("🛰️ GPSTracker iniciado.");
  }

  pausar() {
    if (!this.ativo || this.pausado) return;

    this.pausado = true;

    if (this.intervaloTeste !== null) {
      clearInterval(this.intervaloTeste);
      this.intervaloTeste = null;
    }

    console.log("⏸️ GPSTracker pausado.");
  }

  retomar() {
    if (!this.ativo || !this.pausado) return;

    this.pausado = false;

    this.ultimaPosicao = null;
    this.ultimoTimestamp = null;

    if (this.modoTeste) {
      this._iniciarMovimentoTeste();
    }

    console.log("▶️ GPSTracker retomado.");
  }

  parar() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    if (this.intervaloTeste !== null) {
      clearInterval(this.intervaloTeste);
    }

    this.watchId = null;
    this.intervaloTeste = null;
    this.ativo = false;
    this.pausado = false;

    console.log("🛑 GPSTracker parado.");
  }

  _processarPosicao(posicao) {
    if (this.pausado) return;

    const coords = posicao.coords;

    if (!coords) return;

    if (coords.accuracy && coords.accuracy > 200 && !this.modoTeste) {
      console.warn("GPS descartado por baixa precisão:", coords.accuracy);
      return;
    }

    const atual = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      timestamp: posicao.timestamp
    };

    if (!this.ultimaPosicao) {
      this.ultimaPosicao = atual;
      this.ultimoTimestamp = atual.timestamp;

      console.log("📍 Primeiro ponto GPS recebido.");

      if (this.modoTeste) {
        this._iniciarMovimentoTeste();
      }

      return;
    }

    this._gerarUpdatePorPosicao(atual);
  }

  _gerarUpdatePorPosicao(atual) {
    let distanciaDeltaM = this._calcularDistanciaM(
      this.ultimaPosicao.latitude,
      this.ultimaPosicao.longitude,
      atual.latitude,
      atual.longitude
    );

    let tempoDeltaS = (atual.timestamp - this.ultimoTimestamp) / 1000;

    if (tempoDeltaS <= 0) return;

    let velocidadeMS = distanciaDeltaM / tempoDeltaS;

    if (this.modoTeste && distanciaDeltaM < 0.5) {
      const simulado = this._gerarMovimentoTeste(tempoDeltaS);
      distanciaDeltaM = simulado.distanciaDeltaM;
      velocidadeMS = simulado.velocidadeMS;
    }

    if (velocidadeMS > 8 && !this.modoTeste) {
      console.warn("GPS descartado por salto irreal:", velocidadeMS);
      return;
    }

    this._emitirUpdate(distanciaDeltaM, velocidadeMS, atual.accuracy, this.modoTeste ? "gps-teste" : "gps");

    this.ultimaPosicao = atual;
    this.ultimoTimestamp = atual.timestamp;
  }

  _iniciarMovimentoTeste() {
    if (this.intervaloTeste !== null) return;

    this.intervaloTeste = setInterval(() => {
      if (!this.ativo || !this.modoTeste || this.pausado) return;

      const simulado = this._gerarMovimentoTeste(1);

      this._emitirUpdate(
        simulado.distanciaDeltaM,
        simulado.velocidadeMS,
        this.ultimaPosicao?.accuracy || null,
        "gps-teste"
      );
    }, 1000);

    console.log("🧪 Movimento GPS teste iniciado.");
  }

  _gerarMovimentoTeste(tempoDeltaS) {
    const variacao = (Math.random() - 0.5) * 0.4;

    const velocidadeMS = Math.max(
      2.2,
      Math.min(3.6, this.velocidadeTesteMS + variacao)
    );

    return {
      velocidadeMS,
      distanciaDeltaM: velocidadeMS * tempoDeltaS
    };
  }

  _emitirUpdate(distanciaDeltaM, velocidadeMS, accuracy, origem) {
    this.distanciaTotalM += distanciaDeltaM;

    const paceSegPorKm =
      velocidadeMS > 0
        ? 1000 / velocidadeMS
        : null;

    this.onUpdate({
      distanciaDeltaM,
      distanciaTotalM: this.distanciaTotalM,
      paceSegPorKm,
      velocidadeMS,
      accuracy,
      tempo: Date.now(),
      origem
    });
  }

  _calcularDistanciaM(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const rad = Math.PI / 180;

    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

}

window.GPSTracker = GPSTracker;

console.log("🛰️ GPSTracker V5 carregado.");
