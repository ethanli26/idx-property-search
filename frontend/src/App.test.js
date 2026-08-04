import { render, screen } from "@testing-library/react";
import App from "./App";
import { loadListings } from "./services/listingsApi";

//App mounts ListingsPage, which fetches on mount. The network is not what this asserts.
jest.mock("./services/listingsApi", () => ({
  loadListings: jest.fn(),
  loadPriceDistribution: jest.fn(),
}));

test("mounts the listings page", async () => {
  loadListings.mockResolvedValue({
    total: 0,
    limit: 20,
    offset: 0,
    results: [],
  });

  render(<App />);

  expect(
    screen.getByRole("heading", { name: "Properties" })
  ).toBeInTheDocument();

  //settle the initial fetch so the test does not end mid state update
  expect(await screen.findByText("No properties found")).toBeInTheDocument();
});
