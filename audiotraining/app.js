// ===== Navegação entre views =====
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

// ===== VIEW: Lista de treinos =====
async function carregarTreinos(){
  const container = document.getElementById("lista-treinos");
  container.innerHTML = `<p class="empty-state">Carregando treinos…</p>`;
  try{
    const treinos = await SupabaseClient.listarTreinos();
    if(treinos.length === 0){
      container.innerHTML = `<p class="empty-state">Nenhum treino ainda. Toque em "Novo treino" para começar.</p>`;
      return;
    }
    container.innerHTML = "";
    treinos.forEach(t => {
      const card = document.createElement("div");
      card.className = "treino-card";
      const nBlocos = (t.blocos?.blocos || []).length;
      card.innerHTML = `<h3>${t.titulo}</h3><p>${nBlocos} blocos · criado em ${new Date(t.criado_em).toLocaleDateString("pt-BR")}</p>`;
      card.addEventListener("click", () => abrirExecucao(t));
      container.appendChild(card);
    });
  }catch(e){
    container.innerHTML = `<p class="empty-state">Erro ao carregar treinos. Confira a configuração do Supabase em js/supabase-client.js.</p>`;
  }
}

// ===== Utilitário: formatar tempo para exibição =====
function formatarTempoBloco(segundos){
  if(segundos < 60) return `${segundos} seg`;
  if(segundos % 60 === 0) return `${segundos/60} min`;
  return `${Math.floor(segundos/60)}min ${segundos%60}seg`;
}

// ===== VIEW: Novo treino =====
let blocosInterpretados = null;
let tituloInterpretado = "";

document.getElementById("btn-interpretar").addEventListener("click", async () => {
  const texto = document.getElementById("texto-treino").value.trim();
  const erroEl = document.getElementById("erro-interpretar");
  erroEl.hidden = true;
  if(!texto){ erroEl.textContent = "Escreva o treino antes de interpretar."; erroEl.hidden = false; return; }

  const btn = document.getElementById("btn-interpretar");
  btn.disabled = true;
  btn.textContent = "Interpretando…";

  try{
    const resultado = await SupabaseClient.parseTreino(texto);
    blocosInterpretados = resultado.blocos;
    tituloInterpretado = resultado.titulo;
    renderizarRevisao(resultado);
  }catch(e){
    erroEl.textContent = e.message || "Erro ao interpretar o treino.";
    erroEl.hidden = false;
  }finally{
    btn.disabled = false;
    btn.textContent = "Interpretar treino";
  }
});

function renderizarRevisao(resultado){
  const container = document.getElementById("lista-blocos-revisao");
  container.innerHTML = "";
  resultado.blocos.forEach(b => {
    const card = document.createElement("div");
    card.className = "bloco-card" + (b.ritmo_livre ? " livre" : "");

    // Exibe distância ou tempo de forma legível
    const metaTxt = b.meta_tipo === "distancia"
      ? `${b.meta_valor} m`
      : formatarTempoBloco(b.meta_valor);

    // Pace: exibe do mais rápido ao mais lento (ex: 5:45–6:15)
    const paceTxt = b.ritmo_livre
      ? "ritmo livre"
      : `${formatPaceMinKm(b.pace_alvo_max_seg_km)}–${formatPaceMinKm(b.pace_alvo_min_seg_km)} /km`;

    card.innerHTML = `
      <div>
        <div class="bloco-nome">${b.nome}</div>
        <div class="bloco-meta">${metaTxt}</div>
      </div>
      <div class="bloco-pace">${paceTxt}</div>
    `;
    container.appendChild(card);
  });
  document.getElementById("revisao-blocos").hidden = false;
}

document.getElementById("btn-descartar").addEventListener("click", () => {
  document.getElementById("revisao-blocos").hidden = true;
  blocosInterpretados = null;
});

document.getElementById("btn-salvar-treino").addEventListener("click", async () => {
  const btn = document.getElementById("btn-salvar-treino");
  btn.disabled = true;
  btn.textContent = "Salvando…";
  try{
    await SupabaseClient.salvarTreino(
      tituloInterpretado,
      document.getElementById("texto-treino").value.trim(),
      { blocos: blocosInterpretados }
    );
    document.getElementById("texto-treino").value = "";
    document.getElementById("revisao-blocos").hidden = true;
    mostrarView("lista");
    carregarTreinos();
  }catch(e){
    alert("Erro ao salvar treino: " + e.message);
  }finally{
    btn.disabled = false;
    btn.textContent = "Salvar treino";
  }
});

// ===== VIEW: Execução =====
let treinoAtual = null;
let executor = null;
let gpsTracker = null;
let execucaoId = null;

function abrirExecucao(treino){
  treinoAtual = treino;
  mostrarView("execucao");
  document.getElementById("exec-bloco-nome").textContent = treino.titulo;
  document.getElementById("exec-status-msg").textContent = "Toque em iniciar para começar";
  document.getElementById("btn-iniciar-exec").hidden = false;
  document.getElementById("btn-iniciar-exec").textContent = "Iniciar treino";
  renderTimeline(treino.blocos.blocos, -1);
}

function renderTimeline(blocos, indexAtual){
  const tl = document.getElementById("exec-timeline");
  tl.innerHTML = "";
  blocos.forEach((b,i) => {
    const item = document.createElement("div");
    item.className = "tl-item" + (i < indexAtual ? " done" : i === indexAtual ? " current" : "");
    tl.appendChild(item);
  });
}

