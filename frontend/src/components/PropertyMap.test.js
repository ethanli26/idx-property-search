import { render, screen } from "@testing-library/react";
import PropertyMap from "./PropertyMap";

const COORDS = { latitude: "36.6002", longitude: "-121.8947" };
const ORIGINAL_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

afterEach(() => {
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY = ORIGINAL_KEY;
});

describe("PropertyMap", () => {
  //a map of the wrong place is worse than no map, and 0,0 is the fallback a
  //missing coordinate lands on rather than a real location
  test.each([
    ["a coordinate is missing", { latitude: "36.6", longitude: null }],
    ["the coordinates are 0,0", { latitude: 0, longitude: 0 }],
  ])("renders nothing when %s", (_label, coords) => {
    const { container } = render(<PropertyMap {...coords} />);

    expect(container).toBeEmptyDOMElement();
  });

  test("renders the map frame when a key is configured", () => {
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY = "test-key";

    render(<PropertyMap {...COORDS} address="12 Ocean View" />);

    expect(screen.getByTitle("Map of 12 Ocean View")).toHaveAttribute(
      "src",
      expect.stringContaining("36.6002,-121.8947")
    );
  });

  //the key is per-environment, so its absence is a setup state, not an error
  test("falls back to a placeholder and still offers directions without a key", () => {
    delete process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    render(<PropertyMap {...COORDS} address="12 Ocean View" />);

    expect(screen.getByText("Map unavailable")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get Directions" })).toHaveAttribute(
      "href",
      expect.stringContaining("destination=36.6002,-121.8947")
    );
  });
});
