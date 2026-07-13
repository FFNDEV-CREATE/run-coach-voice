// ================================
// 🔊 RUN COACH VOICE ENGINE V3
// Corrige silêncio no Safari/iOS
// ================================

const VoiceEngine = {

  fila: [],
  falando: false,

  ultimoTipo: null,
  ultimoTempo: 0,

  vozSelecionada: null,

  // Guarda referência forte do utterance atual.
  // No Safari/iOS, se nada segurar essa referência, o navegador
  // pode descartar a fala silenciosamente antes de reproduzi-la.
  utteranceAtual: null,

  // Chame isso DENTRO de um clique real do usuário (ex: botão "Iniciar"),
  // antes de qualquer código assíncrono. Isso "destrava" o áudio no iOS.
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
    fala.rate = 1.05;
    fala.pitch = 1.0;
    fala.volume = 1;

    const voz = this._obterVoz();
    if (voz) fala.voice = voz;

    // mantém referência forte (evita bug de silêncio no Safari/iOS)
    this.utteranceAtual = fala;

    fala.onend = () => {
      this.falando = false;
      this.utteranceAtual = null;
      this._processarFila();
    };

    fala.onerror = (e) => {
      console.warn("Erro na síntese de voz:", e.error);
      this.falando = false;
      this.utteranceAtual = null;
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
    this.utteranceAtual = null;
  }

};

window.speechSynthesis.onvoiceschanged = () => {
  VoiceEngine.vozSelecionada = null;
  VoiceEngine._obterVoz();
};

window.VoiceEngine = VoiceEngine;

console.log("🔊 VoiceEngine V3 carregado.");
