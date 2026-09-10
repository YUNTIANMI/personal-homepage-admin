-- =============================================================================
-- 阶段一 · 后台基础数据库改造
-- 项目：luoji-admin（与前台 luoji-home 共用同一个 Supabase 实例）
-- 执行位置：Supabase 控制台 → SQL Editor
-- 特性：全部语句幂等（if not exists / drop ... if exists），可重复执行
-- =============================================================================
-- 本脚本做三件事，均为「纯加法」，不改变前台已依赖的字段语义：
--   1) 为 posts / projects 增加 created_at、updated_at 时间戳
--   2) 为 updated_at 建立触发器（覆盖 upsert 的 ON CONFLICT DO UPDATE）
--   3) 建立常用索引
--   4) 将 RLS 从「anon 全量读写」收紧为「anon 只读 + authenticated 可写」
--      ⚠️ 必须保留 anon 对 posts 的 select 权限：仓库保活工作流依赖它
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1) 时间戳字段
-- ---------------------------------------------------------------------------
alter table public.posts
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.projects
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- 回填文章创建时间（用发布日期近似；已有值不覆盖）
update public.posts
set created_at = (date || 'T00:00:00Z')::timestamptz
where (created_at is null or created_at > now() - interval '1 second')
  and date ~ '^\d{4}-\d{2}-\d{2}$';


-- ---------------------------------------------------------------------------
-- 2) updated_at 触发器
--    由数据库强制维护写入时间，避免前台旧逻辑回写时覆盖
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 3) 索引
-- ---------------------------------------------------------------------------
create index if not exists idx_posts_updated_at       on public.posts (updated_at desc);
create index if not exists idx_posts_date             on public.posts (date desc);
create index if not exists idx_posts_tags             on public.posts using gin (tags);
create index if not exists idx_projects_updated_at    on public.projects (updated_at desc);
create index if not exists idx_projects_name          on public.projects (name);


-- ---------------------------------------------------------------------------
-- 4) RLS：anon 只读 + authenticated 可写
-- ---------------------------------------------------------------------------
alter table public.posts enable row level security;
alter table public.projects enable row level security;

-- 移除旧的匿名全量读写策略
drop policy if exists "posts anon all" on public.posts;
drop policy if exists "projects anon all" on public.projects;

-- 读：anon 与 authenticated 均可读（保留 anon select 供保活工作流使用）
drop policy if exists "posts read" on public.posts;
create policy "posts read" on public.posts
  for select to anon, authenticated using (true);

drop policy if exists "projects read" on public.projects;
create policy "projects read" on public.projects
  for select to anon, authenticated using (true);

-- 写：仅登录用户
drop policy if exists "posts write" on public.posts;
create policy "posts write" on public.posts
  for all to authenticated using (true) with check (true);

drop policy if exists "projects write" on public.projects;
create policy "projects write" on public.projects
  for all to authenticated using (true) with check (true);


-- ---------------------------------------------------------------------------
-- 5) 验证（执行后人工确认）
-- ---------------------------------------------------------------------------
-- 5.1 字段与触发器
--   select column_name, data_type from information_schema.columns
--    where table_schema='public' and table_name='posts' order by ordinal_position;
--   select tgname from pg_trigger where tgrelid = 'public.posts'::regclass and not tgisinternal;
--
-- 5.2 策略（应能看到 posts/projects 各 2 条：read + write）
--   select tablename, policyname, cmd, roles from pg_policies
--    where schemaname='public' and tablename in ('posts','projects');
--
-- 5.3 保活验证（用 anon key 请求，必须返回 200 而非 401）：
--   curl "$VITE_SUPABASE_URL/rest/v1/posts?select=id&limit=1" \
--        -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
