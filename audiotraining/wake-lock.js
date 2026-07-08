// ==========================================
// 🔆 WAKE LOCK MANAGER
// Mantém a tela ligada durante o treino
// ==========================================

const WakeLockManager = {

  wakeLock: null,

  suportado() {
    return "wakeLock" in navigator;
  },

  async ativar() {
    if (!this.suportado()) {
      console.warn("Wake Lock não suportado neste navegador.");
      return;
    }

    try {
      this.wakeLock = await navigator.wakeLock.request("screen");

      console.log("🔆 Wake Lock ativado (tela vai ficar ligada).");

      this.wakeLock.addEventListener("release", () => {
        console.log("🔆 Wake Lock liberado.");
      });

    } catch (e) {
      console.warn("Não foi possível ativar o Wake Lock:", e.message);
    }
  },

  async liberar() {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch (e) {}
      this.wakeLock = null;
    }
  },

  // Se o usuário trocar de aba e voltar, o navegador libera o wake lock
  // automaticamente. Isso reativa quando o app volta a ficar visível,
  // caso um treino ainda esteja em andamento.
  configurarReativacao(estaTreinandoFn) {
    document.addEventListener("visibilitychange", async () => {
      if (
        this.wakeLock === null &&
        document.visibilityState === "visible" &&
        estaTreinandoFn()
      ) {
        await this.ativar();
      }
    });
  }

};

window.WakeLockManager = WakeLockManager;

console.log("🔆 WakeLockManager carregado.");
