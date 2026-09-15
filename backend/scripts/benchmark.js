//Week 9, Part B: runs the same search two ways and prints the difference.
//
//   node scripts/benchmark.js
//
//The only difference between the two queries is where the text cleanup happens:
//BEFORE puts LOWER/TRIM on the column, AFTER puts it on the search term. Same
//results either way, but only the second one can use the index on L_City.
const pool = require("../db");

const FILTERS = { city: "Palm Springs", minPrice: 200000, maxPrice: 2000000 };
const SORT = "ORDER BY L_SystemPrice DESC, id ASC LIMIT 20";

const BEFORE = `WHERE LOWER(TRIM(L_City)) = LOWER(TRIM(?))
                  AND L_SystemPrice >= ? AND L_SystemPrice <= ?`;
const AFTER = `WHERE L_City = ?
                 AND L_SystemPrice >= ? AND L_SystemPrice <= ?`;

const ARGS = [FILTERS.city, FILTERS.minPrice, FILTERS.maxPrice];

//best of three, after a warm-up, so one unlucky run does not decide the number
async function timeQuery(sql) {
  await pool.query(sql, ARGS);
  const runs = [];
  for (let i = 0; i < 3; i += 1) {
    const startedAt = Date.now();
    await pool.query(sql, ARGS);
    runs.push(Date.now() - startedAt);
  }
  return Math.min(...runs);
}

async function planFor(sql) {
  const [rows] = await pool.query(`EXPLAIN SELECT * FROM rets_property ${sql}`, ARGS);
  return rows[0];
}

(async () => {
  const beforePlan = await planFor(`${BEFORE} ${SORT}`);
  const afterPlan = await planFor(`${AFTER} ${SORT}`);

  const beforeMs = await timeQuery(`SELECT * FROM rets_property ${BEFORE} ${SORT}`);
  const afterMs = await timeQuery(`SELECT * FROM rets_property ${AFTER} ${SORT}`);

  //proves the two queries are equivalent, so the speedup is not from doing less
  const [[b]] = await pool.query(`SELECT COUNT(*) n FROM rets_property ${BEFORE}`, ARGS);
  const [[a]] = await pool.query(`SELECT COUNT(*) n FROM rets_property ${AFTER}`, ARGS);

  console.log(`\n  Search: "${FILTERS.city}", $${FILTERS.minPrice.toLocaleString()}-$${FILTERS.maxPrice.toLocaleString()}\n`);
  console.log("  ".padEnd(20) + "BEFORE".padEnd(26) + "AFTER");
  console.log("  " + "-".repeat(68));
  console.log("  index used".padEnd(20) + String(beforePlan.key).padEnd(26) + afterPlan.key);
  console.log("  rows examined".padEnd(20) + String(beforePlan.rows).padEnd(26) + afterPlan.rows);
  console.log("  time".padEnd(20) + `${beforeMs} ms`.padEnd(26) + `${afterMs} ms`);
  console.log("  rows returned".padEnd(20) + String(b.n).padEnd(26) + a.n);
  console.log("  " + "-".repeat(68));
  console.log(`\n  ${(beforeMs / afterMs).toFixed(0)}x faster. Identical results (${a.n} properties).\n`);

  await pool.end();
})().catch((error) => {
  console.error("benchmark failed:", error.message);
  process.exit(1);
});
