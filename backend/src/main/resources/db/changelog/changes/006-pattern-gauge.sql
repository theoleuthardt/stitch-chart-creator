--liquibase formatted sql

--changeset stitch-chart-creator:006-pattern-gauge
alter table patterns add column gauge_stitches double precision;
alter table patterns add column gauge_rows double precision;
alter table patterns add column gauge_unit varchar(8);
--rollback alter table patterns drop column gauge_unit;
--rollback alter table patterns drop column gauge_rows;
--rollback alter table patterns drop column gauge_stitches;
