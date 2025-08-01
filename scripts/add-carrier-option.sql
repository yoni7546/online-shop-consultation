-- 고객 테이블에 통신사 옵션 컬럼 추가
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS carrier_option VARCHAR(50);

-- 기존 데이터에 기본값 설정 (선택사항)
UPDATE customers 
SET carrier_option = '상관없음' 
WHERE carrier_option IS NULL;

-- 확인 쿼리
SELECT 
  '✅ 컬럼 추가 완료' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name = 'carrier_option';
