// ================================
// 🔊 RUN COACH VOICE ENGINE V2
// Voz mais rápida, curta e natural
// ================================

const VoiceEngine = {

  fila: [],
  falando: false,

  ultimoTipo: null,
  ultimoTempo: 0,

  vozSelecionada: null,

  falar(texto, { prioridade = false, tipo = "normal" } = {}) {
    if (!texto) return;
    if (!("speechSynthesis" in window)) return;

    const agora = Date.now();

    // evita repetição, mas permite blocos e alertas importantes
    if (
      !prioridade &&
      tipo === this.ultimoTipo &&
      agora - this.ultimoTempo < 12000
    ) {
      return;
    }

    // fala de treino não pode acumular fila longa
    if (prioridade) {
      window.speechSynthesis.cancel();
      this.fila = [];
      this.falando = false;
    }

    // se já tem muita fala acumulada, descarta a mais antiga
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

    // mais dinâmica, menos robótica
    fala.rate = 1.18;
    fala.pitch = 1.08;
    fala.volume = 1;

    const voz = this._obterVoz();
    if (voz) fala.voice = voz;

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

  _obterVoz() {
    if (this.vozSelecionada) return this.vozSelecionada;

    const vozes = window.speechSynthesis.getVoices();

    if (!vozes || !vozes.length) return null;

    // tenta priorizar voz brasileira feminina/natural quando existir
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
  }

};

window.speechSynthesis.onvoiceschanged = () => {
  VoiceEngine.vozSelecionada = null;
  VoiceEngine._obterVoz();
};

window.VoiceEngine = VoiceEngine;

console.log("🔊 VoiceEngine V2 carregado.");
