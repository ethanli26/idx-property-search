import { render, screen, fireEvent, act } from "@testing-library/react";
import ListingsPage from "./ListingsPage";
import { loadListings } from "../services/listingsApi";

//the page is the unit here, so the API module is replaced wholesale.
//loadPriceDistribution is stubbed because PriceBand imports it, even though
//the collapsed panel does not call it until it is opened.
jest.mock("../services/listingsApi", () => ({
  loadListings: jest.fn(),
  loadPriceDistribution: jest.fn(),
}));

//a promise whose settlement this test controls, for ordering two in-flight requests
function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function listing(id, address) {
  return {
    L_ListingID: id,
    L_Address: address,
    L_City: "Austin",
    L_State: "TX",
    L_SystemPrice: 500000,
    L_Photos: "[]",
    L_Keyword2: 3,
    LM_Dec_3: 2,
    LM_Int2_3: 1800,
  };
}

function page(results) {
  return { total: results.length, limit: 20, offset: 0, results };
}

//serves whichever slice the page asks for out of a result set of the given size,
//so the addresses on screen say which page the user is actually looking at
function pagedSource(total) {
  return ({ limit, offset }) => {
    const size = Math.max(Math.min(limit, total - offset), 0);
    const results = Array.from({ length: size }, (_, index) =>
      listing(String(offset + index + 1), `Address ${offset + index + 1}`)
    );
    return Promise.resolve({ total, limit, offset, results });
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  //jsdom has no layout, so the scroll the page performs on a page change is stubbed
  window.scrollTo = jest.fn();
});

describe("ListingsPage", () => {
  test("shows the empty state when nothing matches", async () => {
    loadListings.mockResolvedValue(page([]));

    render(<ListingsPage />);

    expect(await screen.findByText("No properties found")).toBeInTheDocument();
  });

  //Week 6 debug challenge: search, clear, search again must not flash the
  //superseded results. The effect's cleanup flag is what prevents it.
  test("ignores a superseded response that resolves after a newer one", async () => {
    const stale = deferred();
    const fresh = deferred();

    loadListings
      .mockResolvedValueOnce(page([listing("1", "Initial Ave")])) //mount
      .mockReturnValueOnce(stale.promise) //the search that gets superseded
      .mockReturnValueOnce(fresh.promise); //the clear that supersedes it

    render(<ListingsPage />);
    await screen.findByText("Initial Ave");

    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Austin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    //the newer request finishes first, so the grid is settled and no longer loading
    await act(async () => {
      fresh.resolve(page([listing("3", "Fresh Blvd")]));
    });
    expect(await screen.findByText("Fresh Blvd")).toBeInTheDocument();

    //the abandoned search lands late. Without the cleanup flag it would clobber
    //the settled grid, which is the flash the user sees.
    await act(async () => {
      stale.resolve(page([listing("2", "Stale Road")]));
    });
    expect(screen.queryByText("Stale Road")).not.toBeInTheDocument();
    expect(screen.getByText("Fresh Blvd")).toBeInTheDocument();
  });
});

describe("ListingsPage pagination", () => {
  test("keeps the active filters and scrolls up when moving to another page", async () => {
    loadListings.mockImplementation(pagedSource(45));

    render(<ListingsPage />);
    await screen.findByText("Address 1");

    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Austin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText("Address 1");

    fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    await screen.findByText("Address 21");

    //the filter survives the page change, it is not dropped or resubmitted
    expect(loadListings).toHaveBeenLastCalledWith(
      expect.objectContaining({ city: "Austin", limit: 20, offset: 20 })
    );
    expect(
      screen.getByText("Showing 21-40 of 45 properties")
    ).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  test("returns to the first page when new filters are applied", async () => {
    loadListings.mockImplementation(pagedSource(45));

    render(<ListingsPage />);
    await screen.findByText("Address 1");

    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    await screen.findByText("Address 41");

    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Austin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    //page 3 described the unfiltered set, so the filtered set starts over
    expect(await screen.findByText("Address 1")).toBeInTheDocument();
    expect(loadListings).toHaveBeenLastCalledWith(
      expect.objectContaining({ city: "Austin", offset: 0 })
    );
  });
});
