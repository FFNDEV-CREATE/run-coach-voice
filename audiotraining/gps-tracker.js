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

  iniciar() {

    if (this.ativo) return;

    if (!("geolocation" in navigator)) {

      throw new Error("Geolocalização não disponível neste navegador.");

    }

    this.ativo = true;

    this.watchId = navigator.geolocation.watchPosition(

      (posicao) => {

        console.log("📍 GPS posição recebida", posicao.coords);

      },

      (erro) => {

        console.error("Erro de GPS:", erro);

      },

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

}

// ==========================================
// 🌍 EXPOSIÇÃO GLOBAL
// ==========================================

window.GPSTracker = GPSTracker;

console.log("🛰️ GPSTracker carregado.");
