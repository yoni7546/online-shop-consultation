-- Storage 버킷 생성 (Supabase Dashboard에서 실행하거나 RLS 정책 설정)

-- 1. banner-images 버킷 생성
insert into storage.buckets (id, name, public)
values ('banner-images', 'banner-images', true);

-- 2. 공개 읽기 정책
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'banner-images' );

-- 3. 인증된 사용자 업로드 정책
create policy "Authenticated users can upload banner images"
on storage.objects for insert
with check ( bucket_id = 'banner-images' and auth.role() = 'authenticated' );

-- 4. 인증된 사용자 삭제 정책
create policy "Authenticated users can delete banner images"
on storage.objects for delete
using ( bucket_id = 'banner-images' and auth.role() = 'authenticated' );

-- 5. banner_images 테이블에 파일 정보 컬럼 추가
alter table banner_images 
add column if not exists file_name text,
add column if not exists file_size integer;
