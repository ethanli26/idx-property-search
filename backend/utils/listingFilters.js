//Builds the WHERE conditions shared by the listings and distribution queries.
//Price can be excluded so the histogram is not narrowed by the price filter itself.
function buildFilterClause(query, options = {}) {
  const { includePrice = true } = options;
  const conditions = [];
  const values = [];

  if (query.city) {
    conditions.push("LOWER(TRIM(L_City)) = LOWER(TRIM(?))");
    values.push(query.city);
  }
  if (query.zipcode) {
    conditions.push("L_Zip = ?");
    values.push(query.zipcode);
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
