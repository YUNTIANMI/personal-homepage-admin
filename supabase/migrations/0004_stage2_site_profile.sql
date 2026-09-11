-- =============================================================================
-- 阶段二 · 站点配置云端化（site_profile 单行表）
-- 项目：luoji-admin
-- 执行位置：Supabase 控制台 → SQL Editor
-- 特性：幂等（可重复执行）
-- =============================================================================
-- 目标：把原先硬编码在 src/lib/site.ts 的站点资料迁到数据库，
--       后台可可视化编辑，展示站点读取云端值。
-- 兼容：展示端在云端未配置 / 字段为空时回退本地默认值，不会白屏。
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1) 表结构（单行表：id 恒为 'default'）
-- ---------------------------------------------------------------------------
create table if not exists public.site_profile (
  id text primary key default 'default' check (id = 'default'),
  name text not null default '',
  en text default '',
  role text default '',
  headline text default '',
  intro text default '',
  github text default '',
  email text default '',
  tech jsonb not null default '[]'::jsonb,
  "startYear" int not null default 2026,
  updated_at timestamptz not null default now()
);

comment on table public.site_profile is '站点基础资料（单行配置表，供展示站点与后台共用）';


-- ---------------------------------------------------------------------------
-- 2) updated_at 触发器（复用 0001 中已创建的函数）
-- ---------------------------------------------------------------------------
drop trigger if exists trg_site_profile_updated_at on public.site_profile;
create trigger trg_site_profile_updated_at
  before update on public.site_profile
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 3) RLS：anon 只读 + authenticated 可写（且会话未过期）
-- ---------------------------------------------------------------------------
alter table public.site_profile enable row level security;

drop policy if exists "site_profile read" on public.site_profile;
create policy "site_profile read" on public.site_profile
  for select to anon, authenticated using (true);

drop policy if exists "site_profile write" on public.site_profile;
create policy "site_profile write" on public.site_profile
  for all to authenticated
  using (public.is_admin_session_valid())
  with check (public.is_admin_session_valid());


-- ---------------------------------------------------------------------------
-- 4) 初始化默认行（沿用原 site.ts 的内容；已存在则不动）
-- ---------------------------------------------------------------------------
insert into public.site_profile (id, name, en, role, headline, intro, github, email, tech, "startYear")
values (
  'default',
  '罗辑',
  'LUOJI',
  'Software Engineer · 软件工程',
  '写代码，也写文章。',
  '软件工程专业，长期关注 Web 全栈开发与工程化实践。这里是我记录技术思考、沉淀文章与展示软件项目的独立主页。',
  'https://github.com/YUNTIANMI/',
  '1431634649@qq.com',
  '["TypeScript","React","Node.js","Python","Git","Tailwind CSS","数据结构与算法"]'::jsonb,
  2026
)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- 5) 验证
-- ---------------------------------------------------------------------------
-- 5.1 读取（anon 可读，应返回一行）：
--   select * from public.site_profile;
-- 5.2 策略（应看到 read + write 两条）：
--   select policyname, cmd, roles from pg_policies
--    where schemaname='public' and tablename='site_profile';
