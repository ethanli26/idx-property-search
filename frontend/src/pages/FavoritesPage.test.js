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
    LM_Dec_3: 2,
    LM_Int2_3: 1600,
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
    toggleFavorite("1002");
    loadListingById
      .mockResolvedValueOnce(property("1001", "12 Ocean View"))
      .mockResolvedValueOnce(property("1002", "9 Harbor Road"));

    renderFavorites();

    expect(await screen.findByText("12 Ocean View")).toBeInTheDocument();
    expect(screen.getByText("9 Harbor Road")).toBeInTheDocument();
    expect(screen.getByText("2 saved")).toBeInTheDocument();
  });

  //a listing pulled from the feed since it was saved should not empty the page
  test("skips a saved property that no longer exists", async () => {
    toggleFavorite("1001");
    toggleFavorite("gone");
    loadListingById.mockImplementation((id) =>
      id === "1001"
        ? Promise.resolve(property("1001", "12 Ocean View"))
        : Promise.reject(new Error("404"))
    );

    renderFavorites();

    expect(await screen.findByText("12 Ocean View")).toBeInTheDocument();
  });

  test("clearing removes everything and returns to the empty state", async () => {
    toggleFavorite("1001");
    loadListingById.mockResolvedValue(property("1001", "12 Ocean View"));

    renderFavorites();
    await screen.findByText("12 Ocean View");

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(await screen.findByText("Nothing saved yet")).toBeInTheDocument();
  });

  test("uses the singular when exactly one property is saved", async () => {
    toggleFavorite("1001");
    loadListingById.mockResolvedValue(property("1001", "12 Ocean View"));

    renderFavorites();

    expect(await screen.findByText("1 saved")).toBeInTheDocument();
  });
});
