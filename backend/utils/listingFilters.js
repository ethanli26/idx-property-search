//Builds the WHERE conditions shared by the listings and distribution queries.
//Price can be excluded so the histogram is not narrowed by the price filter itself.
function buildFilterClause(query, options = {}) {
  const { includePrice = true } = options;
  const conditions = [];
  const values = [];

  //L_City is utf8mb4_0900_ai_ci, so = is already case- and accent-insensitive,
  //and no row in the table carries stray whitespace. Wrapping the column in
  //LOWER(TRIM(...)) changed no result but made the predicate non-sargable, so
  //MySQL could not use any city index: 18,096 rows scanned instead of 173.
  //Normalising the parameter instead keeps the column bare and indexable.
  if (query.city) {
    conditions.push("L_City = ?");
    values.push(String(query.city).trim());
  }
  if (query.zipcode) {
    conditions.push("L_Zip = ?");
    values.push(String(query.zipcode).trim());
  }
  if (includePrice && query.minPrice) {
    conditions.push("L_SystemPrice >= ?");
    values.push(Number(query.minPrice));
  }
  if (includePrice && query.maxPrice) {
    conditions.push("L_SystemPrice <= ?");
    values.push(Number(query.maxPrice));
  }
  if (query.beds) {
    conditions.push("L_Keyword2 = ?");
    values.push(Number(query.beds));
  }
  if (query.baths) {
    conditions.push("LM_Dec_3 = ?");
    values.push(Number(query.baths));
  }

  return { conditions, values };
}

module.exports = { buildFilterClause };
