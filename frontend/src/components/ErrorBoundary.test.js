import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

//React logs every caught render error to console.error. That is expected here,
//so it is silenced to keep the test output readable.
let consoleError;

beforeEach(() => {
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

function Boom() {
  throw new Error("Cannot read properties of undefined");
}

describe("ErrorBoundary", () => {
  test("renders its children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>Listings are fine</p>
      </ErrorBoundary>
    );

    expect(screen.getByText("Listings are fine")).toBeInTheDocument();
  });

  test("shows the recovery UI instead of a blank page when a child throws", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cannot read properties of undefined")
    ).toBeInTheDocument();
  });

  test("Try again re-renders the children, recovering once the fault clears", () => {
    let stillBroken = true;

    function Flaky() {
      if (stillBroken) throw new Error("transient");
      return <p>Recovered content</p>;
    }

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    //whatever caused the throw is resolved, so the retry should now succeed
    stillBroken = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("Recovered content")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });
});
