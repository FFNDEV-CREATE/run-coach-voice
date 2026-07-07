// ==========================================
// 🛰️ GPS TRACKER V3
// Distância + pace + modo teste com movimento
// ==========================================

class GPSTracker {

  constructor(onUpdate) {
    this.onUpdate = onUpdate;

    this.watchId = null;
    this.ativo = false;

    this.modoTeste = false;

    this.distanciaTotalM = 0;

    this.ultimaPosicao = null;
    this.ultimoTimestamp = null;

    this.velocidadeTesteMS = 2.8; // ~5:57/km
  }

  iniciar() {
    if (this.ativo) return;

    if (!("geolocation" in navigator)) {
      throw new Error("Geolocalização não disponível neste navegador.");
    }

    this.ativo = true;

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

  parar() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    this.watchId = null;
    this.ativo = false;

    console.log("🛑 GPSTracker parado.");
  }

  _processarPosicao(posicao) {
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
      return;
    }

    let distanciaDeltaM = this._calcularDistanciaM(
      this.ultimaPosicao.latitude,
      this.ultimaPosicao.longitude,
      atual.latitude,
      atual.longitude
    );

    let tempoDeltaS = (atual.timestamp - this.ultimoTimestamp) / 1000;

    if (tempoDeltaS <= 0) return;

    let velocidadeMS = distanciaDeltaM / tempoDeltaS;

    // modo teste: se o computador estiver parado, simula movimento
    if (this.modoTeste && distanciaDeltaM < 0.5) {
      const variacao = (Math.random() - 0.5) * 0.3;
      velocidadeMS = Math.max(2.2, Math.min(3.4, this.velocidadeTesteMS + variacao));
      distanciaDeltaM = velocidadeMS * tempoDeltaS;
    }

    if (velocidadeMS > 8 && !this.modoTeste) {
      console.warn("GPS descartado por salto irreal:", velocidadeMS);
      return;
    }

    this.distanciaTotalM += distanciaDeltaM;

    const paceSegPorKm =
      velocidadeMS > 0
        ? 1000 / velocidadeMS
        : null;

    this.ultimaPosicao = atual;
    this.ultimoTimestamp = atual.timestamp;

    this.onUpdate({
      distanciaDeltaM,
      distanciaTotalM: this.distanciaTotalM,
      paceSegPorKm,
      velocidadeMS,
      accuracy: atual.accuracy,
      tempo: Date.now(),
      origem: this.modoTeste ? "gps-teste" : "gps"
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

console.log("🛰️ GPSTracker carregado.");
