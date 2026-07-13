"use strict";

// =======================================================
// RUN COACH VOICE
// APP.JS V3 (com Wake Lock)
// =======================================================

// ===============================
// DEPENDÊNCIAS
// ===============================

const Dependencies = {
  SupabaseClient: window.SupabaseClient,
  RunExecutor: window.RunExecutor,
  VoiceEngine: window.VoiceEngine,
  coachBrain: window.coachBrain,
  WakeLockManager: window.WakeLockManager
};

function verificarDependencias() {

  const faltando = [];

  if (!Dependencies.SupabaseClient)
    faltando.push("SupabaseClient");

  if (!Dependencies.RunExecutor)
    faltando.push("RunExecutor");

  if (!Dependencies.VoiceEngine)
    faltando.push("VoiceEngine");

  if (!Dependencies.coachBrain)
    faltando.push("CoachBrain");

  if (!Dependencies.WakeLockManager)
    faltando.push("WakeLockManager");

  if (faltando.length) {
    console.error(
      "Dependências não carregadas:",
      faltando.join(", ")
    );
  }
}

// ===============================
// CACHE DA INTERFACE
// ===============================

const UI = {

  views: {
    lista: document.getElementById("view-lista"),
    novo: document.getElementById("view-novo"),
    execucao: document.getElementById("view-execucao")
  },

  navButtons:
    document.querySelectorAll(".navbtn[data-view]"),

  listaTreinos:
    document.getElementById("lista-treinos"),

  novoTreino: {

    texto:
      document.getElementById("texto-treino"),

    interpretar:
      document.getElementById("btn-interpretar"),

    salvar:
      document.getElementById("btn-salvar-treino"),

    descartar:
      document.getElementById("btn-descartar"),

    erro:
      document.getElementById("erro-interpretar"),

    revisao:
      document.getElementById("revisao-blocos"),

    listaBlocos:
      document.getElementById("lista-blocos-revisao")
  },

  execucao: {

    blocoNome:
      document.getElementById("exec-bloco-nome"),

    status:
      document.getElementById("exec-status-msg"),

    paceAtual:
      document.getElementById("exec-pace-atual"),

    distanciaBloco:
      document.getElementById("exec-distancia-bloco"),

    metaBloco:
      document.getElementById("exec-meta-bloco"),

    tempoTotal:
      document.getElementById("exec-tempo-total"),

    distanciaTotal:
      document.getElementById("exec-distancia-total"),

    paceRing:
      document.getElementById("exec-pace-ring"),

    timeline:
      document.getElementById("exec-timeline"),

    iniciar:
      document.getElementById("btn-iniciar-exec"),

    simular:
      document.getElementById("btn-simular-exec"),

    parar:
      document.getElementById("btn-parar")
  }

};

// ===============================
// ESTADO GLOBAL
// ===============================

const AppState = {

  treinoAtual: null,

  executor: null,

  gpsTracker: null,

  execucaoId: null,

  blocosInterpretados: null,

  tituloInterpretado: "",

  modo: null,

  executando: false

};

// ===============================
// NAVEGAÇÃO
// ===============================

const Navigation = {

  mostrar(view) {

    Object.values(UI.views)
      .forEach(v => v.classList.remove("active"));

    UI.views[view].classList.add("active");

    UI.navButtons.forEach(btn =>
      btn.classList.remove("active")
    );

    const ativo = document.querySelector(
      `.navbtn[data-view="${view}"]`
    );

    if (ativo)
      ativo.classList.add("active");

  },

  configurar() {

    UI.navButtons.forEach(btn => {

      btn.addEventListener("click", () => {

        const view = btn.dataset.view;

        Navigation.mostrar(view);

        if (view === "lista") {

          TrainingList.carregar();

        }

      });

    });

  }

};

// ===============================
// HELPERS
// ===============================

function formatTempo(segundos) {

  segundos = Math.max(0, Math.floor(segundos || 0));

  const m = Math.floor(segundos / 60);
  const s = segundos % 60;

  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;

}

function formatPaceMinKm(segundos) {

  if(!segundos) return "--:--";

  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);

  return `${m}:${String(s).padStart(2,"0")}`;

}

function formatarTempoBloco(segundos){

  if(segundos < 60)
    return `${segundos} seg`;

  if(segundos % 60 === 0)
    return `${segundos/60} min`;

  return `${Math.floor(segundos/60)}min ${segundos%60}seg`;

}

function obterBlocos(treino){

  return treino?.blocos?.blocos || [];

}

// ===============================
// LISTA DE TREINOS
// ===============================

