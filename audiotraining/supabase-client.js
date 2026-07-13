const SUPABASE_URL = "https://aemwndlufteldrspinur.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlbXduZGx1ZnRlbGRyc3BpbnVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MDQzOTksImV4cCI6MjA5ODQ4MDM5OX0.sUXbfekLgBzkLcjLZXcis4FXPyYJg1827Fvu7gLKoPY"; // mantido

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  "apikey": SUPABASE_ANON_KEY
};

const SupabaseClient = {

  async _request(url, options = {}) {
    try {
      const resp = await fetch(url, options);
      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        throw new Error(data?.error || "Erro Supabase");
      }

      return data;
    } catch (e) {
      console.error("Supabase error:", e);
      throw e;
    }
  },

  parseTreino(textoTreino) {
    return this._request(
      `${SUPABASE_URL}/functions/v1/parse-treino`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ texto_treino: textoTreino })
      }
    );
  },

  listarTreinos(deviceId) {
    return this._request(
      `${SUPABASE_URL}/rest/v1/treinos?select=*&device_id=eq.${deviceId}&order=criado_em.desc`,
      { headers }
    );
  },

  salvarTreino(titulo, textoOriginal, blocos, deviceId) {
    return this._request(
      `${SUPABASE_URL}/rest/v1/treinos`,
      {
        method: "POST",
        headers: { ...headers, "Prefer": "return=representation" },
        body: JSON.stringify({
          titulo,
          texto_original: textoOriginal,
          blocos: blocos || { blocos: [] },
          device_id: deviceId
        })
      }
    );
  },

  atualizarTreino(id, titulo, textoOriginal, blocos) {
    return this._request(
      `${SUPABASE_URL}/rest/v1/treinos?id=eq.${id}`,
      {
        method: "PATCH",
        headers: { ...headers, "Prefer": "return=representation" },
        body: JSON.stringify({
          titulo,
          texto_original: textoOriginal,
          blocos: blocos || { blocos: [] }
        })
      }
    );
  },

  excluirTreino(id) {
    return this._request(
      `${SUPABASE_URL}/rest/v1/treinos?id=eq.${id}`,
      { method: "DELETE", headers }
    );
  },

  reivindicarTreinosOrfaos(deviceId) {
    return this._request(
      `${SUPABASE_URL}/rest/v1/treinos?device_id=is.null`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ device_id: deviceId })
      }
    );
  },

  criarExecucao(treinoId) {
    return this._request(
      `${SUPABASE_URL}/rest/v1/execucoes`,
      {
        method: "POST",
        headers: { ...headers, "Prefer": "return=representation" },
        body: JSON.stringify({ treino_id: treinoId, status: "ativo" })
      }
    );
  },

  finalizarExecucao(execucaoId, distanciaTotalM, tempoTotalS) {
    return this._request(
      `${SUPABASE_URL}/rest/v1/execucoes?id=eq.${execucaoId}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          finalizado_em: new Date().toISOString(),
          distancia_total_m: distanciaTotalM || 0,
          tempo_total_s: tempoTotalS || 0,
          status: "concluido"
        })
      }
    );
  },

  salvarBlocoExecutado(execucaoId, blocoIndex, bloco, paceRealMedio, distanciaRealM, tempoRealS) {
    return this._request(
      `${SUPABASE_URL}/rest/v1/execucao_blocos`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          execucao_id: execucaoId,
          bloco_index: blocoIndex,
          bloco_nome: bloco?.nome || "",
          meta_tipo: bloco?.meta_tipo || "",
          meta_valor: bloco?.meta_valor || 0,
          pace_alvo_min: bloco?.pace_alvo_min_seg_km ?? null,
          pace_alvo_max: bloco?.pace_alvo_max_seg_km ?? null,
          pace_real_medio: paceRealMedio ?? null,
          distancia_real_m: distanciaRealM ?? 0,
          tempo_real_s: tempoRealS ?? 0
        })
      }
    );
  }
};

window.SupabaseClient = SupabaseClient;
