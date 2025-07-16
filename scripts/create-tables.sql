-- 확장: UUID 생성을 위해 pgcrypto 사용
create extension if not exists "pgcrypto";

-- 고객 데이터
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  phone varchar(20) not null,
  email varchar(255),
  privacy_consent boolean not null default false,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_created_at on customers (created_at desc);

-- 배너 이미지
create table if not exists banner_images (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  alt varchar(255) default '배너 이미지',
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_banner_images_order on banner_images (order_index desc);
