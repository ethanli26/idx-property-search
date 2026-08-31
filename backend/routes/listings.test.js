const request = require("supertest");

//The pool is replaced wholesale so the suite never touches MySQL. Each test
//queues the rows its endpoint expects, in the order the route asks for them.
jest.mock("../db", () => ({ query: jest.fn() }));

const pool = require("../db");
const app = require("../app");

//mysql2 resolves to [rows, fields]; only rows are ever read
function rows(value) {
  return Promise.resolve([value, []]);
}

//the listings route runs a COUNT first, then the page query
function queueListings(total, results) {
  pool.query
    .mockReturnValueOnce(rows([{ total }]))
    .mockReturnValueOnce(rows(results));
}

const PROPERTY = {
  L_ListingID: "1001",
  L_Address: "12 Ocean View",
  L_City: "Monterey",
  L_SystemPrice: 850000,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/properties", () => {
  test("returns the page of results and the total", async () => {
    queueListings(2, [PROPERTY, { ...PROPERTY, L_ListingID: "1002" }]);

    const response = await request(app).get("/api/properties");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.results).toHaveLength(2);
    expect(response.body.limit).toBe(20);
  });

  test("passes limit and offset through to the query", async () => {
    queueListings(100, [PROPERTY]);

    const response = await request(app).get("/api/properties?limit=5&offset=40");

    expect(response.body.offset).toBe(40);
    //paging is the last two parameters of the page query
    const [, params] = pool.query.mock.calls[1];
    expect(params.slice(-2)).toEqual([5, 40]);
  });

  test("builds a WHERE clause from every filter", async () => {
    queueListings(1, [PROPERTY]);

    await request(app).get(
      "/api/properties?city=Monterey&zipcode=93940&minPrice=100000&maxPrice=900000&beds=3&baths=2"
    );

    const [sql, params] = pool.query.mock.calls[0];
    expect(params).toEqual(["Monterey", "93940", 100000, 900000, 3, 2]);
    //the city column must stay bare, or MySQL cannot use its index and the
    //query goes back to scanning 18,000 rows
    expect(sql).toContain("L_City = ?");
    expect(sql).not.toMatch(/LOWER\s*\(\s*TRIM/i);
  });

  test("sorts by the mapped column and keeps a tiebreaker", async () => {
    queueListings(1, [PROPERTY]);

    await request(app).get("/api/properties?sortBy=price&sortOrder=desc");

    const sql = pool.query.mock.calls[1][0];
    expect(sql).toContain("ORDER BY L_SystemPrice DESC");
    //without this, rows sharing a price drift between pages
    expect(sql).toContain("id ASC");
  });

  test("rejects a sort field that is not on the whitelist", async () => {
    const response = await request(app).get(
      "/api/properties?sortBy=L_SystemPrice; DROP TABLE"
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/sortBy must be one of/);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test.each([
    ["limit=500", /limit must be an integer/],
    ["offset=-1", /offset must be an integer/],
    ["minPrice=cheap", /minPrice must be a number/],
  ])("rejects %s with a 400", async (query, message) => {
    const response = await request(app).get(`/api/properties?${query}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(message);
  });

  test("returns 500 when the database fails", async () => {
    pool.query.mockRejectedValueOnce(new Error("connection lost"));

    const response = await request(app).get("/api/properties");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to fetch listings");
  });
});

describe("GET /api/properties/:id", () => {
  test("returns the property when it exists", async () => {
    pool.query.mockReturnValueOnce(rows([PROPERTY]));

    const response = await request(app).get("/api/properties/1001");

    expect(response.status).toBe(200);
    expect(response.body.L_ListingID).toBe("1001");
    //the id is bound, never interpolated into the SQL
    expect(pool.query.mock.calls[0][1]).toEqual(["1001"]);
  });

  test("returns 404 when no property matches", async () => {
    pool.query.mockReturnValueOnce(rows([]));

    const response = await request(app).get("/api/properties/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/No property found/);
  });

  test("rejects an over-long id before querying", async () => {
    const response = await request(app).get(`/api/properties/${"9".repeat(51)}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid listing ID");
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe("GET /api/properties/:id/openhouses", () => {
  const OPEN_HOUSE = {
    id: 1,
    OpenHouseDate: "2026-09-05",
    OH_StartTime: "13:00:00",
    all_data: '{"OpenHouseRemarks":"Refreshments provided"}',
  };

  test("returns the events for a property", async () => {
    pool.query
      .mockReturnValueOnce(rows([{ L_ListingID: "1001" }])) //property exists
      .mockReturnValueOnce(rows([OPEN_HOUSE]));

    const response = await request(app).get("/api/properties/1001/openhouses");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  //no scheduled events is a valid answer, not a missing resource
  test("returns an empty array when there are no events", async () => {
    pool.query
      .mockReturnValueOnce(rows([{ L_ListingID: "1001" }]))
      .mockReturnValueOnce(rows([]));

    const response = await request(app).get("/api/properties/1001/openhouses");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("returns 404 when the property itself does not exist", async () => {
    pool.query.mockReturnValueOnce(rows([]));

    const response = await request(app).get("/api/properties/nope/openhouses");

    expect(response.status).toBe(404);
  });
});

describe("GET /api/properties/price-distribution", () => {
  test("returns histogram buckets and ignores the price filter", async () => {
    pool.query
      .mockReturnValueOnce(
        rows([{ low: 100000, ceiling: 900000, high: 5000000, n: 500 }])
      )
      .mockReturnValueOnce(rows([{ idx: 1, n: 30 }]));

    const response = await request(app).get(
      "/api/properties/price-distribution?city=Monterey&minPrice=500000"
    );

    expect(response.status).toBe(200);
    expect(response.body.buckets).toHaveLength(28);
    //the histogram must not be narrowed by the price filter it is drawing
    expect(pool.query.mock.calls[0][1]).toEqual(["Monterey"]);
  });
});
