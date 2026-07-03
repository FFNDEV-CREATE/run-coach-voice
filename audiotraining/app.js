"use strict";

// ===============================
// RUN EXECUTOR (compatibilidade)
// ===============================
const RunExecutorClass =
  window.RunExecutor;

// fallback seguro
if (!RunExecutorClass) {
  console.error("RunExecutor não carregado. Verifique core/RunExecutor.js");
}

// ===============================
// NAVEGAÇÃO
// ===============================
function mostrarView(nome){
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${nome}`).classList.add("active");
  document.querySelectorAll(".navbtn").forEach(b => b.classList.remove("active"));
  const btn = document.querySelector(`.navbtn[data-view="${nome}"]`);
  if(btn) btn.classList.add("active");
}

document.querySelectorAll(".navbtn[data-view]").forEach(btn=>{
  btn.addEventListener("click", () => {
    mostrarView(btn.dataset.view);
    if(btn.dataset.view === "lista") carregarTreinos();
  });
});

// ===============================
// LISTA DE TREINOS
// ===============================
async function carregarTreinos(){
  const container = document.getElementById("lista-treinos");
  container.innerHTML = `<p class="empty-state">Carregando treinos…</p>`;

  try{
    const treinos = await SupabaseClient.listarTreinos();

    if(!treinos?.length){
      container.innerHTML = `<p class="empty-state">Nenhum treino ainda. Toque em "Novo treino".</p>`;
      return;
    }

    container.innerHTML = "";

    treinos.forEach(t => {
      const card = document.createElement("div");
      card.className = "treino-card";

      const nBlocos = (t.blocos?.blocos || []).length;

      card.innerHTML = `
        <h3>${t.titulo}</h3>
        <p>${nBlocos} blocos · ${new Date(t.criado_em).toLocaleDateString("pt-BR")}</p>
      `;

      card.addEventListener("click", () => abrirExecucao(t));
      container.appendChild(card);
    });

  } catch(e){
    console.error(e);
    container.innerHTML = `<p class="empty-state">Erro ao carregar treinos.</p>`;
  }
}

// ===============================
// VARIÁVEIS GLOBAIS
// ===============================
let blocosInterpretados = null;
let tituloInterpretado = "";

let treinoAtual = null;
let executor = null;
let gpsTracker = null;
let execucaoId = null;

// ===============================
// EXECUÇÃO TREINO
// ===============================
function abrirExecucao(treino){
  treinoAtual = treino;

  mostrarView("execucao");

  document.getElementById("exec-bloco-nome").textContent = treino.titulo;
  document.getElementById("exec-status-msg").textContent = "Toque em iniciar";

  document.getElementById("btn-iniciar-exec").hidden = false;
  document.getElementById("btn-simular-exec").hidden = false;

  renderTimeline(treino.blocos.blocos, -1);
}

function renderTimeline(blocos, indexAtual){
  const tl = document.getElementById("exec-timeline");
  tl.innerHTML = "";

  blocos.forEach((b,i)=>{
    const item = document.createElement("div");
    item.className =
      "tl-item " +
      (i < indexAtual ? "done" : i === indexAtual ? "current" : "");
    tl.appendChild(item);
  });
}

// ===============================
// INICIAR TREINO (GPS)
// ===============================
document.getElementById("btn-iniciar-exec").addEventListener("click", async () => {
  if(!treinoAtual || !RunExecutorClass) return;

  try{
    const exec = await SupabaseClient.criarExecucao(treinoAtual.id);
    execucaoId = exec?.[0]?.id || null;
  } catch(e){
    console.warn("Execução offline");
  }

  const blocos = treinoAtual.blocos.blocos;

  executor = new RunExecutorClass(blocos, atualizarTelaExecucao);

  executor.onBlocoCompleto = (idx, bloco, pace, dist, tempo) => {
    if(execucaoId){
      SupabaseClient.salvarBlocoExecutado(
        execucaoId,
        idx,
        bloco,
        pace,
        dist,
        tempo
      ).catch(()=>{});
    }

    renderTimeline(blocos, executor.blocoIndex);
  };

  executor.onFinalizado = async () => {
    document.getElementById("exec-status-msg").textContent = "Treino concluído 🎉";
    document.getElementById("btn-iniciar-exec").hidden = true;

    try{
      if(execucaoId && gpsTracker){
        await SupabaseClient.finalizarExecucao(
          execucaoId,
          gpsTracker.distanciaTotalM,
          (Date.now()-executor.tempoInicioTotal)/1000
        );
      }
    } catch(e){}

    gpsTracker?.parar();
  };

  gpsTracker = new GPSTracker((update)=>executor.atualizar(update));

  try{
    gpsTracker.iniciar();
  } catch(e){
    alert("GPS indisponível");
    return;
  }

  executor.iniciar();
  renderTimeline(blocos, 0);

  document.getElementById("btn-iniciar-exec").hidden = true;
});

// ===============================
// SIMULAÇÃO
// ===============================
document.getElementById("btn-simular-exec").addEventListener("click", async () => {
  if(!treinoAtual || !RunExecutorClass) return;

  const blocos = treinoAtual.blocos.blocos;

  executor = new RunExecutorClass(blocos, atualizarTelaExecucao);

  executor.onBlocoCompleto = (idx, bloco, pace, dist, tempo) => {
    renderTimeline(blocos, executor.blocoIndex);
  };

  executor.onFinalizado = () => {
    document.getElementById("exec-status-msg").textContent = "Simulação concluída 🎉";
  };

  gpsTracker = new GPSSimulator((update)=>executor.atualizar(update));
  gpsTracker.iniciar();

  executor.iniciar();
  renderTimeline(blocos, 0);

  document.getElementById("btn-simular-exec").hidden = true;
  document.getElementById("btn-iniciar-exec").hidden = true;
});

// ===============================
// PARAR
// ===============================
document.getElementById("btn-parar").addEventListener("click", async () => {
  if(!confirm("Parar treino?")) return;

  gpsTracker?.parar();

  if(execucaoId && executor){
    await SupabaseClient.finalizarExecucao(
      execucaoId,
      gpsTracker?.distanciaTotalM || 0,
      (Date.now()-executor.tempoInicioTotal)/1000
    ).catch(()=>{});
  }

  executor = null;

  mostrarView("lista");
  carregarTreinos();
});

// ===============================
// UI UPDATE
// ===============================
function atualizarTelaExecucao(state){
  document.getElementById("exec-bloco-nome").textContent = state.bloco.nome;
  document.getElementById("exec-pace-atual").textContent = formatPaceMinKm(state.paceSegPorKm);
  document.getElementById("exec-distancia-bloco").textContent = `${Math.round(state.distanciaNoBloco)} m`;
  document.getElementById("exec-tempo-total").textContent = formatTempo(state.tempoTotalS);
  document.getElementById("exec-distancia-total").textContent = `${(state.distanciaTotalM/1000).toFixed(2)} km`;
}

// ===============================
// INIT
// ===============================
carregarTreinos();
