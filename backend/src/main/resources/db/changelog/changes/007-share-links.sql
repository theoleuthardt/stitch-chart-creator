--liquibase formatted sql

--changeset stitch-chart-creator:007-share-links
create table share_links (
    pattern_id uuid primary key references patterns (id) on delete cascade,
    slug varchar(22) not null unique,
    created_at timestamptz not null default now()
);
--rollback drop table share_links;
