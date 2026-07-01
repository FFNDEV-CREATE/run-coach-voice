// Supabase Edge Function: parse-treino
// Recebe o texto livre do treino e devolve a estrutura padronizada de blocos.
// Deploy: supabase functions deploy parse-treino
// Secret necessário: ANTHROPIC_API_KEY

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const SYSTEM_PROMPT = `Você é um especialista em treinos de corrida. Receberá o texto de um treino
escrito livremente por um personal trainer ou pelo próprio atleta, em português.
Sua tarefa é estruturar esse treino em blocos padronizados.

Responda APENAS com um JSON válido, sem markdown, sem texto antes ou depois, no formato:

{
  "titulo": "string curta descrevendo o treino",
  "blocos": [
    {
      "nome": "string, ex: Aquecimento, Tiro 1, Recuperação, Rodagem",
      "meta_tipo": "distancia" | "tempo",
      "meta_valor": número (metros se distancia, segundos se tempo),
      "pace_alvo_min_seg_km": número ou null (limite mais LENTO em segundos por km),
      "pace_alvo_max_seg_km": número ou null (limite mais RÁPIDO em segundos por km),
      "ritmo_livre": boolean (true se não há pace alvo, ex: aquecimento/desaquecimento livre),
      "repeticoes": número (quantas vezes esse bloco se repete, default 1)
    }
  ]
}

Regras importantes:
- Converta sempre pace para segundos por km. Ex: "6:05" = 365 segundos, "5,50" (formato min,seg) = 350 segundos.
- Se o treino disser um pace único (não uma faixa), use o mesmo valor em pace_alvo_min_seg_km e pace_alvo_max_seg_km
  com uma margem de tolerância de ±5 segundos.
- Se for uma faixa de zona (ex: Z2 5:50-6:10), use os dois limites exatamente como informado.
- Se for um bloco de blocos repetidos (ex: "4x (300m forte + 200m leve)"), gere os blocos na ORDEM que devem
  ser executados, repetindo cada um "repeticoes" vezes corretamente — ou seja, gere a sequência completa e
  use repeticoes:1 em cada item OU agrupe com repeticoes:N, escolha a abordagem mais simples e correta.
  Prefira gerar a sequência expandida e completa de blocos na ordem de execução, com repeticoes sempre 1,
  para evitar ambiguidade na hora de tocar o treino.
- Sempre inclua aquecimento e desaquecimento como blocos separados se mencionados no texto.
- Não invente dados que não estão no texto. Se um bloco não tiver pace definido, marque ritmo_livre: true.`;

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { texto_treino } = await req.json();

    if (!texto_treino || typeof texto_treino !== "string") {
      return new Response(JSON.stringify({ error: "texto_treino é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: texto_treino }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Erro na API Anthropic", details: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const textBlock = data.content?.find((b: any) => b.type === "text");
    const rawText = (textBlock?.text || "").trim()
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "");

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "IA não retornou JSON válido", raw: rawText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