const TrainingList = {

  async carregar(){

    UI.listaTreinos.innerHTML =
      `<p class="empty-state">Carregando treinos...</p>`;

    try{

      const treinos =
        await Dependencies.SupabaseClient.listarTreinos();

      if(!treinos.length){

        UI.listaTreinos.innerHTML =
          `<p class="empty-state">Nenhum treino encontrado.</p>`;

        return;

      }

      UI.listaTreinos.innerHTML = "";

      treinos.forEach(treino=>{

        const card = document.createElement("div");

        card.className = "treino-card";

        card.innerHTML = `
          <h3>${treino.titulo}</h3>
          <p>${obterBlocos(treino).length} blocos</p>
        `;

        card.onclick = ()=>ExecutionController.abrir(treino);

        UI.listaTreinos.appendChild(card);

      });

    }

    catch(e){

      console.error(e);

      UI.listaTreinos.innerHTML =
      `<p class="empty-state">Erro ao carregar treinos.</p>`;

    }

  }

};

// ===============================
// NOVO TREINO
// ===============================

const NewTraining = {

  configurar(){

    UI.novoTreino.interpretar.onclick =
      ()=>this.interpretar();

    UI.novoTreino.salvar.onclick =
      ()=>this.salvar();

    UI.novoTreino.descartar.onclick =
      ()=>this.descartar();

  },

  async interpretar(){

    const texto =
      UI.novoTreino.texto.value.trim();

    if(!texto){

      UI.novoTreino.erro.hidden = false;
      UI.novoTreino.erro.textContent =
      "Digite um treino.";

      return;

    }

    UI.novoTreino.erro.hidden = true;

    try{

      const resultado =
      await Dependencies.SupabaseClient.parseTreino(texto);

      AppState.blocosInterpretados =
      resultado.blocos;

      AppState.tituloInterpretado =
      resultado.titulo;

      this.renderizar(resultado.blocos);

    }

    catch(e){

      UI.novoTreino.erro.hidden = false;

      UI.novoTreino.erro.textContent =
      e.message;

    }

  },

  renderizar(blocos){

    UI.novoTreino.listaBlocos.innerHTML="";

    blocos.forEach(bloco=>{

      const card=document.createElement("div");

      card.className =
      "bloco-card"+(bloco.ritmo_livre?" livre":"");

      const pace = bloco.ritmo_livre
      ? "Ritmo livre"
      : `${formatPaceMinKm(bloco.pace_alvo_max_seg_km)}
         - ${formatPaceMinKm(bloco.pace_alvo_min_seg_km)}`;

      card.innerHTML=`

      <div>

      <div class="bloco-nome">
      ${bloco.nome}
      </div>

      <div class="bloco-meta">

      ${
        bloco.meta_tipo==="distancia"
        ? bloco.meta_valor+" m"
        : formatarTempoBloco(bloco.meta_valor)
      }

      </div>

      </div>

      <div class="bloco-pace">

      ${pace}

      </div>

      `;

      UI.novoTreino.listaBlocos.appendChild(card);

    });

    UI.novoTreino.revisao.hidden=false;

  },

  async salvar(){

    await Dependencies.SupabaseClient.salvarTreino(

      AppState.tituloInterpretado,

      UI.novoTreino.texto.value,

      {
        blocos:AppState.blocosInterpretados
      }

    );

    Navigation.mostrar("lista");

    TrainingList.carregar();

  },

  descartar(){

    AppState.blocosInterpretados = null;

    UI.novoTreino.revisao.hidden = true;

  }

};

// ===============================
// EXECUTION CONTROLLER
// ===============================

