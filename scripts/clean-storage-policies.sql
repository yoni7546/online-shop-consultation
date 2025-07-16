-- ===================================
-- Storage 정책 완전 정리 스크립트
-- ===================================

-- 1. 모든 기존 정책 삭제
do $$
declare
    policy_record record;
begin
    -- banner 관련 모든 정책 찾아서 삭제
    for policy_record in 
        select policyname 
        from pg_policies 
        where tablename = 'objects' 
        and (policyname ilike '%banner%' or policyname ilike '%public%')
    loop
        execute format('drop policy if exists %I on storage.objects', policy_record.policyname);
        raise notice '정책 삭제됨: %', policy_record.policyname;
    end loop;
end $$;

-- 2. 깔끔한 새 정책들 생성
create policy "banner_images_select"
on storage.objects for select
using ( bucket_id = 'banner-images' );

create policy "banner_images_insert"
on storage.objects for insert
with check ( bucket_id = 'banner-images' );

create policy "banner_images_update"
on storage.objects for update
using ( bucket_id = 'banner-images' );

create policy "banner_images_delete"
on storage.objects for delete
using ( bucket_id = 'banner-images' );

-- 3. 결과 확인
select 
  '✅ 새로운 정책들' as status,
  policyname,
  cmd
from pg_policies 
where tablename = 'objects' 
and policyname like 'banner_images_%'
order by policyname;
