// ===== Utilitários de formatação =====
function formatPaceMinKm(segPorKm){
  if(!isFinite(segPorKm) || segPorKm <= 0) return "--:--";
  const min = Math.floor(segPorKm/60);
  const seg = Math.round(segPorKm%60);
  return `${min}:${seg.toString().padStart(2,"0")}`;
}
function formatPaceFalado(segPorKm){
  // "6:05" falado como "seis e zero cinco" soa estranho no TTS pt-BR,
  // melhor falar "seis minutos e cinco segundos por quilômetro"
  const min = Math.floor(segPorKm/60);
  const seg = Math.round(segPorKm%60);
  if(seg === 0) return `${min} minutos por quilômetro`;
  return `${min} minutos e ${seg} segundos por quilômetro`;
}
function formatTempo(segundos){
  const h = Math.floor(segundos/3600);
  const m = Math.floor((segundos%3600)/60);
  const s = Math.floor(segundos%60);
  if(h>0) return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
  return `${m}:${s.toString().padStart(2,"0")}`;
}
function haversine(lat1, lon1, lat2, lon2){
  const R = 6371000;
  const toRad = d => d*Math.PI/180;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ===== Motor de voz (TTS) =====
const VoiceEngine = {
  fila: [],
  falando: false,
  falar(texto, {prioridade=false} = {}){
    if(!("speechSynthesis" in window)) return;
    if(prioridade){
      window.speechSynthesis.cancel();
      this.fila = [];
      this.falando = false;
    }
    this.fila.push(texto);
    this._processar();
  },
  _processar(){
    if(this.falando || this.fila.length === 0) return;
    this.falando = true;
    const texto = this.fila.shift();
    const utt = new SpeechSynthesisUtterance(texto);
    utt.lang = "pt-BR";
    utt.rate = 1.0;
    utt.onend = () => { this.falando = false; this._processar(); };
    utt.onerror = () => { this.falando = false; this._processar(); };
    window.speechSynthesis.speak(utt);
  }
};

// ===== Rastreador de GPS com pace suavizado =====
class GPSTracker {
  constructor(onUpdate){
    this.pontos = []; // {lat,lon,t}
    this.watchId = null;
    this.onUpdate = onUpdate;
    this.distanciaTotalM = 0;
    this.janelaSuavizacaoMs = 8000; // últimos 8s para pace instantâneo
  }
  iniciar(){
    if(!("geolocation" in navigator)) throw new Error("Geolocalização não suportada");
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this._onPos(pos),
      (err) => console.warn("Erro GPS:", err),
      { enableHighAccuracy:true, maximumAge:1000, timeout:10000 }
    );
  }
  parar(){
    if(this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
  }
  _onPos(pos){
    const p = { lat: pos.coords.latitude, lon: pos.coords.longitude, t: Date.now() };
    if(this.pontos.length > 0){
      const ultimo = this.pontos[this.pontos.length-1];
      const d = haversine(ultimo.lat, ultimo.lon, p.lat, p.lon);
      // ignora saltos de GPS irreais (>30m em <1s = ruído)
      const dt = (p.t - ultimo.t)/1000;
      if(dt > 0 && d/dt < 12){ // ~12 m/s = pace 1:23/km, acima disso é ruído
        this.distanciaTotalM += d;
      } else if (dt > 0 && d/dt >= 12) {
        // descarta ponto ruidoso, não acumula distância
      }
    }
    this.pontos.push(p);
    // mantém só os pontos da janela de suavização (+ um buffer)
    const limite = Date.now() - this.janelaSuavizacaoMs*2;
    this.pontos = this.pontos.filter(pt => pt.t >= limite);

    const paceAtual = this._calcularPaceSuavizado();
    this.onUpdate({ distanciaTotalM: this.distanciaTotalM, paceSegPorKm: paceAtual });
  }
  _calcularPaceSuavizado(){
    const agora = Date.now();
    const janela = this.pontos.filter(p => agora - p.t <= this.janelaSuavizacaoMs);
    if(janela.length < 2) return null;
    let dist = 0;
    for(let i=1;i<janela.length;i++){
      dist += haversine(janela[i-1].lat, janela[i-1].lon, janela[i].lat, janela[i].lon);
    }
    const tempoS = (janela[janela.length-1].t - janela[0].t)/1000;
    if(dist < 3 || tempoS < 2) return null; // dados insuficientes/parado
    const paceSegPorKm = (tempoS/dist) * 1000;
    return paceSegPorKm;
  }
}

// ===== Executor do treino: máquina de estados bloco a bloco =====
class RunExecutor {
  /**
   * @param {Array} blocos - array padronizado vindo da IA
   * @param {Function} onTick - callback(state) chamado a cada atualização
   */
  constructor(blocos, onTick){
    this.blocos = blocos;
    this.onTick = onTick;
    this.blocoIndex = 0;
    this.distanciaNoBloco = 0;
    this.distanciaAcumuladaAnterior = 0; // distância total ao iniciar o bloco atual
    this.tempoInicioBloco = Date.now();
    this.tempoInicioTotal = Date.now();
    this.ultimoAviso = 0;
    this.ultimoTipoAviso = null;
    this.cooldownMs = 15000;
    this.toleranciaSegKm = 5;
    this.marcosFalados = new Set(); // evita repetir "200m" duas vezes
    this.finalizado = false;
    this.paceHistoricoBloco = []; // para calcular médio real no fim do bloco
    this.amostrasBloco = [];
  }

  get blocoAtual(){ return this.blocos[this.blocoIndex]; }

  iniciar(){
    VoiceEngine.falar(`Treino iniciado. ${this._descreverBloco(this.blocoAtual)}`, {prioridade:true});
    this.tempoInicioBloco = Date.now();
    this.tempoInicioTotal = Date.now();
  }

  _descreverBloco(bloco){
    const metaTxt = bloco.meta_tipo === "distancia"
      ? `${bloco.meta_valor} metros`
      : `${Math.round(bloco.meta_valor/60)} minutos`;
    if(bloco.ritmo_livre){
      return `${bloco.nome}. ${metaTxt}, em ritmo livre.`;
    }
    const paceMedio = (bloco.pace_alvo_min_seg_km + bloco.pace_alvo_max_seg_km)/2;
    return `${bloco.nome}. ${metaTxt}, ritmo de ${formatPaceFalado(paceMedio)}.`;
  }

  // chamado a cada atualização de GPS
  atualizar({distanciaTotalM, paceSegPorKm}){
    if(this.finalizado) return;

    const bloco = this.blocoAtual;
    const distNova = distanciaTotalM - this.distanciaAcumuladaAnterior;
    this.distanciaNoBloco = distNova;
    const tempoNoBlocoS = (Date.now() - this.tempoInicioBloco)/1000;

    if(paceSegPorKm){
      this.amostrasBloco.push(paceSegPorKm);
    }

    // checa avisos de pace (só se bloco tem meta de ritmo)
    if(!bloco.ritmo_livre && paceSegPorKm){
      this._checarPace(paceSegPorKm, bloco);
    }

    // checa marcos intermediários (a cada 100m em blocos de distância)
    if(bloco.meta_tipo === "distancia"){
      const marco = Math.floor(distNova/100)*100;
      if(marco > 0 && marco < bloco.meta_valor && !this.marcosFalados.has(`${this.blocoIndex}-${marco}`)){
        this.marcosFalados.add(`${this.blocoIndex}-${marco}`);
        const falta = bloco.meta_valor - marco;
        VoiceEngine.falar(`${marco} metros. Faltam ${falta}.`);
      }
    }

    // checa se completou o bloco
    const completou = bloco.meta_tipo === "distancia"
      ? distNova >= bloco.meta_valor
      : tempoNoBlocoS >= bloco.meta_valor;

    if(completou){
      this._finalizarBlocoAtual(distanciaTotalM, tempoNoBlocoS);
    }

    this.onTick({
      blocoIndex: this.blocoIndex,
      bloco,
      distanciaNoBloco: distNova,
      tempoNoBlocoS,
      paceSegPorKm,
      distanciaTotalM,
      tempoTotalS: (Date.now()-this.tempoInicioTotal)/1000,
      finalizado: this.finalizado
    });
  }

  _checarPace(paceAtual, bloco){
    const agora = Date.now();
    if(agora - this.ultimoAviso < this.cooldownMs) return;

    const min = bloco.pace_alvo_min_seg_km; // mais lento
    const max = bloco.pace_alvo_max_seg_km; // mais rápido

    if(paceAtual > min + this.toleranciaSegKm){
      // correndo mais devagar que o permitido
      if(this.ultimoTipoAviso !== "lento"){
        VoiceEngine.falar("Você está abaixo do ritmo. Acelere um pouco.");
        this.ultimoAviso = agora;
        this.ultimoTipoAviso = "lento";
      }
    } else if(paceAtual < max - this.toleranciaSegKm){
      // correndo mais rápido que o permitido
      if(this.ultimoTipoAviso !== "rapido"){
        VoiceEngine.falar("Você está rápido demais. Segure o ritmo.");
        this.ultimoAviso = agora;
        this.ultimoTipoAviso = "rapido";
      }
    } else {
      this.ultimoTipoAviso = "ok";
    }
  }

  _finalizarBlocoAtual(distanciaTotalM, tempoNoBlocoS){
    const bloco = this.blocoAtual;
    const paceRealMedio = this.amostrasBloco.length
      ? this.amostrasBloco.reduce((a,b)=>a+b,0)/this.amostrasBloco.length
      : null;

    if(this.onBlocoCompleto){
      this.onBlocoCompleto(this.blocoIndex, bloco, paceRealMedio, this.distanciaNoBloco, tempoNoBlocoS);
    }

    this.blocoIndex++;
    this.distanciaAcumuladaAnterior = distanciaTotalM;
    this.tempoInicioBloco = Date.now();
    this.amostrasBloco = [];
    this.ultimoTipoAviso = null;

    if(this.blocoIndex >= this.blocos.length){
      this.finalizado = true;
      VoiceEngine.falar("Treino concluído! Parabéns pelo esforço.", {prioridade:true});
      if(this.onFinalizado) this.onFinalizado();
    } else {
      VoiceEngine.falar(`Bloco concluído! ${this._descreverBloco(this.blocoAtual)}`, {prioridade:true});
    }
  }
}

// ===== MODO SIMULAÇÃO (para testes sem GPS) =====
class GPSSimulator {
  constructor(onUpdate){
    this.onUpdate = onUpdate;
    this.distanciaTotalM = 0;
    this.intervalo = null;
    // Simula pace variável entre 5:30 e 6:30 /km
    this.paceAtualSegKm = 360;
  }
  iniciar(){
    // A cada 2 segundos, avança como se estivesse correndo
    this.intervalo = setInterval(() => {
      // Varia o pace levemente para simular corrida real (+/- ruído)
      const variacao = (Math.random() - 0.5) * 20; // ±10 seg/km
      this.paceAtualSegKm = Math.max(300, Math.min(450, this.paceAtualSegKm + variacao));

      // Calcula quantos metros percorreu em 2 segundos nesse pace
      const metrosPor2Seg = (2 / this.paceAtualSegKm) * 1000;
      this.distanciaTotalM += metrosPor2Seg;

      this.onUpdate({
        distanciaTotalM: this.distanciaTotalM,
        paceSegPorKm: this.paceAtualSegKm
      });
    }, 2000);
  }
  parar(){
    if(this.intervalo) clearInterval(this.intervalo);
  }
}
