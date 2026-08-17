import { Component } from "react";
import "./ErrorBoundary.css";

//A render error anywhere below this point would otherwise unmount the whole
//React tree and leave a blank white page. Boundaries have to be class
//components: there is no hook equivalent of componentDidCatch.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    //a deployed app would forward this to a reporting service. The console
    //keeps the stack reachable while developing.
    console.error("Render error caught by boundary:", error, errorInfo);
  }

  handleRetry = () => {
    //clearing the error re-renders the children. A genuinely broken render
    //will throw straight back, which is the honest outcome.
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    return (
      <div className="error-boundary">
        <div className="error-boundary__panel">
          <p className="error-boundary__title">Something went wrong</p>
          <p className="error-boundary__body">
            This page hit an unexpected error and stopped rendering. Nothing was
            saved or changed.
          </p>
          {error.message && (
            <p className="error-boundary__detail">{error.message}</p>
          )}

          <div className="error-boundary__actions">
            <button
              type="button"
              className="error-boundary__retry"
              onClick={this.handleRetry}
            >
              Try again
            </button>
            {/* a plain link rather than a router one, so the recovery path
                works even if the failure was inside the router itself */}
            <a className="error-boundary__home" href="/">
              Back to properties
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
