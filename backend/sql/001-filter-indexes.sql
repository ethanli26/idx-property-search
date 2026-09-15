-- Week 9, requirement 53: composite indexes for the most common filter combinations.
--
-- Run against the project database:
--   mysql -u <user> -p <database> < backend/sql/001-filter-indexes.sql
--
-- Building these on rets_property (36,193 rows / ~706MB) takes a few minutes and
-- holds a write lock for the duration. Run it when nobody else needs the table.
--
-- Measure before and after with backend/docs/performance.md, which records the
-- baseline EXPLAIN output and timings these are meant to improve on.

-- ---------------------------------------------------------------------------
-- 1. City + price. The single most common search: a city, then a price range,
--    displayed price-sorted. With L_City fixed by equality, the second column
--    supplies the ORDER BY in index order, which removes the filesort.
-- ---------------------------------------------------------------------------
CREATE INDEX idx_prop_city_price
  ON rets_property (L_City, L_SystemPrice);

-- ---------------------------------------------------------------------------
-- 2. ZIP + price. Same shape as above for users who search by ZIP instead.
-- ---------------------------------------------------------------------------
CREATE INDEX idx_prop_zip_price
  ON rets_property (L_Zip, L_SystemPrice);

-- ---------------------------------------------------------------------------
-- 3. City + beds + baths. The other common combination from the filter form.
--    Column order is deliberate: most selective first. L_City has ~900 distinct
--    values, L_Keyword2 (beds) has 27, LM_Dec_3 (baths) has 30, so leading with
--    city narrows hardest before the low-cardinality columns are consulted.
-- ---------------------------------------------------------------------------
CREATE INDEX idx_prop_city_beds_baths
  ON rets_property (L_City, L_Keyword2, LM_Dec_3);

-- ---------------------------------------------------------------------------
-- 4. Price + id. Browsing with no city or ZIP filter but sorted by price, which
--    is the default landing state once a user touches the sort control. The
--    trailing id matches the query's tiebreaker so the sort is fully covered.
-- ---------------------------------------------------------------------------
CREATE INDEX idx_prop_price_id
  ON rets_property (L_SystemPrice, id);


-- ---------------------------------------------------------------------------
-- OPTIONAL CLEANUP — review before running.
--
-- SHOW INDEX revealed two duplicated pairs, each indexing the same column twice:
--     idx_L_City   and idx_listing_city  -> both (L_City)
--     idx_L_Zip    and idx_listing_zip   -> both (L_Zip)
--
-- Redundant indexes cost disk and slow every INSERT/UPDATE without helping any
-- read. Dropping one of each pair is safe, but confirm nothing else in the
-- project references them by name first, and take a backup.
--
-- DROP INDEX idx_listing_city ON rets_property;
-- DROP INDEX idx_listing_zip  ON rets_property;
-- ---------------------------------------------------------------------------
