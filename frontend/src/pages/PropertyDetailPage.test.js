import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PropertyDetailPage from "./PropertyDetailPage";
import { loadListingById, loadOpenHouses } from "../api/listingsApi";

jest.mock("../api/listingsApi", () => ({
  loadListingById: jest.fn(),
  loadOpenHouses: jest.fn(),
}));

const PROPERTY = {
  L_ListingID: "1001",
  L_DisplayId: "MLS-1001",
  L_Address: "12 Ocean View",
  L_City: "Monterey",
  L_State: "CA",
  L_Zip: "93940",
  L_SystemPrice: 850000,
  L_Photos: JSON.stringify(["https://example.test/1.jpg"]),
  L_Keyword2: 3,
  LM_Dec_3: 2,
  LM_Int2_3: 1600,
  L_Remarks: "A light-filled home close to the water.",
  YearBuilt: 1998,
  L_Type_: "SingleFamilyResidence",
  LotSizeAcres: 0.4261,
  GarageYN: 1,
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
        <Route path="/" element={<p>Listings page</p>} />
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
    expect(screen.getByText("Monterey, CA, 93940")).toBeInTheDocument();
    expect(
      screen.getByText("A light-filled home close to the water.")
    ).toBeInTheDocument();
  });

  //the feed stores enumerations as PascalCase run-ons and acres to four places
  test("humanises the property detail values", async () => {
    loadListingById.mockResolvedValue(PROPERTY);
    loadOpenHouses.mockResolvedValue([]);

    renderDetail();
    await screen.findByText("12 Ocean View");

    expect(screen.getByText("Single Family Residence")).toBeInTheDocument();
    expect(screen.getByText("0.43 acres")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  test("shows an error notice instead of crashing on an unknown id", async () => {
    loadListingById.mockRejectedValue(
      new Error("Request failed with status 404: No property found")
    );

    renderDetail("not-a-real-id");

    expect(await screen.findByText("Property unavailable")).toBeInTheDocument();
    expect(screen.getByText(/No property found/)).toBeInTheDocument();
  });

  //a missing open house list should not take the whole page down with it
  test("still renders the property when open houses fail to load", async () => {
    loadListingById.mockResolvedValue(PROPERTY);
    loadOpenHouses.mockRejectedValue(new Error("openhouses unavailable"));

    renderDetail();

    expect(await screen.findByText("12 Ocean View")).toBeInTheDocument();
    expect(screen.getByText("No open houses scheduled")).toBeInTheDocument();
  });

  test("renders open house events with their remarks", async () => {
    loadListingById.mockResolvedValue(PROPERTY);
    loadOpenHouses.mockResolvedValue([
      {
        id: 1,
        OpenHouseDate: "2026-09-05",
        OH_StartTime: "13:00:00",
        OH_EndTime: "16:00:00",
        all_data: JSON.stringify({ OpenHouseRemarks: "Street parking only" }),
      },
    ]);

    renderDetail();

    expect(await screen.findByText("Street parking only")).toBeInTheDocument();
    expect(screen.getByText("1:00 PM – 4:00 PM")).toBeInTheDocument();
  });

  test("scrolls to the top so the page does not open mid-scroll", async () => {
    loadListingById.mockResolvedValue(PROPERTY);
    loadOpenHouses.mockResolvedValue([]);

    renderDetail();
    await screen.findByText("12 Ocean View");

    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 0));
  });

  test("offers a way back to the listings", async () => {
    loadListingById.mockResolvedValue(PROPERTY);
    loadOpenHouses.mockResolvedValue([]);

    renderDetail();
    await screen.findByText("12 Ocean View");

    expect(
      screen.getByRole("link", { name: "Back to results" })
    ).toHaveAttribute("href", "/");
  });
});
