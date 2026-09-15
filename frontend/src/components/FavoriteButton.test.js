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
  L_Photos: "[]",
  L_Keyword2: 3,
};

//the heart lives inside the card, so it is tested where it actually sits
function renderCard() {
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<PropertyCard listing={LISTING} />} />
        <Route path="/property/:id" element={<p>Detail page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  clearFavorites();
  window.localStorage.clear();
});

describe("FavoriteButton", () => {
  test("saves and unsaves, persisting to storage", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Save to favorites" }));
    expect(JSON.parse(window.localStorage.getItem("idx.favorites"))).toEqual([
      "1001",
    ]);

    fireEvent.click(
      screen.getByRole("button", { name: "Remove from favorites" })
    );
    expect(JSON.parse(window.localStorage.getItem("idx.favorites"))).toEqual([]);
  });

  //the heart sits inside the card's link, so without stopPropagation saving a
  //property would also navigate away from the list
  test("saving does not navigate to the detail page", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Save to favorites" }));

    expect(screen.queryByText("Detail page")).not.toBeInTheDocument();
  });
});
