-- ===================================
-- Storage 문제 정확한 진단 스크립트
-- ===================================

-- 1. 현재 사용자 권한 확인
SELECT 
  '🔍 현재 사용자 정보' as info,
  current_user as user_name,
  current_setting('role') as current_role;

-- 2. 버킷 존재 여부 확인
SELECT 
  '🗂️ 버킷 상태' as info,
  id,
  name,
  public,
  created_at,
  updated_at
FROM storage.buckets 
WHERE id = 'banner-images';

-- 3. 버킷이 없다면 수동 생성 (service_role 필요)
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
    RAISE NOTICE '✅ 버킷 생성 완료: banner-images';
  ELSE
    RAISE NOTICE '✅ 버킷이 이미 존재합니다: banner-images';
  END IF;
END $$;

-- 4. 정책 상태 확인
SELECT 
  '🔐 정책 상태' as info,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- 5. 최종 확인
SELECT 
  '✅ 최종 결과' as result,
  (SELECT COUNT(*) FROM storage.buckets WHERE id = 'banner-images') as bucket_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage') as policy_count;
