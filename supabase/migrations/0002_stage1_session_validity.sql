-- =============================================================================
-- 阶段一补充 · 会话有效期「服务端强制」校验
-- 项目：luoji-admin（共用 luoji-home 的 Supabase 实例）
-- 执行位置：Supabase 控制台 → SQL Editor
-- 特性：幂等（可重复执行）
-- =============================================================================
-- 为什么需要它：
--   纯客户端判断「登录满 7 天」可以被绕过（清掉 localStorage 即失效）。
--   本脚本把有效期校验下沉到数据库，做到「客户端怎么改都没用」。
--
-- 原理：
--   1. Supabase 签发 access token 时会写入 session_id 声明（UUID）；
--   2. 对应会话记录在 auth.sessions 表，含服务端权威的 created_at；
--   3. 下面用 SECURITY DEFINER 函数读取该表（普通角色无权访问 auth schema），
--      在 RLS 写策略里调用 → 超过 7 天的会话写不进任何数据。
--
-- 注意：
--   - 读取策略不变，前台/保活工作流仍可匿名只读；
--   - 若后续要调整期限，改函数默认值即可（见文末示例）。
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1) 会话有效性判定函数（服务端权威）
--    返回：当前请求的会话是否存在、归属当前用户、且未超过有效期
-- ---------------------------------------------------------------------------
create or replace function public.is_admin_session_valid(
  max_age interval default '7 days'::interval
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.sessions s
    where s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and s.user_id = auth.uid()
      and s.created_at > now() - max_age
  );
$$;

comment on function public.is_admin_session_valid(interval) is
  '当前请求的登录会话是否仍在有效期内（默认 7 天）；供 RLS 写策略做服务端强制校验，客户端无法绕过';

-- 仅允许已登录用户调用，不对外开放
revoke all on function public.is_admin_session_valid(interval) from public;
grant execute on function public.is_admin_session_valid(interval) to authenticated;


-- ---------------------------------------------------------------------------
-- 2) 写策略：从「已登录」收紧为「已登录 且 会话未过期」
-- ---------------------------------------------------------------------------
drop policy if exists "posts write" on public.posts;
create policy "posts write" on public.posts
  for all to authenticated
  using (public.is_admin_session_valid())
  with check (public.is_admin_session_valid());

drop policy if exists "projects write" on public.projects;
create policy "projects write" on public.projects
  for all to authenticated
  using (public.is_admin_session_valid())
  with check (public.is_admin_session_valid());

-- 读取策略保持原样（anon 只读，保活工作流依赖）：
--   "posts read"    / "projects read"  to anon, authenticated using (true)


-- ---------------------------------------------------------------------------
-- 3) 验证
-- ---------------------------------------------------------------------------
-- 3.1 函数是否存在（已登录用户可调用）：
--   select public.is_admin_session_valid();          -- 有效会话 → true
--   select public.is_admin_session_valid('1 hour');  -- 换个期限试算
--
-- 3.2 策略是否正确（posts/projects 各 2 条：read + write）：
--   select tablename, policyname, cmd, qual, with_check
--     from pg_policies
--    where schemaname='public' and tablename in ('posts','projects');
--
-- 3.3 过期效果自检（把期限调成 0，应立刻写不进去；之后记得改回来）：
--   create or replace function public.is_admin_session_valid(max_age interval default '0 seconds'::interval)
--   returns boolean language sql stable security definer set search_path = ''
--   as $$ select exists (select 1 from auth.sessions s
--        where s.id = nullif(auth.jwt() ->> 'session_id','')::uuid
--          and s.user_id = auth.uid() and s.created_at > now() - max_age); $$;
--
-- 3.4 调整期限（例如改成 30 天）：
--   create or replace function public.is_admin_session_valid(max_age interval default '30 days'::interval)
--   ...（函数体同上）
--   -- 注意：本仓库前端 AuthProvider 的 SESSION_MAX_AGE_MS 也要同步调整
