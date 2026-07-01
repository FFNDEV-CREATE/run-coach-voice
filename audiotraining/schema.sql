-- Schema do Run Coach Voice
-- Execute no SQL Editor do Supabase

create table if not exists treinos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) default auth.uid(),
  titulo text not null,
  texto_original text not null,
  blocos jsonb not null, -- estrutura padronizada gerada pela IA
  criado_em timestamptz default now()
);

create table if not exists execucoes (
  id uuid primary key default gen_random_uuid(),
  treino_id uuid references treinos(id) on delete cascade,
  user_id uuid references auth.users(id) default auth.uid(),
  iniciado_em timestamptz default now(),
  finalizado_em timestamptz,
  distancia_total_m numeric,
  tempo_total_s numeric,
  status text default 'em_andamento' -- em_andamento | concluido | abandonado
);

create table if not exists execucao_blocos (
  id uuid primary key default gen_random_uuid(),
  execucao_id uuid references execucoes(id) on delete cascade,
  bloco_index int not null,
  bloco_nome text,
  meta_tipo text, -- distancia | tempo
  meta_valor numeric, -- metros ou segundos planejados
  pace_alvo_min numeric, -- seg/km, limite inferior (mais lento)
  pace_alvo_max numeric, -- seg/km, limite superior (mais rápido)
  pace_real_medio numeric, -- seg/km realizado
  distancia_real_m numeric,
  tempo_real_s numeric,
  iniciado_em timestamptz,
  finalizado_em timestamptz
);

alter table treinos enable row level security;
alter table execucoes enable row level security;
alter table execucao_blocos enable row level security;

create policy "usuario ve seus treinos" on treinos
  for all using (auth.uid() = user_id);

create policy "usuario ve suas execucoes" on execucoes
  for all using (auth.uid() = user_id);

create policy "usuario ve seus blocos de execucao" on execucao_blocos
  for all using (
    exists (select 1 from execucoes e where e.id = execucao_id and e.user_id = auth.uid())
  );
