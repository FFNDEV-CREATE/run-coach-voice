# Run Coach Voice

Assistente de corrida por voz: você cola o texto do treino, a IA estrutura em blocos,
e durante a corrida o app vai te orientando por voz sobre pace, distância e quando
trocar de bloco — como um personal trainer ao vivo.

100% gratuito: GitHub Pages (frontend) + Supabase (banco + Edge Function com Claude).

## 1. Criar o projeto no Supabase

1. Crie um projeto novo em supabase.com (gratuito).
2. Vá em **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e execute.
3. Vá em **Authentication > Providers** e habilite o método que preferir (mais simples: Email).
   Crie seu próprio usuário (você é a única pessoa usando o app por enquanto).
4. Vá em **Settings > API** e copie:
   - Project URL
   - anon public key

## 2. Configurar a Edge Function (IA que interpreta o treino)

Pré-requisito: ter a Supabase CLI instalada (`npm install -g supabase`).

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase secrets set ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
supabase functions deploy parse-treino
```

A chave da API Anthropic você pega em console.anthropic.com (tem créditos gratuitos
iniciais; depois é pago por uso, mas o volume de uma pessoa interpretando treinos é
muito baixo, centavos por mês).

## 3. Configurar o frontend

Edite `js/supabase-client.js` e preencha:

```js
const SUPABASE_URL = "https://SEU_PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "sua-anon-key-aqui";
```

## 4. Subir pro GitHub Pages

```bash
git init
git add .
git commit -m "Run Coach Voice - versão inicial"
git remote add origin https://github.com/SEU_USUARIO/run-coach-voice.git
git push -u origin main
```

Depois, no repositório do GitHub: **Settings > Pages > Source: main branch /root**.
O app fica disponível em `https://SEU_USUARIO.github.io/run-coach-voice/`.

## 5. Testar

- Acesse pelo celular (Chrome no Android funciona melhor; no iPhone use Safari).
- Adicione à tela inicial (PWA instalável).
- Cole um treino de teste, ex:

```
Aquecimento 1km livre. Depois 4x (300m no pace 6:05 + 200m no pace 5:50).
Desaquecimento 500m livre.
```

- Confira os blocos gerados, salve, e teste a execução ao ar livre (GPS não funciona bem
  dentro de casa).

## Limitações conhecidas

- **iOS/Safari**: a Web Speech API pode cortar o áudio quando a tela bloqueia. Mantenha a
  tela ligada durante a corrida, ou use o modo "não bloquear tela" do celular.
- **Web Bluetooth (monitor de FC)**: não implementado nesta versão (ficou fora do escopo
  inicial, focado em pace). Só funciona no Chrome Android se for adicionado depois.
- **Precisão do GPS**: pace instantâneo é suavizado numa janela de 8 segundos para reduzir
  ruído; em túneis, prédios altos ou começo da corrida pode demorar alguns segundos pra
  estabilizar.

## Próximos passos sugeridos

- Tela de histórico comparando pace planejado vs realizado por bloco.
- Edição manual dos blocos depois da interpretação da IA (hoje só dá pra aceitar ou descartar).
- Suporte a zona de FC quando você conectar um monitor.
- Sincronização com Strava ao final do treino.
