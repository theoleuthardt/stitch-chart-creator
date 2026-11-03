--liquibase formatted sql

--changeset stitch-chart-creator:004-custom-stitches
create table custom_stitches (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references users (id) on delete cascade,
    name varchar(60) not null,
    abbreviation varchar(12) not null,
    lines double precision[] not null,
    circles double precision[] not null,
    created_at timestamptz not null default now()
);
create index custom_stitches_owner on custom_stitches (owner_id);
alter table patterns add column custom_stitches text not null default '[]';
--rollback alter table patterns drop column custom_stitches;
--rollback drop table custom_stitches;
