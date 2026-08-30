import { render, screen } from "@testing-library/react";
import PropertyMap from "./PropertyMap";

const ORIGINAL_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

afterEach(() => {
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY = ORIGINAL_KEY;
});

describe("PropertyMap", () => {
  describe("without coordinates", () => {
    //a map of the wrong place is worse than no map
    test.each([
      ["both missing", { latitude: null, longitude: null }],
      ["latitude only", { latitude: "36.6", longitude: null }],
      ["longitude only", { latitude: null, longitude: "-121.9" }],
      ["empty strings", { latitude: "", longitude: "" }],
      ["null island", { latitude: 0, longitude: 0 }],
      ["non-numeric", { latitude: "n/a", longitude: "n/a" }],
    ])("renders nothing when %s", (_label, coords) => {
      const { container } = render(<PropertyMap {...coords} />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("with coordinates", () => {
    const COORDS = { latitude: "36.6002", longitude: "-121.8947" };

    test("renders the map frame when an API key is configured", () => {
      process.env.REACT_APP_GOOGLE_MAPS_API_KEY = "test-key";

      render(<PropertyMap {...COORDS} address="12 Ocean View" />);

      const frame = screen.getByTitle("Map of 12 Ocean View");
      expect(frame).toBeInTheDocument();
      expect(frame).toHaveAttribute(
        "src",
        expect.stringContaining("36.6002,-121.8947")
      );
    });

    //the key is per-environment, so its absence is a setup state, not an error
    test("falls back to a placeholder when no API key is set", () => {
      delete process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

      render(<PropertyMap {...COORDS} address="12 Ocean View" />);

      expect(screen.getByText("Map unavailable")).toBeInTheDocument();
      expect(screen.queryByTitle(/^Map of/)).not.toBeInTheDocument();
    });

    test("offers directions in a new tab either way", () => {
      delete process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

      render(<PropertyMap {...COORDS} address="12 Ocean View" />);

      const link = screen.getByRole("link", { name: "Get Directions" });
      expect(link).toHaveAttribute(
        "href",
        expect.stringContaining("destination=36.6002,-121.8947")
      );
      expect(link).toHaveAttribute("target", "_blank");
      //without noreferrer the new tab can reach back into this one
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    });
  });
});
