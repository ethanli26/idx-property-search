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

  test("steps through the photos and wraps at the ends", () => {
    render(<PropertyImageCarousel photos={PHOTOS} alt="12 Ocean View" />);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    //back past the first photo lands on the last
    fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  //the carousel sits inside the card's link, so an arrow press must not bubble
  //up to it or browsing photos would navigate away
  test("arrow clicks do not reach a parent link", () => {
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
});
