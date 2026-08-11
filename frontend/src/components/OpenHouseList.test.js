import { render, screen } from "@testing-library/react";
import OpenHouseList from "./OpenHouseList";

//mirrors a row as the backend returns it: the remarks are not a column of their
//own, they sit inside the all_data JSON blob
function openHouseRow(overrides = {}) {
  return {
    id: 1,
    L_ListingID: "1001",
    OpenHouseDate: "2026-08-15",
    OH_StartTime: "13:00:00",
    OH_EndTime: "16:00:00",
    all_data: JSON.stringify({
      OpenHouseRemarks: "Refreshments provided, street parking available.",
    }),
    ...overrides,
  };
}

describe("OpenHouseList", () => {
  //Week 8 debug challenge: reading OpenHouseRemarks off the row returns
  //undefined, because the value lives inside the all_data blob
  test("pulls the remarks out of the all_data blob", () => {
    render(<OpenHouseList openHouses={[openHouseRow()]} />);

    expect(
      screen.getByText("Refreshments provided, street parking available.")
    ).toBeInTheDocument();
  });

  test("shows the date and a readable time window", () => {
    render(<OpenHouseList openHouses={[openHouseRow()]} />);

    expect(screen.getByText("Saturday, August 15")).toBeInTheDocument();
    expect(screen.getByText("1:00 PM – 4:00 PM")).toBeInTheDocument();
  });

  test("renders the event even when the blob is missing or unparseable", () => {
    render(
      <OpenHouseList
        openHouses={[
          openHouseRow({ id: 1, all_data: null }),
          openHouseRow({ id: 2, all_data: "{not valid json" }),
        ]}
      />
    );

    //no remarks is a quiet omission, not a crash or an empty paragraph
    expect(screen.getAllByText("Saturday, August 15")).toHaveLength(2);
  });

  test("says so plainly when the property has no open houses", () => {
    render(<OpenHouseList openHouses={[]} />);

    expect(screen.getByText("No open houses scheduled")).toBeInTheDocument();
  });
});
