-- ===================================
-- 프로젝트 정보 확인 스크립트
-- ===================================

-- 1. 현재 데이터베이스 정보
SELECT 
  '🏢 프로젝트 정보' as info,
  current_database() as database_name,
  current_user as current_user,
  version() as postgres_version;

-- 2. 현재 존재하는 모든 버킷 확인
SELECT 
  '🗂️ 모든 버킷' as info,
  id as bucket_id,
  name as bucket_name,
  public as is_public,
  created_at,
  updated_at
FROM storage.buckets
ORDER BY created_at DESC;

-- 3. banner-images 버킷 상세 정보
SELECT 
  '🎯 타겟 버킷' as info,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'banner-images';

-- 4. Storage 정책 확인
SELECT 
  '🔐 Storage 정책' as info,
  policyname as policy_name,
  cmd as command,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- 5. 만약 버킷이 없다면 생성
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'banner-images') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'banner-images',
      'banner-images', 
      true,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    );
    RAISE NOTICE '✅ banner-images 버킷 생성 완료';
  ELSE
    RAISE NOTICE '✅ banner-images 버킷이 이미 존재합니다';
  END IF;
END $$;
