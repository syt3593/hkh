-- 目的：
-- 为“大规模回归测试/评测管线”提供独立的数据底座（不影响现有 meals 业务表）。
-- 包含：评测集 -> 测试用例(金标准) -> 跑测记录 -> 逐用例结果。
--
-- 在 Supabase 控制台执行：SQL Editor -> New query -> 粘贴运行
-- 注意：本文件面向“评测后台专用（白名单权限）”的场景：
-- - 普通用户完全不可见/不可读写任何评测数据
-- - 只有少数被授予权限的账号（eval_admins 白名单）可以上传测试图片、配置数据集并跑实验
-- - 白名单的维护建议只用 service role 或在 SQL Editor 手动维护（不从前端开放写入口）
--
-- 配套 Next.js 管理后台：
-- - 管理白名单：/admin（仅 eval_admins.role=admin 可操作）
-- - 上传数据集/跑实验：/admin/eval
--
-- 运行所需环境变量（服务端）：
-- - SUPABASE_SERVICE_ROLE_KEY：用于后台 API 写入 eval_admins / 上传图片 / 执行跑测（务必仅服务端保存）
-- - GEMINI_API_KEY：用于跑测时调用 Gemini（或 API_KEY）
-- - 可选 EVAL_IMAGES_BUCKET：评测图片上传到哪个 Storage bucket（默认 food-images）

-- =========================
-- 0) 白名单权限（评测员/管理员）
-- =========================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'eval_admin_role') then
    create type public.eval_admin_role as enum ('admin', 'evaluator');
  end if;
end$$;

create table if not exists public.eval_admins (
  user_id uuid primary key,
  role public.eval_admin_role not null default 'evaluator',
  created_at timestamptz not null default now()
);

alter table public.eval_admins enable row level security;

-- 评测白名单：仅允许用户查看“自己是否在白名单”（前端可据此隐藏/显示管理入口）
drop policy if exists "eval_admins_select_self" on public.eval_admins;
create policy "eval_admins_select_self"
on public.eval_admins for select
using (user_id = auth.uid());

-- 白名单写操作：默认禁止（建议仅 service role/SQL Editor 维护）
drop policy if exists "eval_admins_no_write" on public.eval_admins;
create policy "eval_admins_no_write"
on public.eval_admins for all
using (false)
with check (false);

-- 可选：一个小工具函数，方便在其他 policy 里复用（不做 security definer，避免绕过 RLS）
create or replace function public.is_eval_admin(p_uid uuid)
returns boolean
language sql
stable
as $$
  select exists (select 1 from public.eval_admins a where a.user_id = p_uid)
$$;

-- =========================
-- 1) eval_suites：评测集
-- =========================
create table if not exists public.eval_suites (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid(),
  name text not null,
  description text,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists eval_suites_created_by_idx on public.eval_suites(created_by);
create index if not exists eval_suites_created_at_idx on public.eval_suites(created_at desc);

alter table public.eval_suites enable row level security;

drop policy if exists "eval_suites_select_admins" on public.eval_suites;
create policy "eval_suites_select_admins"
on public.eval_suites for select
using (public.is_eval_admin(auth.uid()));

drop policy if exists "eval_suites_insert_admins" on public.eval_suites;
create policy "eval_suites_insert_admins"
on public.eval_suites for insert
with check (
  created_by = auth.uid()
  and public.is_eval_admin(auth.uid())
);

drop policy if exists "eval_suites_update_admins" on public.eval_suites;
create policy "eval_suites_update_admins"
on public.eval_suites for update
using (public.is_eval_admin(auth.uid()))
with check (public.is_eval_admin(auth.uid()));

drop policy if exists "eval_suites_delete_admin_only" on public.eval_suites;
create policy "eval_suites_delete_admin_only"
on public.eval_suites for delete
using (
  exists (select 1 from public.eval_admins a where a.user_id = auth.uid() and a.role = 'admin')
);

-- =========================
-- 2) eval_cases：测试用例（含金标准）
-- =========================
create table if not exists public.eval_cases (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid(),
  suite_id uuid not null references public.eval_suites(id) on delete cascade,

  -- 建议存 Storage 路径（例如 food-images/<path>），避免 public url 失效/难控权限
  image_path text not null,
  image_sha256 text,
  source text,                 -- 例如：food-test、本地批量上传、用户回收样本等
  notes text,

  -- 金标准：可先用 JSONB，后续如要做更细粒度统计再拆表（例如 eval_case_items）
  ground_truth jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists eval_cases_created_by_idx on public.eval_cases(created_by);
create index if not exists eval_cases_suite_id_idx on public.eval_cases(suite_id);
create index if not exists eval_cases_created_at_idx on public.eval_cases(created_at desc);
create index if not exists eval_cases_image_sha256_idx on public.eval_cases(image_sha256);

alter table public.eval_cases enable row level security;

drop policy if exists "eval_cases_select_admins" on public.eval_cases;
create policy "eval_cases_select_admins"
on public.eval_cases for select
using (public.is_eval_admin(auth.uid()));

drop policy if exists "eval_cases_insert_admins" on public.eval_cases;
create policy "eval_cases_insert_admins"
on public.eval_cases for insert
with check (
  created_by = auth.uid()
  and public.is_eval_admin(auth.uid())
);

drop policy if exists "eval_cases_update_admins" on public.eval_cases;
create policy "eval_cases_update_admins"
on public.eval_cases for update
using (public.is_eval_admin(auth.uid()))
with check (public.is_eval_admin(auth.uid()));

drop policy if exists "eval_cases_delete_admin_only" on public.eval_cases;
create policy "eval_cases_delete_admin_only"
on public.eval_cases for delete
using (
  exists (select 1 from public.eval_admins a where a.user_id = auth.uid() and a.role = 'admin')
);

-- =========================
-- 3) eval_runs：一次跑测（实验配置/版本）
-- =========================
create table if not exists public.eval_runs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid(),
  suite_id uuid not null references public.eval_suites(id) on delete cascade,

  name text,
  status text not null default 'created', -- created/running/completed/failed/cancelled

  -- 实验配置：模型、prompt 版本、拍照/参照物策略等
  model_name text not null,
  prompt_version text,
  config jsonb not null default '{}'::jsonb,

  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists eval_runs_created_by_idx on public.eval_runs(created_by);
