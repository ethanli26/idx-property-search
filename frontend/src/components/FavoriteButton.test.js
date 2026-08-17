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
  LM_Dec_3: 2,
  LM_Int2_3: 1600,
};

//the card is a link, so the detail route is stubbed to make navigation visible
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
  test("starts empty and fills once the property is saved", () => {
    renderCard();

    const heart = screen.getByRole("button", { name: "Save to favorites" });
    expect(heart).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(heart);

    const saved = screen.getByRole("button", { name: "Remove from favorites" });
    expect(saved).toHaveAttribute("aria-pressed", "true");
  });

  //the heart sits inside the card's link, so without stopPropagation saving a
  //property would also navigate away from the list
  test("saving a property does not navigate to the detail page", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Save to favorites" }));

    expect(screen.queryByText("Detail page")).not.toBeInTheDocument();
  });

  test("the rest of the card still navigates", () => {
    renderCard();

    fireEvent.click(screen.getByText("12 Ocean View"));

    expect(screen.getByText("Detail page")).toBeInTheDocument();
  });

  test("writes the saved id to storage, so it outlives the tab", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Save to favorites" }));

    expect(JSON.parse(window.localStorage.getItem("idx.favorites"))).toEqual([
      "1001",
    ]);
  });

  test("unsaving removes the id again", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Save to favorites" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove from favorites" }));

    expect(JSON.parse(window.localStorage.getItem("idx.favorites"))).toEqual([]);
    expect(
      screen.getByRole("button", { name: "Save to favorites" })
    ).toBeInTheDocument();
  });
});
