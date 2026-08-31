import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PropertyDetailPage from "./PropertyDetailPage";
import { loadListingById, loadOpenHouses } from "../api/listingsApi";

jest.mock("../api/listingsApi", () => ({
  loadListingById: jest.fn(),
  loadOpenHouses: jest.fn(),
}));

const PROPERTY = {
  L_ListingID: "1001",
  L_Address: "12 Ocean View",
  L_City: "Monterey",
  L_State: "CA",
  L_Zip: "93940",
  L_SystemPrice: 850000,
  L_Photos: JSON.stringify(["https://example.test/1.jpg"]),
  L_Keyword2: 3,
  LM_Dec_3: 2,
  L_Remarks: "A light-filled home close to the water.",
  YearBuilt: 1998,
  L_Type_: "SingleFamilyResidence",
  LMD_MP_Latitude: "36.6002",
  LMD_MP_Longitude: "-121.8947",
};

function renderDetail(id = "1001") {
  render(
    <MemoryRouter
      initialEntries={[`/property/${id}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/property/:id" element={<PropertyDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  window.scrollTo = jest.fn();
});

describe("PropertyDetailPage", () => {
  test("renders the property once it loads", async () => {
    loadListingById.mockResolvedValue(PROPERTY);
    loadOpenHouses.mockResolvedValue([]);

    renderDetail();

    expect(await screen.findByText("12 Ocean View")).toBeInTheDocument();
    expect(screen.getByText("$850,000")).toBeInTheDocument();
    //the feed stores enumerations as PascalCase run-ons
    expect(screen.getByText("Single Family Residence")).toBeInTheDocument();
  });

  test("shows an error notice instead of crashing on an unknown id", async () => {
    loadListingById.mockRejectedValue(
      new Error("Request failed with status 404: No property found")
    );

    renderDetail("not-a-real-id");

    expect(await screen.findByText("Property unavailable")).toBeInTheDocument();
  });

  //a missing open house list should not take the whole page down with it
  test("still renders the property when open houses fail to load", async () => {
    loadListingById.mockResolvedValue(PROPERTY);
    loadOpenHouses.mockRejectedValue(new Error("unavailable"));

    renderDetail();

    expect(await screen.findByText("12 Ocean View")).toBeInTheDocument();
    expect(screen.getByText("No open houses scheduled")).toBeInTheDocument();
  });
});
