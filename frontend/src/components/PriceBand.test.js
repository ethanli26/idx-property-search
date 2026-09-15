import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PriceBand from "./PriceBand";
import { loadPriceDistribution } from "../api/listingsApi";

jest.mock("../api/listingsApi", () => ({
  loadPriceDistribution: jest.fn(),
  loadListings: jest.fn(),
}));

const SPREAD = {
  low: 100000,
  high: 1000000,
  bucketSize: 32143,
  buckets: Array.from({ length: 28 }, (_, i) => i + 1),
  capped: false,
};

function renderBand(props = {}) {
  const wiring = {
    contextFilters: { city: "", zipcode: "", beds: "", baths: "" },
    minPrice: "",
    maxPrice: "",
    onChange: jest.fn(),
    ...props,
  };
  render(<PriceBand {...wiring} />);
  return wiring;
}

function openPanel() {
  fireEvent.click(screen.getByRole("button", { name: /Price/ }));
  return screen.findByRole("dialog", { name: "Price range" });
}

beforeEach(() => {
  jest.clearAllMocks();
  loadPriceDistribution.mockResolvedValue(SPREAD);
});

describe("PriceBand", () => {
  //the histogram costs a round trip, so it should not happen until it is wanted
  test("stays collapsed and does not fetch until opened", () => {
    renderBand();

    expect(loadPriceDistribution).not.toHaveBeenCalled();
    expect(screen.getByText("Any price")).toBeInTheDocument();
  });

  test("summarises the selected range on the trigger", () => {
    renderBand({ minPrice: "250000", maxPrice: "1500000" });

    expect(screen.getByText("$250K – $1.5M")).toBeInTheDocument();
  });

  test("fetches with the other active filters as context when opened", async () => {
    renderBand({
      contextFilters: { city: "Monterey", zipcode: "", beds: "3", baths: "" },
    });

    await openPanel();

    await waitFor(() =>
      expect(loadPriceDistribution).toHaveBeenCalledWith({
        city: "Monterey",
        zipcode: "",
        beds: "3",
        baths: "",
      })
    );
  });

  test("reports a typed bound to the parent", async () => {
    const { onChange } = renderBand();
    await openPanel();

    fireEvent.change(await screen.findByPlaceholderText("Min"), {
      target: { value: "300000" },
    });

    expect(onChange).toHaveBeenCalledWith({
      minPrice: "300000",
      maxPrice: "",
    });
  });

  test("says so when nothing priced matches", async () => {
    loadPriceDistribution.mockResolvedValue({
      low: 0,
      high: 0,
      bucketSize: 0,
      buckets: [],
      capped: false,
    });
    renderBand();

    await openPanel();

    expect(
      await screen.findByText("No priced listings match")
    ).toBeInTheDocument();
  });

  test("closes on Escape", async () => {
    renderBand();
    await openPanel();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });
});
