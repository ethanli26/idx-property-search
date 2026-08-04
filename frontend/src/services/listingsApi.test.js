import { loadListings } from "./listingsApi";

//jsdom does not implement fetch, so give jest.spyOn a real function to replace
if (typeof global.fetch !== "function") {
  global.fetch = () => Promise.reject(new Error("fetch was not mocked"));
}

//stands in for the Response object, only the parts requestJson actually touches
function fakeResponse({ ok = true, status = 200, body = {} }) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe("listingsApi", () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("leaves empty filter values out of the query string", async () => {
    fetchSpy.mockResolvedValue(fakeResponse({ body: { results: [] } }));

    await loadListings({
      city: "Austin",
      zipcode: "",
      minPrice: "250000",
      maxPrice: null,
      beds: undefined,
      baths: "2",
    });

    const query = new URLSearchParams(fetchSpy.mock.calls[0][0].split("?")[1]);

    //the filters the user actually set survive
    expect(query.get("city")).toBe("Austin");
    expect(query.get("minPrice")).toBe("250000");
    expect(query.get("baths")).toBe("2");

    //the blank ones never reach the backend
    expect(query.has("zipcode")).toBe(false);
    expect(query.has("maxPrice")).toBe(false);
    expect(query.has("beds")).toBe(false);
  });

  test("resolves with the parsed JSON body on a successful response", async () => {
    const payload = {
      total: 2,
      limit: 20,
      offset: 0,
      results: [{ L_ListingID: "1001" }, { L_ListingID: "1002" }],
    };
    fetchSpy.mockResolvedValue(fakeResponse({ body: payload }));

    await expect(loadListings({ city: "Austin" })).resolves.toEqual(payload);
  });

  test("throws an error carrying the backend's message when the response is not ok", async () => {
    fetchSpy.mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 400,
        body: { error: "limit must be an integer between 1 and 100" },
      })
    );

    await expect(loadListings({ limit: 500 })).rejects.toThrow(
      "Request failed with status 400: limit must be an integer between 1 and 100"
    );
  });
});
