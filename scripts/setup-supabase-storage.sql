-- ===================================
-- Supabase Storage 완전 설정 스크립트
-- ===================================

-- 1. 확장 기능 활성화
create extension if not exists "uuid-ossp";

-- 2. banner-images 버킷 생성 (이미 있으면 무시)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'banner-images', 
  'banner-images', 
  true,
  5242880, -- 5MB 제한
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- 3. 공개 읽기 정책 (모든 사용자가 이미지 볼 수 있음)
create policy "Public Access for banner images"
on storage.objects for select
using ( bucket_id = 'banner-images' );

-- 4. 공개 업로드 정책 (누구나 업로드 가능 - 관리자 전용 앱이므로)
create policy "Public Upload for banner images"
on storage.objects for insert
with check ( bucket_id = 'banner-images' );

-- 5. 공개 업데이트 정책
create policy "Public Update for banner images"
on storage.objects for update
using ( bucket_id = 'banner-images' );

-- 6. 공개 삭제 정책
create policy "Public Delete for banner images"
on storage.objects for delete
using ( bucket_id = 'banner-images' );

-- 7. banner_images 테이블 업데이트 (Storage 정보 추가)
alter table banner_images 
add column if not exists file_name text,
add column if not exists file_size integer,
add column if not exists storage_path text;

-- 8. 인덱스 추가 (성능 향상)
create index if not exists idx_banner_images_storage_path on banner_images (storage_path);

-- 9. 확인 쿼리 (실행 후 결과 확인용)
select 
  'Bucket created' as status,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets 
where id = 'banner-images';

-- 10. 정책 확인
select 
  'Policies created' as status,
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies 
where tablename = 'objects' 
and policyname like '%banner images%';
