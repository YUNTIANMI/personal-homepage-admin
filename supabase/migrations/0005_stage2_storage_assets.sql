-- =============================================================================
-- 阶段二 · 媒体存储（Supabase Storage：assets bucket）
-- 项目：luoji-admin
-- 执行位置：Supabase 控制台 → SQL Editor
-- 特性：幂等（可重复执行）
-- =============================================================================
-- 目标：后台可上传图片，展示站点直接引用其公开 URL。
-- 权限：公开读（anon 也可读，展示页需要）；上传 / 覆盖 / 删除仅限
--       【已登录 且 会话未过期】——与阶段一的自定义会话有效期保持一致。
-- 限制：单文件 ≤ 5MB，仅常见位图格式（不含 SVG，避免脚本注入面）。
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1) 创建 / 更新 bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assets',
  'assets',
  true,
  5242880, -- 5MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ---------------------------------------------------------------------------
-- 2) 对象访问策略
-- ---------------------------------------------------------------------------
-- 读取：公开（展示站点与后台预览都需要）
drop policy if exists "assets read" on storage.objects;
create policy "assets read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'assets');

-- 上传：仅已登录且会话未过期
drop policy if exists "assets insert" on storage.objects;
create policy "assets insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'assets' and public.is_admin_session_valid());

-- 覆盖：同上
drop policy if exists "assets update" on storage.objects;
create policy "assets update" on storage.objects
  for update to authenticated
  using (bucket_id = 'assets' and public.is_admin_session_valid())
  with check (bucket_id = 'assets' and public.is_admin_session_valid());

-- 删除：同上
drop policy if exists "assets delete" on storage.objects;
create policy "assets delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'assets' and public.is_admin_session_valid());


-- ---------------------------------------------------------------------------
-- 3) 验证
-- ---------------------------------------------------------------------------
-- 3.1 bucket 配置（public = true，file_size_limit = 5242880）：
--   select id, name, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'assets';
-- 3.2 策略（应看到 read / insert / update / delete 四条）：
--   select policyname, cmd, roles from pg_policies
--    where schemaname='storage' and tablename='objects' and policyname like 'assets%';
-- 3.3 公开读取（返回 200 / 404 均说明可匿名访问；403 才说明策略有问题）：
--   curl -I "$VITE_SUPABASE_URL/storage/v1/object/public/assets/not-exist.png"
