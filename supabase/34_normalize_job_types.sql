-- ============================================================
-- 34_normalize_job_types.sql
--
-- Job types were free text (45 distinct values, lots of one-offs and
-- "A + B + C" combos), which made the dashboard Job Type Breakdown
-- and the Top Services report noisy. This maps them to a fixed list:
--   Roofing, Siding, Painting, Decking, Windows/Doors, Gutters,
--   Concrete/Hardscape, Patio Cover, Fencing, Flooring, Multi-Trade,
--   Other
--
-- Rule of thumb used below: a job touching two or more different
-- trades -> Multi-Trade; a job that is really one trade with an
-- add-on -> that trade; genuinely unclear -> Other (a short list you
-- can fix by hand with the new dropdown).
--
-- Run any time. Safe to re-run. After this, the job type field in the
-- app is a dropdown, so it stays clean going forward.
-- ============================================================

update jobs set job_type = 'Painting'
  where job_type in ('Exterior Painting','Interior','Exterior','Exterior + Interior');

update jobs set job_type = 'Roofing'
  where job_type in ('Flat Roof','Roofing + Gutters');

update jobs set job_type = 'Decking'
  where job_type in ('Railings','Staircase','Decking + Fence');

update jobs set job_type = 'Windows/Doors'
  where job_type in ('Window Replacement');

update jobs set job_type = 'Concrete/Hardscape'
  where job_type in ('Concrete','Concrete / Hardscape','Retaining Walls','Hardscaping');

update jobs set job_type = 'Patio Cover'
  where job_type in ('patio cover');

update jobs set job_type = 'Fencing'
  where job_type in ('fencing');

update jobs set job_type = 'Flooring'
  where job_type in ('Interior Flooring');

update jobs set job_type = 'Siding'
  where job_type like 'Trim%Fascia%';

update jobs set job_type = 'Other'
  where job_type in ('Holiday Lights');

-- everything with a "+", "&", or a comma joining trades -> Multi-Trade
update jobs set job_type = 'Multi-Trade'
  where (job_type like '%+%' or job_type like '%&%' or job_type like '%,%')
    and job_type not in ('Roofing','Siding','Painting','Decking','Windows/Doors',
      'Gutters','Concrete/Hardscape','Patio Cover','Fencing','Flooring',
      'Multi-Trade','Other');

-- verify: every job now on the fixed list, or null
select job_type, count(*) as jobs
from jobs
group by job_type
order by jobs desc;
