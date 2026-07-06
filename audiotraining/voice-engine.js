// ================================
// 🔊 RUN COACH VOICE ENGINE
// Responsável APENAS pela reprodução de voz.
// ================================

const VoiceEngine = {

  fila: [],
  falando: false,

  ultimoTipo: null,
  ultimoTempo: 0,

  /**
   * Fala um texto.
   * prioridade=true interrompe qualquer fala atual.
   */
  falar(texto, { prioridade = false, tipo = "normal" } = {}) {

    if (!("speechSynthesis" in window)) return;

    const agora = Date.now();

    // Evita repetir o mesmo tipo de aviso em pouco tempo
    if (
      !prioridade &&
      tipo === this.ultimoTipo &&
      agora - this.ultimoTempo < 20000
    ) {
      return;
    }

    if (prioridade) {
      window.speechSynthesis.cancel();
      this.fila = [];
      this.falando = false;
    }

    this.fila.push({
      texto,
      tipo
    });

    this._processarFila();
  },

  _processarFila() {

    if (this.falando) return;

    if (this.fila.length === 0) return;

    this.falando = true;

    const item = this.fila.shift();

    this.ultimoTipo = item.tipo;
    this.ultimoTempo = Date.now();

    const fala = new SpeechSynthesisUtterance(item.texto);

    fala.lang = "pt-BR";
    fala.rate = 1.02;
    fala.pitch = 1;
    fala.volume = 1;

    fala.onend = () => {
      this.falando = false;
      this._processarFila();
    };

    fala.onerror = () => {
      this.falando = false;
      this._processarFila();
    };

    window.speechSynthesis.speak(fala);
  },

  limparFila() {
    this.fila = [];
    window.speechSynthesis.cancel();
    this.falando = false;
  }

};

// Disponibiliza globalmente
window.VoiceEngine = VoiceEngine;
