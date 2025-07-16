-- ===================================
-- Supabase Storage 오류 수정 스크립트
-- (기존 정책 삭제 후 재생성)
-- ===================================

-- 1. 기존 정책들 삭제 (있으면 삭제, 없으면 무시)
drop policy if exists "Public Access for banner images" on storage.objects;
drop policy if exists "Public Upload for banner images" on storage.objects;
drop policy if exists "Public Update for banner images" on storage.objects;
drop policy if exists "Public Delete for banner images" on storage.objects;

-- 기존 정책들 (다른 이름으로 생성된 것들도 삭제)
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated users can upload banner images" on storage.objects;
drop policy if exists "Authenticated users can delete banner images" on storage.objects;

-- 2. 확장 기능 활성화 (이미 있으면 무시)
create extension if not exists "uuid-ossp";

-- 3. banner-images 버킷 생성 (이미 있으면 무시)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'banner-images', 
  'banner-images', 
  true,
  5242880, -- 5MB 제한
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 4. 새로운 정책들 생성
create policy "Public Access for banner images"
on storage.objects for select
using ( bucket_id = 'banner-images' );

create policy "Public Upload for banner images"
on storage.objects for insert
with check ( bucket_id = 'banner-images' );

create policy "Public Update for banner images"
on storage.objects for update
using ( bucket_id = 'banner-images' );

create policy "Public Delete for banner images"
on storage.objects for delete
using ( bucket_id = 'banner-images' );

-- 5. banner_images 테이블 컬럼 추가 (이미 있으면 무시)
alter table banner_images 
add column if not exists file_name text,
add column if not exists file_size integer,
add column if not exists storage_path text;

-- 6. 인덱스 추가 (이미 있으면 무시)
create index if not exists idx_banner_images_storage_path on banner_images (storage_path);

-- 7. 결과 확인
select 
  '✅ 버킷 상태' as status,
  id,
  name,
  public,
  file_size_limit
from storage.buckets 
where id = 'banner-images';

-- 8. 정책 확인
select 
  '✅ 정책 상태' as status,
  policyname,
  cmd,
  qual
from pg_policies 
where tablename = 'objects' 
and policyname like '%banner images%'
order by policyname;

-- 9. 테이블 컬럼 확인
select 
  '✅ 테이블 컬럼' as status,
  column_name,
  data_type,
  is_nullable
from information_schema.columns 
where table_name = 'banner_images' 
and column_name in ('file_name', 'file_size', 'storage_path')
order by column_name;
