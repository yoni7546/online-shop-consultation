-- ===================================
-- Storage 정책 완전 해결 스크립트
-- ===================================

-- 1. 기존 정책들 모두 삭제 (충돌 방지)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
        RAISE NOTICE '정책 삭제: %', policy_record.policyname;
    END LOOP;
END $$;

-- 2. banner-images 버킷 확인/생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banner-images', 
  'banner-images', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. 공개 정책들 생성 (익명 사용자도 접근 가능)
CREATE POLICY "Anyone can view banner images"
ON storage.objects FOR SELECT
USING (bucket_id = 'banner-images');

CREATE POLICY "Anyone can upload banner images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'banner-images');

CREATE POLICY "Anyone can update banner images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'banner-images');

CREATE POLICY "Anyone can delete banner images"
ON storage.objects FOR DELETE
USING (bucket_id = 'banner-images');

-- 4. 결과 확인
SELECT 
  '✅ 버킷 상태' as status,
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets 
WHERE id = 'banner-images';

SELECT 
  '✅ 정책 상태' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%banner images%';
