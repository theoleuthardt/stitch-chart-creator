--liquibase formatted sql

--changeset stitch-chart-creator:001-users
create table users (
    id uuid primary key default gen_random_uuid(),
    username varchar(32) not null,
    email varchar(254) not null,
    password_hash text not null,
    failed_logins integer not null default 0,
    locked_until timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create unique index users_username_unique on users (lower(username));
create unique index users_email_unique on users (lower(email));
--rollback drop table users;
