// ATENÇÃO: preencha com os dados do SEU projeto Supabase (Settings > API)
const SUPABASE_URL = "https://aemwndlufteldrspinur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlbXduZGx1ZnRlbGRyc3BpbnVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MDQzOTksImV4cCI6MjA5ODQ4MDM5OX0.sUXbfekLgBzkLcjLZXcis4FXPyYJg1827Fvu7gLKoPY";

// Carregado via CDN no index.html (adicione antes deste script se preferir),
// aqui usamos fetch direto para evitar dependência de bundler.

const SupabaseClient = {
  async parseTreino(textoTreino) {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/parse-treino`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "apikey": SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ texto_treino: textoTreino })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || "Falha ao interpretar o treino");
    }
    return resp.json();
  },

  async salvarTreino(titulo, textoOriginal, blocos) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/treinos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "apikey": SUPABASE_ANON_KEY,
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        titulo,
        texto_original: textoOriginal,
        blocos
      })
    });
    if (!resp.ok) throw new Error("Falha ao salvar treino");
    return resp.json();
  },

  async listarTreinos() {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/treinos?select=*&order=criado_em.desc`,
      {
        headers: {
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "apikey": SUPABASE_ANON_KEY
        }
      }
    );
    if (!resp.ok) throw new Error("Falha ao listar treinos");
    return resp.json();
  },

  async criarExecucao(treinoId) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/execucoes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "apikey": SUPABASE_ANON_KEY,
        "Prefer": "return=representation"
      },
      body: JSON.stringify({ treino_id: treinoId })
    });
    if (!resp.ok) throw new Error("Falha ao criar execução");
    return resp.json();
  },

  async finalizarExecucao(execucaoId, distanciaTotalM, tempoTotalS) {
    await fetch(`${SUPABASE_URL}/rest/v1/execucoes?id=eq.${execucaoId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "apikey": SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        finalizado_em: new Date().toISOString(),
        distancia_total_m: distanciaTotalM,
        tempo_total_s: tempoTotalS,
        status: "concluido"
      })
    });
  },

  async salvarBlocoExecutado(execucaoId, blocoIndex, bloco, paceRealMedio, distanciaRealM, tempoRealS) {
    await fetch(`${SUPABASE_URL}/rest/v1/execucao_blocos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "apikey": SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        execucao_id: execucaoId,
        bloco_index: blocoIndex,
        bloco_nome: bloco.nome,
        meta_tipo: bloco.meta_tipo,
        meta_valor: bloco.meta_valor,
        pace_alvo_min: bloco.pace_alvo_min_seg_km,
        pace_alvo_max: bloco.pace_alvo_max_seg_km,
        pace_real_medio: paceRealMedio,
        distancia_real_m: distanciaRealM,
        tempo_real_s: tempoRealS
      })
    });
  }
};
