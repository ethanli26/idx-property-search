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
  test("returns the page and the total for the filter set", async () => {
    queueListings(2, [PROPERTY, { ...PROPERTY, L_ListingID: "1002" }]);

    const response = await request(app).get("/api/properties");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.results).toHaveLength(2);
    expect(response.body.limit).toBe(20);
    expect(response.body.offset).toBe(0);
  });

  test("passes limit and offset through to the query", async () => {
    queueListings(100, [PROPERTY]);

    const response = await request(app).get(
      "/api/properties?limit=5&offset=40"
    );

    expect(response.status).toBe(200);
    expect(response.body.limit).toBe(5);
    expect(response.body.offset).toBe(40);

    //the page query is the second call, and paging is its last two parameters
    const [, params] = pool.query.mock.calls[1];
    expect(params.slice(-2)).toEqual([5, 40]);
  });

  test("builds a WHERE clause from each supported filter", async () => {
    queueListings(1, [PROPERTY]);

    await request(app).get(
      "/api/properties?city=Monterey&zipcode=93940&minPrice=100000&maxPrice=900000&beds=3&baths=2"
    );

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain("WHERE");
    expect(sql).toContain("L_City = ?");
    expect(sql).toContain("L_Zip = ?");
    expect(sql).toContain("L_SystemPrice >= ?");
    expect(sql).toContain("L_SystemPrice <= ?");
    expect(sql).toContain("L_Keyword2 = ?");
    expect(sql).toContain("LM_Dec_3 = ?");
    expect(params).toEqual(["Monterey", "93940", 100000, 900000, 3, 2]);
  });

  //the column must never be wrapped in a function, or its index goes unused
  test("compares the city column directly so its index stays usable", async () => {
    queueListings(1, [PROPERTY]);

    await request(app).get("/api/properties?city=  Monterey  ");

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toMatch(/LOWER\s*\(\s*TRIM/i);
    expect(params[0]).toBe("Monterey");
  });

  test("omits the WHERE clause when no filters are given", async () => {
    queueListings(50, [PROPERTY]);

    await request(app).get("/api/properties");

    expect(pool.query.mock.calls[0][0]).not.toContain("WHERE");
  });

  describe("sorting", () => {
    test("orders by the mapped column and direction", async () => {
      queueListings(1, [PROPERTY]);

      await request(app).get(
        "/api/properties?sortBy=price&sortOrder=desc"
      );

      expect(pool.query.mock.calls[1][0]).toContain(
        "ORDER BY L_SystemPrice DESC"
      );
    });

    test("always adds a tiebreaker so paging stays stable", async () => {
      queueListings(1, [PROPERTY]);

      await request(app).get("/api/properties?sortBy=beds&sortOrder=asc");

      expect(pool.query.mock.calls[1][0]).toContain("id ASC");
    });

    test("rejects a sort field that is not on the whitelist", async () => {
      const response = await request(app).get(
        "/api/properties?sortBy=L_SystemPrice; DROP TABLE"
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/sortBy must be one of/);
      //rejected before any query runs
      expect(pool.query).not.toHaveBeenCalled();
    });

    test("rejects an unknown sort direction", async () => {
      const response = await request(app).get(
        "/api/properties?sortBy=price&sortOrder=sideways"
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/sortOrder must be one of/);
    });
  });

  describe("invalid input", () => {
    test.each([
      ["limit=0", /limit must be an integer/],
      ["limit=500", /limit must be an integer/],
      ["limit=abc", /limit must be an integer/],
      ["offset=-1", /offset must be an integer/],
    ])("rejects %s with a 400", async (query, message) => {
      const response = await request(app).get(`/api/properties?${query}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(message);
    });

    test("rejects a non-numeric price", async () => {
      const response = await request(app).get("/api/properties?minPrice=cheap");

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/minPrice must be a number/);
    });
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

  test("passes the id as a bound parameter, never inline", async () => {
    pool.query.mockReturnValueOnce(rows([PROPERTY]));

    await request(app).get("/api/properties/1001");

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain("WHERE L_ListingID = ?");
    expect(params).toEqual(["1001"]);
  });

  test("returns 500 when the database fails", async () => {
    pool.query.mockRejectedValueOnce(new Error("connection lost"));

    const response = await request(app).get("/api/properties/1001");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to fetch property");
  });
});

describe("GET /api/properties/:id/openhouses", () => {
  const OPEN_HOUSE = {
    id: 1,
    L_ListingID: "1001",
    OpenHouseDate: "2026-09-05",
    OH_StartTime: "13:00:00",
    all_data: '{"OpenHouseRemarks":"Refreshments provided"}',
  };

  test("returns the events for a property", async () => {
    pool.query
      .mockReturnValueOnce(rows([{ L_ListingID: "1001" }])) //property exists
      .mockReturnValueOnce(rows([OPEN_HOUSE]));

    const response = await request(app).get(
      "/api/properties/1001/openhouses"
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].OH_StartTime).toBe("13:00:00");
  });

  //no scheduled events is a valid answer, not a missing resource
  test("returns an empty array when the property has no events", async () => {
    pool.query
      .mockReturnValueOnce(rows([{ L_ListingID: "1001" }]))
      .mockReturnValueOnce(rows([]));

    const response = await request(app).get(
      "/api/properties/1001/openhouses"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("returns 404 when the property itself does not exist", async () => {
    pool.query.mockReturnValueOnce(rows([]));

    const response = await request(app).get(
      "/api/properties/nope/openhouses"
    );

    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/No property found/);
  });

  test("returns 500 when the database fails", async () => {
    pool.query.mockRejectedValueOnce(new Error("connection lost"));

    const response = await request(app).get(
      "/api/properties/1001/openhouses"
    );

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to fetch open houses");
  });
});

describe("GET /api/properties/price-distribution", () => {
  test("returns the histogram buckets", async () => {
    pool.query
      .mockReturnValueOnce(rows([{ low: 100000, ceiling: 900000, high: 5000000, n: 500 }]))
      .mockReturnValueOnce(rows([{ idx: 0, n: 12 }, { idx: 1, n: 30 }]));

    const response = await request(app).get(
      "/api/properties/price-distribution"
    );

    expect(response.status).toBe(200);
    expect(response.body.low).toBe(100000);
    expect(response.body.buckets).toHaveLength(28);
    expect(response.body.buckets[1]).toBe(30);
    //a ceiling below the true high means the top bucket is open-ended
    expect(response.body.capped).toBe(true);
  });

  test("returns an empty distribution when nothing is priced", async () => {
    pool.query.mockReturnValueOnce(rows([{ low: null, ceiling: null, high: null, n: 0 }]));

    const response = await request(app).get(
      "/api/properties/price-distribution"
    );

    expect(response.status).toBe(200);
    expect(response.body.bucketSize).toBe(0);
    expect(response.body.buckets).toEqual([]);
  });

  //the histogram must not be narrowed by the price filter it is drawing
  test("ignores price filters while honouring the others", async () => {
    pool.query
      .mockReturnValueOnce(rows([{ low: 1, ceiling: 2, high: 3, n: 5 }]))
      .mockReturnValueOnce(rows([]));

    await request(app).get(
      "/api/properties/price-distribution?city=Monterey&minPrice=500000"
    );

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain("L_City = ?");
    expect(sql).not.toContain("L_SystemPrice >= ?");
    expect(params).toEqual(["Monterey"]);
  });
});

describe("GET /api/health", () => {
  test("reports ok when the database answers", async () => {
    pool.query.mockReturnValueOnce(rows([{ 1: 1 }]));

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  test("reports disconnected when the database does not", async () => {
    pool.query.mockRejectedValueOnce(new Error("refused"));

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(500);
    expect(response.body.database).toBe("disconnected");
  });
});
