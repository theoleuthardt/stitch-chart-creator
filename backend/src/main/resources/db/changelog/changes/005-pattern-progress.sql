--liquibase formatted sql

--changeset stitch-chart-creator:005-pattern-progress
create table pattern_progress (
    pattern_id uuid primary key references patterns (id) on delete cascade,
    done_rows integer[] not null,
    done_cells integer[] not null,
    current_row integer not null,
    updated_at timestamptz not null default now()
);
--rollback drop table pattern_progress;
