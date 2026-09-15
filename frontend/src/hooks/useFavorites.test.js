import { render, screen, fireEvent, act } from "@testing-library/react";
import { useFavorites, clearFavorites, syncFromStorage } from "./useFavorites";

//two separate components reading the same hook, to prove they share one list
function Probe() {
  const { count, toggle } = useFavorites();
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button type="button" onClick={() => toggle("1001")}>
        toggle
      </button>
    </div>
  );
}

function HeaderCount() {
  const { count } = useFavorites();
  return <span data-testid="header-count">{count}</span>;
}

beforeEach(() => {
  window.localStorage.clear();
  clearFavorites();
});

describe("useFavorites", () => {
  //syncFromStorage is the same call the module makes at import time, so this
  //covers the path that restores saved properties on a fresh page load
  test("hydrates from what a previous visit saved, ignoring corrupt data", () => {
    window.localStorage.setItem("idx.favorites", JSON.stringify(["1001"]));
    act(() => syncFromStorage());
    render(<Probe />);
    expect(screen.getByTestId("count")).toHaveTextContent("1");

    window.localStorage.setItem("idx.favorites", "{not json");
    act(() => syncFromStorage());
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  //the count in the page header and the heart on a card are different
  //components; toggling one has to move the other in the same render
  test("shares one list across every component that reads it", () => {
    render(
      <>
        <Probe />
        <HeaderCount />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: "toggle" }));

    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("header-count")).toHaveTextContent("1");
  });
});
