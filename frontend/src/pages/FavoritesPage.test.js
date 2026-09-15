import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FavoritesPage from "./FavoritesPage";
import { loadListingById } from "../api/listingsApi";
import { clearFavorites, toggleFavorite } from "../hooks/useFavorites";

jest.mock("../api/listingsApi", () => ({
  loadListingById: jest.fn(),
  loadPriceDistribution: jest.fn(),
}));

function property(id, address) {
  return {
    L_ListingID: id,
    L_Address: address,
    L_City: "Monterey",
    L_State: "CA",
    L_SystemPrice: 850000,
    L_Photos: "[]",
    L_Keyword2: 3,
  };
}

function renderFavorites() {
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <FavoritesPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  clearFavorites();
});

describe("FavoritesPage", () => {
  test("invites the user to save something when nothing is saved", async () => {
    renderFavorites();

    expect(await screen.findByText("Nothing saved yet")).toBeInTheDocument();
    expect(loadListingById).not.toHaveBeenCalled();
  });

  test("loads and lists the saved properties", async () => {
    toggleFavorite("1001");
    loadListingById.mockResolvedValue(property("1001", "12 Ocean View"));

    renderFavorites();

    expect(await screen.findByText("12 Ocean View")).toBeInTheDocument();
    expect(screen.getByText("1 saved")).toBeInTheDocument();
  });

  test("clearing empties the list", async () => {
    toggleFavorite("1001");
    loadListingById.mockResolvedValue(property("1001", "12 Ocean View"));

    renderFavorites();
    await screen.findByText("12 Ocean View");

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(await screen.findByText("Nothing saved yet")).toBeInTheDocument();
  });
});
