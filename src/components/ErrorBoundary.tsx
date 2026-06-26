import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#FBFBFA] text-[#111111]">
          <div className="text-center">
            <h1 className="font-serif text-2xl font-light tracking-[-0.02em] mb-4">Something went wrong</h1>
            <p className="text-[#787774]">Please refresh the page to try again.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
