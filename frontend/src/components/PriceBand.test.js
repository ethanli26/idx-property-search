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
  describe("collapsed", () => {
    //the histogram is a round trip, so it should not happen until it is wanted
    test("does not fetch the distribution before it is opened", () => {
      renderBand();

      expect(loadPriceDistribution).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    test.each([
      ["no bounds", { minPrice: "", maxPrice: "" }, "Any price"],
      ["a minimum only", { minPrice: "250000", maxPrice: "" }, "$250K+"],
      ["a maximum only", { minPrice: "", maxPrice: "900000" }, "Up to $900K"],
      [
        "both bounds",
        { minPrice: "250000", maxPrice: "1500000" },
        "$250K – $1.5M",
      ],
    ])("summarises %s on the trigger", (_label, prices, expected) => {
      renderBand(prices);

      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });

  describe("opened", () => {
    test("fetches the distribution and draws the histogram", async () => {
      renderBand();

      await openPanel();

      await waitFor(() => expect(loadPriceDistribution).toHaveBeenCalledTimes(1));
      expect(
        await screen.findByLabelText("Minimum price", { selector: "input[type=range]" })
      ).toBeInTheDocument();
    });

    test("passes the other active filters as context", async () => {
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

    test("survives the request failing", async () => {
      loadPriceDistribution.mockRejectedValue(new Error("unavailable"));
      renderBand();

      await openPanel();

      expect(
        await screen.findByText("No priced listings match")
      ).toBeInTheDocument();
    });

    test("reports a typed minimum to the parent", async () => {
      const { onChange } = renderBand();
      await openPanel();

      const input = await screen.findByPlaceholderText("Min");
      fireEvent.change(input, { target: { value: "300000" } });

      expect(onChange).toHaveBeenCalledWith({
        minPrice: "300000",
        maxPrice: "",
      });
    });

    test("clear resets both bounds", async () => {
      const { onChange } = renderBand({
        minPrice: "250000",
        maxPrice: "900000",
      });
      await openPanel();

      fireEvent.click(await screen.findByRole("button", { name: "Clear" }));

      expect(onChange).toHaveBeenCalledWith({ minPrice: "", maxPrice: "" });
    });

    test("clear is disabled when there is nothing to clear", async () => {
      renderBand();
      await openPanel();

      expect(
        await screen.findByRole("button", { name: "Clear" })
      ).toBeDisabled();
    });

    test("Done closes the panel", async () => {
      renderBand();
      await openPanel();

      fireEvent.click(await screen.findByRole("button", { name: "Done" }));

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      );
    });

    test("Escape closes the panel", async () => {
      renderBand();
      await openPanel();

      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      );
    });

    test("a click outside closes the panel", async () => {
      renderBand();
      await openPanel();

      fireEvent.mouseDown(document.body);

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      );
    });
  });
});
