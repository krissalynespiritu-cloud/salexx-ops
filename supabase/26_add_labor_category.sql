-- ============================================================
--  Salexx Ops Hub — add the Labor cost category
--
--  Run AFTER 25. RUN THIS ON ITS OWN, BEFORE 27_import_real_costs.sql.
--
--  Postgres won't let a new enum value be used in the same
--  transaction that creates it, so this has to be its own step.
--  One line, then run 27.
--
--  Why a Labor category at all: the app normally derives labor from
--  time_entries x hourly wage. The historical jobs in the Job Costing
--  sheet have no time entries — the sheet's Labor column is the only
--  record that exists for them. 24 skips Labor for any job that DOES
--  have hours logged, so nothing double-counts.
-- ============================================================

alter type cost_category add value if not exists 'Labor';