create index if not exists eval_runs_suite_id_idx on public.eval_runs(suite_id);
create index if not exists eval_runs_created_at_idx on public.eval_runs(created_at desc);

alter table public.eval_runs enable row level security;

-- 跑测记录：仅白名单可见
drop policy if exists "eval_runs_select_admins" on public.eval_runs;
create policy "eval_runs_select_admins"
on public.eval_runs for select
using (public.is_eval_admin(auth.uid()));

drop policy if exists "eval_runs_insert_admins" on public.eval_runs;
create policy "eval_runs_insert_admins"
on public.eval_runs for insert
with check (
  created_by = auth.uid()
  and public.is_eval_admin(auth.uid())
);

drop policy if exists "eval_runs_update_admins" on public.eval_runs;
create policy "eval_runs_update_admins"
on public.eval_runs for update
using (public.is_eval_admin(auth.uid()))
with check (public.is_eval_admin(auth.uid()));

drop policy if exists "eval_runs_delete_admin_only" on public.eval_runs;
create policy "eval_runs_delete_admin_only"
on public.eval_runs for delete
using (
  exists (select 1 from public.eval_admins a where a.user_id = auth.uid() and a.role = 'admin')
);

-- =========================
-- 4) eval_run_results：跑测中的逐用例结果与指标
-- =========================
create table if not exists public.eval_run_results (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid(),
  run_id uuid not null references public.eval_runs(id) on delete cascade,
  case_id uuid not null references public.eval_cases(id) on delete cascade,

  -- AI 原始输出（结构化后的 JSON）；保留 raw 便于回放/排错
  ai_output jsonb not null default '{}'::jsonb,
  ai_raw_text text,

  -- 指标（可逐步补齐）：比如总重量误差、单品 mape 等
  metrics jsonb not null default '{}'::jsonb,

  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists eval_run_results_created_by_idx on public.eval_run_results(created_by);
create index if not exists eval_run_results_run_id_idx on public.eval_run_results(run_id);
create index if not exists eval_run_results_case_id_idx on public.eval_run_results(case_id);
create unique index if not exists eval_run_results_run_case_unique on public.eval_run_results(run_id, case_id);

alter table public.eval_run_results enable row level security;

-- 跑测结果：仅白名单可见
drop policy if exists "eval_run_results_select_admins" on public.eval_run_results;
create policy "eval_run_results_select_admins"
on public.eval_run_results for select
using (public.is_eval_admin(auth.uid()));

drop policy if exists "eval_run_results_insert_admins" on public.eval_run_results;
create policy "eval_run_results_insert_admins"
on public.eval_run_results for insert
with check (
  created_by = auth.uid()
  and public.is_eval_admin(auth.uid())
);

drop policy if exists "eval_run_results_update_admins" on public.eval_run_results;
create policy "eval_run_results_update_admins"
on public.eval_run_results for update
using (public.is_eval_admin(auth.uid()))
with check (public.is_eval_admin(auth.uid()));

drop policy if exists "eval_run_results_delete_admin_only" on public.eval_run_results;
create policy "eval_run_results_delete_admin_only"
on public.eval_run_results for delete
using (
  exists (select 1 from public.eval_admins a where a.user_id = auth.uid() and a.role = 'admin')
);


