import { render, screen, fireEvent } from "@testing-library/react";
import PropertyImageCarousel from "./PropertyImageCarousel";

const PHOTOS = [
  "https://example.test/1.jpg",
  "https://example.test/2.jpg",
  "https://example.test/3.jpg",
];

describe("PropertyImageCarousel", () => {
  test("shows a placeholder when there are no photos", () => {
    render(<PropertyImageCarousel photos={[]} alt="12 Ocean View" />);

    expect(screen.getByText("No photo")).toBeInTheDocument();
  });

  //arrows on a single photo would do nothing, so they are not rendered
  test("hides the arrows and counter for a single photo", () => {
    render(<PropertyImageCarousel photos={[PHOTOS[0]]} alt="12 Ocean View" />);

    expect(
      screen.queryByRole("button", { name: "Next photo" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
  });

  test("counts through the photos with the arrows", () => {
    render(<PropertyImageCarousel photos={PHOTOS} alt="12 Ocean View" />);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  test("wraps around at both ends", () => {
    render(<PropertyImageCarousel photos={PHOTOS} alt="12 Ocean View" />);

    //back from the first photo lands on the last
    fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  //the carousel sits inside the card's link, so the arrows must not bubble
  test("arrow clicks do not propagate to a parent link", () => {
    const onParentClick = jest.fn();

    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
      <div onClick={onParentClick}>
        <PropertyImageCarousel photos={PHOTOS} alt="12 Ocean View" />
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));

    expect(onParentClick).not.toHaveBeenCalled();
  });

  test("falls back to the placeholder when a photo fails to load", () => {
    render(<PropertyImageCarousel photos={PHOTOS} alt="12 Ocean View" />);

    fireEvent.error(screen.getByAltText("12 Ocean View"));

    expect(screen.getByText("No photo")).toBeInTheDocument();
  });
});
