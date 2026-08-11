import { render, screen, fireEvent, within } from "@testing-library/react";
import PropertyImageGallery from "./PropertyImageGallery";

const PHOTOS = [
  "https://example.test/photo-1.jpg",
  "https://example.test/photo-2.jpg",
  "https://example.test/photo-3.jpg",
];

function openLightbox() {
  render(<PropertyImageGallery photos={PHOTOS} alt="123 Main St" />);
  fireEvent.click(screen.getByRole("button", { name: "Open photo viewer" }));
  return screen.getByRole("dialog", { name: "Photo viewer" });
}

describe("PropertyImageGallery", () => {
  //Week 8 debug challenge: the keydown handler was attached but never fired,
  //because a plain div is not focusable and so never receives key presses.
  //tabIndex is what puts it in reach of the keyboard; focusing it is the rest.
  test("makes the lightbox focusable and focuses it, so keys reach the handler", () => {
    const dialog = openLightbox();

    expect(dialog).toHaveAttribute("tabindex", "-1");
    expect(dialog).toHaveFocus();
  });

  test("closes the lightbox on Escape", () => {
    const dialog = openLightbox();

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("closes the lightbox on a click outside the photo", () => {
    const dialog = openLightbox();

    //the inline gallery is still mounted behind the overlay, so both queries
    //are scoped to the dialog to reach the photo the user is looking at
    fireEvent.click(within(dialog).getByAltText("123 Main St"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("navigates photos with the arrow keys", () => {
    const dialog = openLightbox();
    expect(within(dialog).getByText("1 / 3")).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(within(dialog).getByText("2 / 3")).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(within(dialog).getByText("1 / 3")).toBeInTheDocument();
  });
});
