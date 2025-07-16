-- ===================================
-- 버킷 강제 생성 및 확인 스크립트
-- ===================================

-- 1. 현재 모든 버킷 확인
SELECT 
  '📋 현재 버킷 목록' as status,
  id,
  name,
  public,
  created_at
FROM storage.buckets
ORDER BY created_at DESC;

-- 2. banner-images 버킷 존재 확인
SELECT 
  '🎯 banner-images 버킷 확인' as status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'banner-images') 
    THEN '✅ 존재함'
    ELSE '❌ 존재하지 않음'
  END as bucket_status;

-- 3. 버킷이 없으면 강제 생성
DO $$
BEGIN
  -- 기존 버킷 삭제 (있다면)
  DELETE FROM storage.buckets WHERE id = 'banner-images';
  
  -- 새로 생성
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'banner-images',
    'banner-images', 
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  );
  
  RAISE NOTICE '🎉 banner-images 버킷 강제 생성 완료!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ 버킷 생성 실패: %', SQLERRM;
END $$;

-- 4. 생성 후 재확인
SELECT 
  '✅ 생성 후 확인' as status,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'banner-images';

-- 5. 정책도 재확인
SELECT 
  '🔐 정책 재확인' as status,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%banner images%'
ORDER BY policyname;
