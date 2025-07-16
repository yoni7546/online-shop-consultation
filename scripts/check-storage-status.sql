-- ===================================
-- Storage 상태 확인 스크립트
-- ===================================

-- 1. 버킷 상태 확인
select 
  '🗂️ BUCKETS' as category,
  id as bucket_id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
from storage.buckets 
where id = 'banner-images';

-- 2. 현재 정책들 확인
select 
  '🔐 POLICIES' as category,
  policyname as policy_name,
  cmd as command,
  permissive,
  roles
from pg_policies 
where tablename = 'objects' 
and (policyname like '%banner%' or policyname like '%Public%')
order by policyname;

-- 3. 업로드된 파일들 확인
select 
  '📁 FILES' as category,
  name as file_name,
  bucket_id,
  owner,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
from storage.objects 
where bucket_id = 'banner-images'
order by created_at desc
limit 10;

-- 4. banner_images 테이블 구조 확인
select 
  '📋 TABLE COLUMNS' as category,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns 
where table_name = 'banner_images'
order by ordinal_position;

-- 5. 최근 배너 이미지 데이터 확인
select 
  '🖼️ BANNER DATA' as category,
  id,
  alt,
  file_name,
  file_size,
  storage_path,
  order_index,
  created_at
from banner_images 
order by created_at desc
limit 5;
