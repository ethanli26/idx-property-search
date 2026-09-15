# Performance Analysis — Week 9, Part B

Measured against the live project database on 2026-08-12.

| | |
|---|---|
| Table | `rets_property` |
| Rows | 36,193 |
| Data size | ~706 MB |
| Index size | ~13 MB |

---

## 1. The query analysed (requirement 52)

The most expensive path in the app is the listings page with every filter applied
and a sort active. It runs as two statements per request — a count for the
pagination total, and a page query for the twenty rows on screen.

```sql
SELECT * FROM rets_property
WHERE LOWER(TRIM(L_City)) = LOWER(TRIM(?))
  AND L_SystemPrice >= ? AND L_SystemPrice <= ?
  AND L_Keyword2 = ? AND LM_Dec_3 = ?
ORDER BY L_SystemPrice DESC, id ASC
LIMIT 20 OFFSET 0;
```

### EXPLAIN output — before

```
id            1
select_type   SIMPLE
table         rets_property
type          ref
possible_keys idx_listing_price, idx_listing_beds, idx_listing_baths
key           idx_listing_beds
key_len       5
ref           const
rows          18096
filtered      25
Extra         Using where; Using filesort
```

### What each column means

| Column | Meaning | Reading here |
|---|---|---|
| `id` | Which SELECT this row belongs to; rises with subqueries | `1` — a single flat query |
| `select_type` | The role of this SELECT in the statement | `SIMPLE` — no subqueries or unions |
| `table` | Table this step reads | `rets_property` |
| `type` | **The access method — the single most important field.** Best to worst: `system` → `const` → `eq_ref` → `ref` → `range` → `index` → `ALL` | `ref` — an index is used, but it is not unique, so many rows match |
| `possible_keys` | Indexes MySQL *could* have used | Three price/beds/baths indexes — **no city index appears** |
| `key` | The index actually chosen | `idx_listing_beds` — a poor choice, only 27 distinct values |
| `key_len` | Bytes of the index used; shows how many columns of a composite were engaged | `5` — one small column |
| `ref` | What the indexed column is compared against | `const` — a literal from the query |
| `rows` | Estimated rows MySQL must examine | **18,096** — half the table |
| `filtered` | Percent of those rows expected to survive the WHERE | `25` — so ~4,500 truly match |
| `Extra` | Extra work beyond the index read | **`Using filesort`** — results must be sorted separately after reading |

### The finding

`possible_keys` lists no index on `L_City`, even though **two exist**
(`idx_L_City` and `idx_listing_city`). The cause is in the WHERE clause:

```sql
LOWER(TRIM(L_City)) = LOWER(TRIM(?))
```

Wrapping a column in a function makes the predicate **non-sargable**. MySQL
cannot look up a value in an index of `L_City` when what it needs to compare is
`LOWER(TRIM(L_City))` — a value the index does not store. The index is unusable
no matter how well built.

Deprived of the city index, the optimiser fell back to `idx_listing_beds`, which
has only 27 distinct values across 36,193 rows. That is why it examined 18,096
rows to return 20.

**The function was also unnecessary.** Verified against the schema and data:

- `L_City` collation is `utf8mb4_0900_ai_ci` — the `_ci` suffix means comparison
  is *already* case-insensitive, so `LOWER()` changes nothing.
- `SELECT COUNT(*) WHERE L_City <> TRIM(L_City)` returns **0** — no row carries
  stray whitespace, so `TRIM()` on the column changes nothing.
- All three query forms return an identical **693 rows**.

The fix keeps the normalisation but moves it to the *parameter*, leaving the
column bare and indexable — `backend/utils/listingFilters.js`:

```js
conditions.push("L_City = ?");
values.push(String(query.city).trim());
```

### EXPLAIN output — after

```
type          ref
key           idx_L_City, idx_listing_beds, idx_listing_baths
rows          173
Extra         Using intersect(idx_L_City, idx_listing_beds, idx_listing_baths); Using where; Using filesort
```

MySQL now performs an **index intersection**, reading three indexes and
intersecting their row sets before touching the table.

### Measured improvement

Best of three runs after a warm-up, no schema change of any kind:

| Query | Before | After | Improvement |
|---|---:|---:|---:|
| Page query | 1046 ms | **10 ms** | **104× faster** |
| Count query | 474 ms | **7 ms** | **68× faster** |
| Rows examined | 18,096 | **173** | 105× fewer |

The single most valuable change in Week 9 required no new index — only removing
a function that was silently disabling the indexes already present.

---

## 2. Composite indexes (requirement 53)

`Using filesort` still appears above: the rows are found efficiently, then sorted
as a separate step. A composite index whose leading column is fixed by equality
and whose second column is the sort key can supply the ordering directly.

The migration is in **`backend/sql/001-filter-indexes.sql`**:

| Index | Columns | Serves |
|---|---|---|
| `idx_prop_city_price` | `L_City, L_SystemPrice` | City + price range, sorted by price |
| `idx_prop_zip_price` | `L_Zip, L_SystemPrice` | ZIP + price range, sorted by price |
| `idx_prop_city_beds_baths` | `L_City, L_Keyword2, LM_Dec_3` | City + bed/bath combination |
| `idx_prop_price_id` | `L_SystemPrice, id` | Unfiltered browse sorted by price |

Column order is chosen by selectivity — `L_City` has ~900 distinct values against
27 for beds and 30 for baths, so leading with city eliminates the most rows first.

### Running and measuring it

```bash
# baseline
mysql -u <user> -p <db> -e "EXPLAIN SELECT * FROM rets_property WHERE L_City='Palm Springs' AND L_SystemPrice BETWEEN 200000 AND 2000000 ORDER BY L_SystemPrice DESC LIMIT 20;"

# apply — takes several minutes and locks writes
mysql -u <user> -p <db> < backend/sql/001-filter-indexes.sql

# after: expect `key` to become idx_prop_city_price and `Using filesort` to disappear
```

### Also found

Two index pairs are duplicates — `idx_L_City`/`idx_listing_city` and
`idx_L_Zip`/`idx_listing_zip` each index the same column twice. Redundant indexes
consume disk and slow every write without helping any read. Drop statements are
included, commented out, at the bottom of the migration.

---

## 3. Request timing (requirement 54)

Already satisfied by `backend/middleware/requestLog.js`, which records elapsed
milliseconds on the response `finish` event:

```
[2026-08-12T09:14:22.481Z] GET /api/properties?city=Palm+Springs 200 - 12ms
```

Using `finish` rather than timing the handler means the figure covers the whole
response, serialisation included.
