--liquibase formatted sql

--changeset stitch-chart-creator:003-patterns
create table patterns (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references users (id) on delete cascade,
    title varchar(200) not null,
    craft_type varchar(20) not null,
    width integer not null check (width > 0),
    height integer not null check (height > 0),
    palette text[] not null,
    cells integer[] not null,
    symbols integer[],
    thumbnail text,
    version bigint not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index patterns_owner_updated on patterns (owner_id, updated_at desc);
--rollback drop table patterns;