document.getElementById("btn-iniciar-exec").addEventListener("click", async () => {
  if(!treinoAtual) return;
  try{
    const exec = await SupabaseClient.criarExecucao(treinoAtual.id);
    execucaoId = exec[0]?.id || null;
  }catch(e){
    console.warn("Não foi possível registrar execução no banco, seguindo offline.", e);
  }

  const blocos = treinoAtual.blocos.blocos;
  executor = new RunExecutor(blocos, (state) => atualizarTelaExecucao(state));
  executor.onBlocoCompleto = (idx, bloco, paceRealMedio, distReal, tempoReal) => {
    if(execucaoId){
      SupabaseClient.salvarBlocoExecutado(execucaoId, idx, bloco, paceRealMedio, distReal, tempoReal)
        .catch(e => console.warn("Falha ao salvar bloco executado", e));
    }
    renderTimeline(blocos, executor.blocoIndex);
  };
  executor.onFinalizado = async () => {
    document.getElementById("exec-status-msg").textContent = "Treino concluído! 🎉";
    document.getElementById("btn-iniciar-exec").hidden = true;
    if(execucaoId && gpsTracker){
      await SupabaseClient.finalizarExecucao(
        execucaoId,
        gpsTracker.distanciaTotalM,
        (Date.now()-executor.tempoInicioTotal)/1000
      ).catch(()=>{});
    }
    if(gpsTracker) gpsTracker.parar();
  };

  gpsTracker = new GPSTracker((update) => executor.atualizar(update));
  try{
    gpsTracker.iniciar();
  }catch(e){
    alert("Não foi possível acessar o GPS: " + e.message);
    return;
  }

  executor.iniciar();
  renderTimeline(blocos, 0);
  document.getElementById("btn-iniciar-exec").hidden = true;
  document.getElementById("btn-simular-exec").hidden = true;
});

// ===== Modo simulação (teste sem GPS) =====
document.getElementById("btn-simular-exec").addEventListener("click", async () => {
  if(!treinoAtual) return;
  try{
    const exec = await SupabaseClient.criarExecucao(treinoAtual.id);
    execucaoId = exec[0]?.id || null;
  }catch(e){
    console.warn("Seguindo offline.", e);
  }

  const blocos = treinoAtual.blocos.blocos;
  executor = new RunExecutor(blocos, (state) => atualizarTelaExecucao(state));
  executor.onBlocoCompleto = (idx, bloco, paceRealMedio, distReal, tempoReal) => {
    if(execucaoId){
      SupabaseClient.salvarBlocoExecutado(execucaoId, idx, bloco, paceRealMedio, distReal, tempoReal)
        .catch(()=>{});
    }
    renderTimeline(blocos, executor.blocoIndex);
  };
  executor.onFinalizado = async () => {
    document.getElementById("exec-status-msg").textContent = "Simulação concluída! 🎉";
    if(gpsTracker) gpsTracker.parar();
  };

  // Usa simulador em vez de GPS real
  gpsTracker = new GPSSimulator((update) => executor.atualizar(update));
  gpsTracker.iniciar();

  executor.iniciar();
  renderTimeline(blocos, 0);
  document.getElementById("btn-iniciar-exec").hidden = true;
  document.getElementById("btn-simular-exec").hidden = true;
});

document.getElementById("btn-parar").addEventListener("click", async () => {
  if(!confirm("Tem certeza que deseja parar o treino?")) return;
  if(gpsTracker) gpsTracker.parar();
  if(execucaoId && executor){
    await SupabaseClient.finalizarExecucao(
      execucaoId,
      gpsTracker?.distanciaTotalM || 0,
      (Date.now()-executor.tempoInicioTotal)/1000
    ).catch(()=>{});
  }
  if(executor) executor.finalizado = true;
  mostrarView("lista");
  carregarTreinos();
});

function atualizarTelaExecucao(state){
  document.getElementById("exec-bloco-nome").textContent = state.bloco.nome;
  document.getElementById("exec-pace-atual").textContent = formatPaceMinKm(state.paceSegPorKm);
  document.getElementById("exec-distancia-bloco").textContent = `${Math.round(state.distanciaNoBloco)} m`;

  // Exibe meta do bloco de forma legível na tela de execução
  document.getElementById("exec-meta-bloco").textContent = state.bloco.meta_tipo === "distancia"
    ? `${state.bloco.meta_valor} m`
    : formatarTempoBloco(state.bloco.meta_valor);

  document.getElementById("exec-tempo-total").textContent = formatTempo(state.tempoTotalS);
  document.getElementById("exec-distancia-total").textContent = `${(state.distanciaTotalM/1000).toFixed(2)} km`;

  const ring = document.getElementById("exec-pace-ring");
  ring.classList.remove("lento","rapido","ok");
  if(!state.bloco.ritmo_livre && state.paceSegPorKm){
    const min = state.bloco.pace_alvo_min_seg_km; // mais lento
    const max = state.bloco.pace_alvo_max_seg_km; // mais rápido
    if(state.paceSegPorKm > min + 5) ring.classList.add("lento");
    else if(state.paceSegPorKm < max - 5) ring.classList.add("rapido");
    else ring.classList.add("ok");
  }
}

// ===== Inicialização =====
carregarTreinos();