const ExecutionController = {

  abrir(treino){

    AppState.treinoAtual = treino;

    Navigation.mostrar("execucao");

    UI.execucao.blocoNome.textContent = treino.titulo;

    UI.execucao.status.textContent =
      "Toque em iniciar para começar";

    UI.execucao.iniciar.hidden = false;
    UI.execucao.simular.hidden = false;

    this.renderTimeline(obterBlocos(treino),-1);

  },

  configurar(){

    UI.execucao.iniciar.onclick =
      ()=>this.iniciarGPS();

    UI.execucao.simular.onclick =
      ()=>this.iniciarSimulacao();

    UI.execucao.parar.onclick =
      ()=>this.parar();

    // Reativa o Wake Lock automaticamente se o navegador liberá-lo
    // ao trocar de app (ex: usuário abre o Spotify) e o treino
    // ainda estiver em andamento.
    Dependencies.WakeLockManager.configurarReativacao(
      () => AppState.executando
    );

  },

  async iniciarGPS(){

    AppState.modo="gps";

    await Dependencies.WakeLockManager.ativar();

    try{

      const exec=
      await Dependencies.SupabaseClient.criarExecucao(
        AppState.treinoAtual.id
      );

      AppState.execucaoId=exec?.[0]?.id;

    }catch(e){

      console.warn("Modo offline");

    }

    this.iniciarExecutor();

    AppState.gpsTracker =
      new GPSTracker(update=>{

        AppState.executor.atualizar(update);

      });

    // modoTeste permanece false aqui: este é o modo GPS real.
    try {
      AppState.gpsTracker.iniciar();
    } catch (e) {
      UI.execucao.status.textContent =
        "Não foi possível acessar o GPS: " + e.message;
      console.error(e);
      AppState.executando = false;
      Dependencies.WakeLockManager.liberar();
    }

  },

  async iniciarSimulacao(){

    AppState.modo="simulador";

    await Dependencies.WakeLockManager.ativar();

    this.iniciarExecutor();

    AppState.gpsTracker =
      new GPSTracker(update=>{

        AppState.executor.atualizar(update);

      });

    // Modo teste: gera movimento simulado, sem depender do GPS real.
    AppState.gpsTracker.modoTeste = true;

    AppState.gpsTracker.iniciar();

  },

  iniciarExecutor(){

    AppState.executando = true;

    const blocos =
      obterBlocos(AppState.treinoAtual);

    AppState.executor =
      new RunExecutor(blocos,state=>{

        this.atualizarTela(state);

        const resposta =
          coachBrain.analisar(state);

        if(resposta?.falar){

          VoiceEngine.falar(

            resposta.texto,

            {
              prioridade:resposta.prioridade,
              tipo:resposta.tipo
            }

          );

        }

      });

    AppState.executor.onBlocoCompleto =
      (idx,bloco,pace,dist,tempo)=>{

      this.renderTimeline(
        blocos,
        AppState.executor.blocoIndex
      );

      if(AppState.execucaoId){

        Dependencies.SupabaseClient
        .salvarBlocoExecutado(

          AppState.execucaoId,

          idx,

          bloco,

          pace,

          dist,

          tempo

        ).catch(()=>{});

      }

    };

    AppState.executor.onFinalizado =
      ()=>this.finalizar();

    AppState.executor.iniciar();

    UI.execucao.iniciar.hidden=true;
    UI.execucao.simular.hidden=true;

    this.renderTimeline(blocos,0);

  },

  async finalizar(){

    AppState.executando = false;

    UI.execucao.status.textContent =
      "Treino concluído 🎉";

    AppState.gpsTracker?.parar();

    await Dependencies.WakeLockManager.liberar();

    if(AppState.execucaoId){

      try{

        await Dependencies
        .SupabaseClient
        .finalizarExecucao(

          AppState.execucaoId,

          AppState.gpsTracker?.distanciaTotalM || 0,

          (Date.now()-
          AppState.executor.tempoInicioTotal)/1000

        );

      }

      catch(e){}

    }

  },

  async parar(){

    if(!confirm("Parar treino?"))
      return;

    AppState.executando = false;

    AppState.gpsTracker?.parar();

    await Dependencies.WakeLockManager.liberar();

    if(AppState.execucaoId){

      try{

        await Dependencies
        .SupabaseClient
        .finalizarExecucao(

          AppState.execucaoId,

          AppState.gpsTracker?.distanciaTotalM||0,

          (Date.now()-
          AppState.executor.tempoInicioTotal)/1000

        );

      }

      catch(e){}

    }

    Navigation.mostrar("lista");

    TrainingList.carregar();

  },

  atualizarTela(state){

    UI.execucao.blocoNome.textContent =
      state.bloco.nome;

    UI.execucao.paceAtual.textContent =
      formatPaceMinKm(state.paceSegPorKm);

    UI.execucao.distanciaBloco.textContent =
      Math.round(state.distanciaNoBloco)+" m";

    UI.execucao.metaBloco.textContent =
      state.bloco.meta_tipo==="distancia"

      ? state.bloco.meta_valor+" m"

      : formatarTempoBloco(state.bloco.meta_valor);

    UI.execucao.tempoTotal.textContent =
      formatTempo(state.tempoTotalS);

    UI.execucao.distanciaTotal.textContent =
      (state.distanciaTotalM/1000).toFixed(2)+" km";

    const ring = UI.execucao.paceRing;

    ring.classList.remove(
      "ok",
      "rapido",
      "lento"
    );

if(
      !state.bloco.ritmo_livre &&
      state.paceSegPorKm
    ){
      if(
        state.paceSegPorKm >
        state.bloco.pace_alvo_min_seg_km+5
      ){
        ring.classList.add("lento");
      }
      else if(
        state.paceSegPorKm <
        state.bloco.pace_alvo_max_seg_km-5
      ){
        ring.classList.add("rapido");
      }
      else{
        ring.classList.add("ok");
      }
    }
  },

    renderTimeline(blocos, indiceAtual){

    UI.execucao.timeline.innerHTML = "";

    blocos.forEach((bloco,index)=>{

      const item = document.createElement("div");

      item.className = "tl-item";

      if(index < indiceAtual){

        item.classList.add("done");

      }
      else if(index === indiceAtual){

        item.classList.add("current");

      }

      UI.execucao.timeline.appendChild(item);

    });

  }

};

// ===============================
// INICIALIZAÇÃO
// ===============================

function inicializarAplicacao(){

  verificarDependencias();

  Navigation.configurar();

  NewTraining.configurar();

  ExecutionController.configurar();

  TrainingList.carregar();

  console.log("🏃 Run Coach Voice iniciado.");

}

document.addEventListener(
  "DOMContentLoaded",
  inicializarAplicacao
);
