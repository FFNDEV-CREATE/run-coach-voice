// ==========================================
// 🛰️ GPS TRACKER V1
// ==========================================

class GPSTracker {

  constructor(onUpdate) {

    this.onUpdate = onUpdate;

    this.watchId = null;

    this.ativo = false;

    this.distanciaTotalM = 0;

    this.ultimaPosicao = null;

    this.ultimoTimestamp = null;

  }

}

// ==========================================
// 🌍 EXPOSIÇÃO GLOBAL
// ==========================================

window.GPSTracker = GPSTracker;

console.log("🛰️ GPSTracker carregado.");
