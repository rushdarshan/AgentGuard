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
        <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A] text-[#EAEAEA]">
          <div className="text-center">
            <h1 className="font-display text-2xl font-black tracking-[-0.03em] mb-4">&lt; CRITICAL FAILURE /&gt;</h1>
            <p className="font-mono text-sm text-[#E61919]">SYSTEM ENCOUNTERED AN UNRECOVERABLE ERROR.</p>
            <p className="font-mono text-[11px] text-[#8A8A8A] mt-2">REFRESH THE PAGE TO RE-INITIALIZE.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
