import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PropertyCard from "./PropertyCard";
import { clearFavorites } from "../hooks/useFavorites";

const LISTING = {
  L_ListingID: "1001",
  L_Address: "12 Ocean View",
  L_City: "Monterey",
  L_State: "CA",
  L_SystemPrice: 850000,
  L_Photos: JSON.stringify(["https://example.test/1.jpg"]),
  L_Keyword2: 3,
  LM_Dec_3: 2,
  LM_Int2_3: 1600,
};

//the card links to the detail route, so a stub route makes navigation visible
function renderCard(overrides = {}) {
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/"
          element={<PropertyCard listing={{ ...LISTING, ...overrides }} />}
        />
        <Route path="/property/:id" element={<p>Detail page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  clearFavorites();
  window.localStorage.clear();
});

describe("PropertyCard", () => {
  test("renders the price, address, region, and stats", () => {
    renderCard();

    expect(screen.getByText("$850,000")).toBeInTheDocument();
    expect(screen.getByText("12 Ocean View")).toBeInTheDocument();
    expect(screen.getByText("Monterey, CA")).toBeInTheDocument();
    expect(screen.getByText(/3 bd/)).toBeInTheDocument();
  });

  test("clicking the card navigates to the detail page", () => {
    renderCard();

    fireEvent.click(screen.getByText("12 Ocean View"));

    expect(screen.getByText("Detail page")).toBeInTheDocument();
  });

  //the feed leaves these blank on plenty of rows, so the card must not print
  //"null beds" or an empty price
  test("falls back gracefully when price and stats are missing", () => {
    renderCard({
      L_SystemPrice: null,
      L_Keyword2: null,
      LM_Dec_3: null,
      LM_Int2_3: null,
    });

    expect(screen.getByText("Price on request")).toBeInTheDocument();
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
  });
});
