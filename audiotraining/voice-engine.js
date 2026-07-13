// ================================
// 🔊 RUN COACH VOICE ENGINE V4
// Pausa entre falas + voz mais calma
// ================================

const VoiceEngine = {

  fila: [],
  falando: false,

  ultimoTipo: null,
  ultimoTempo: 0,

  vozSelecionada: null,

  utteranceAtual: null,

  PAUSA_ENTRE_FALAS_MS: 350,

  desbloquear() {
    if (!("speechSynthesis" in window)) return;

    try {
      const silencio = new SpeechSynthesisUtterance(" ");
      silencio.volume = 0;
      window.speechSynthesis.speak(silencio);
      console.log("🔊 Áudio destravado (iOS).");
    } catch (e) {
      console.warn("Falha ao destravar áudio:", e.message);
    }
  },

  falar(texto, { prioridade = false, tipo = "normal" } = {}) {
    if (!texto) return;
    if (!("speechSynthesis" in window)) return;

    const agora = Date.now();

    if (
      !prioridade &&
      tipo === this.ultimoTipo &&
      agora - this.ultimoTempo < 12000
    ) {
      return;
    }

    if (prioridade) {
      window.speechSynthesis.cancel();
      this.fila = [];
      this.falando = false;
    }

    if (this.fila.length > 2) {
      this.fila.shift();
    }

    this.fila.push({ texto, tipo });

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

    fala.rate = 1.0;
    fala.pitch = 1.0;
    fala.volume = 1;

    const voz = this._obterVoz();
    if (voz) fala.voice = voz;

    this.utteranceAtual = fala;

    fala.onend = () => {
      this.utteranceAtual = null;
      setTimeout(() => {
        this.falando = false;
        this._processarFila();
      }, this.PAUSA_ENTRE_FALAS_MS);
    };

    fala.onerror = (e) => {
      console.warn("Erro na síntese de voz:", e.error);
      this.utteranceAtual = null;
      this.falando = false;
      this._processarFila();
    };

    window.speechSynthesis.speak(fala);
  },

  _obterVoz() {
    if (this.vozSelecionada) return this.vozSelecionada;

    const vozes = window.speechSynthesis.getVoices();

    if (!vozes || !vozes.length) return null;

    this.vozSelecionada =
      vozes.find(v =>
        v.lang === "pt-BR" &&
        /female|feminina|maria|luciana|google/i.test(v.name)
      ) ||
      vozes.find(v => v.lang === "pt-BR") ||
      vozes.find(v => v.lang?.startsWith("pt")) ||
      null;

    return this.vozSelecionada;
  },

  limparFila() {
    this.fila = [];
    window.speechSynthesis.cancel();
    this.falando = false;
    this.utteranceAtual = null;
  }

};

window.speechSynthesis.onvoiceschanged = () => {
  VoiceEngine.vozSelecionada = null;
  VoiceEngine._obterVoz();
};

window.VoiceEngine = VoiceEngine;

console.log("🔊 VoiceEngine V4 carregado.");
