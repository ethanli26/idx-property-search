//The public sort keys are deliberately not the column names. The API surface
//stays stable if the underlying RETS columns are ever remapped, and the map
//doubles as the whitelist: anything that is not a key here never reaches SQL.
const SORTABLE_COLUMNS = {
  price: "L_SystemPrice",
  date: "ListingContractDate",
  sqft: "LM_Int2_3",
  beds: "L_Keyword2",
};

const SORT_DIRECTIONS = {
  asc: "ASC",
  desc: "DESC",
};

//Rows sharing a sort value come back in whatever order the storage engine
//chooses, which makes LIMIT/OFFSET paging repeat and skip listings between
//pages. The unique id breaks every tie, so the page boundaries stay put.
const TIEBREAKER = "id ASC";

//Returns { clause, error }. A non-null error means the request should be
//rejected with a 400 rather than silently falling back to an unsorted result,
//which would look to the user like the sort control did nothing.
function buildOrderClause(query = {}) {
  const requestedSort = query.sortBy;
  const requestedOrder = query.sortOrder;

  if (requestedSort === undefined || requestedSort === "") {
    //no sort asked for, but paging still needs a deterministic order
    return { clause: `ORDER BY ${TIEBREAKER}`, error: null };
  }

  const column = SORTABLE_COLUMNS[String(requestedSort).toLowerCase()];
  if (!column) {
    return {
      clause: "",
      error: `sortBy must be one of: ${Object.keys(SORTABLE_COLUMNS).join(", ")}`,
    };
  }

  const direction =
    requestedOrder === undefined || requestedOrder === ""
      ? "ASC"
      : SORT_DIRECTIONS[String(requestedOrder).toLowerCase()];

  if (!direction) {
    return {
      clause: "",
      error: `sortOrder must be one of: ${Object.keys(SORT_DIRECTIONS).join(", ")}`,
    };
  }

  //both halves are looked up from the constants above and never taken from the
  //request, so this interpolation cannot carry user input into the query
  return {
    clause: `ORDER BY ${column} ${direction}, ${TIEBREAKER}`,
    error: null,
  };
}

module.exports = { buildOrderClause, SORTABLE_COLUMNS, SORT_DIRECTIONS };
