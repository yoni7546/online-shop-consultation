-- ===================================
-- 즉시 버킷 생성 (강제)
-- ===================================

-- 1. 기존 버킷 완전 삭제 (있다면)
DELETE FROM storage.buckets WHERE id = 'banner-images';

-- 2. 새 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banner-images',
  'banner-images', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- 3. 즉시 확인
SELECT 
  '✅ 버킷 생성 완료' as status,
  id,
  name,
  public,
  created_at
FROM storage.buckets 
WHERE id = 'banner-images';
