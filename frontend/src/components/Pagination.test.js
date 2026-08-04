import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "./Pagination";

function renderPagination(props = {}) {
  const wiring = {
    currentPage: 1,
    totalPages: 24,
    onPageChange: jest.fn(),
    ...props,
  };
  render(<Pagination {...wiring} />);
  return wiring;
}

//the page run as the user sees it, gaps included. read from the DOM rather than
//by role, because the gaps are aria-hidden and so are absent from the a11y tree.
function visibleRun() {
  const nav = screen.getByRole("navigation", { name: "Pagination" });
  return Array.from(nav.querySelectorAll("li")).map((item) =>
    item.textContent.trim()
  );
}

describe("Pagination", () => {
  test("stays hidden when every result fits on one page", () => {
    renderPagination({ totalPages: 1 });

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  test("on the first page, Previous is disabled and the gap is on the right", () => {
    renderPagination({ currentPage: 1, totalPages: 24 });

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(visibleRun()).toEqual(["1", "2", "3", "4", "5", "…", "24"]);
  });

  test("on the last page, Next is disabled and the gap is on the left", () => {
    renderPagination({ currentPage: 24, totalPages: 24 });

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(visibleRun()).toEqual(["1", "…", "20", "21", "22", "23", "24"]);
  });

  test("on a middle page, the current page sits between two gaps", () => {
    renderPagination({ currentPage: 5, totalPages: 24 });

    expect(visibleRun()).toEqual(["1", "…", "4", "5", "6", "…", "24"]);
    expect(screen.getByRole("button", { name: "Page 5" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  test("clicking a page number reports that page", () => {
    const { onPageChange } = renderPagination({
      currentPage: 5,
      totalPages: 24,
    });

    fireEvent.click(screen.getByRole("button", { name: "Page 6" }));

    expect(onPageChange).toHaveBeenCalledWith(6);
  });

  //Week 7 debug challenge: near the end of a long set the final page was
  //emitted twice, once by the run around the current page and again by the
  //last page appended after it.
  test("does not repeat the last page when the run already reaches the end", () => {
    renderPagination({ currentPage: 23, totalPages: 24 });

    expect(screen.getAllByRole("button", { name: "Page 24" })).toHaveLength(1);
  });
});
