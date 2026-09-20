import { Component } from "react";
import { Button } from "./ui.jsx";

// React only catches errors thrown while rendering through a class component's lifecycle methods,
// so this is one of the few places a class component is still needed. Without a boundary, a single
// bad value in one component would unmount the whole app and leave a blank page.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div role="alert" className="mx-auto max-w-md rounded-xl border border-line bg-surface px-6 py-12 text-center">
        <h2 className="text-lg font-semibold text-fg">Something went wrong</h2>
        <p className="mt-1 text-muted">An unexpected error occurred while showing this page.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => this.setState({ failed: false })}>Try again</Button>
          <Button variant="secondary" onClick={() => window.location.assign("/")}>
            Go home
          </Button>
        </div>
      </div>
    );
  }
}
