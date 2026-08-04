import { render, screen, fireEvent } from "@testing-library/react";
import PropertyFilters from "./PropertyFilters";

//the real PriceBand fetches its histogram, which is not what these tests are about
jest.mock("./PriceBand", () => ({
  __esModule: true,
  default: () => null,
}));

//every test needs the three callbacks, so default them and let cases override
function renderFilters(props = {}) {
  const handlers = {
    onSearch: jest.fn(),
    onClear: jest.fn(),
    busy: false,
    ...props,
  };
  render(<PropertyFilters {...handlers} />);
  return handlers;
}

describe("PropertyFilters", () => {
  test("renders every filter control with its visible label", () => {
    renderFilters();

    expect(screen.getByLabelText("City")).toBeInTheDocument();
    expect(screen.getByLabelText("ZIP Code")).toBeInTheDocument();
    expect(screen.getByLabelText("Beds")).toBeInTheDocument();
    expect(screen.getByLabelText("Baths")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });

  test("submits the entered values to onSearch", () => {
    const { onSearch } = renderFilters();

    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Austin" },
    });
    fireEvent.change(screen.getByLabelText("ZIP Code"), {
      target: { value: "78704" },
    });
    fireEvent.change(screen.getByLabelText("Beds"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Baths"), { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith({
      city: "Austin",
      zipcode: "78704",
      minPrice: "",
      maxPrice: "",
      beds: "3",
      baths: "2",
    });
  });

  test("resets the form and notifies onClear when Clear is clicked", () => {
    const { onClear } = renderFilters();

    const cityInput = screen.getByLabelText("City");
    const bedsSelect = screen.getByLabelText("Beds");

    fireEvent.change(cityInput, { target: { value: "Austin" } });
    fireEvent.change(bedsSelect, { target: { value: "3" } });
    expect(cityInput).toHaveValue("Austin");
    expect(bedsSelect).toHaveValue("3");

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(cityInput).toHaveValue("");
    expect(bedsSelect).toHaveValue("");
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
