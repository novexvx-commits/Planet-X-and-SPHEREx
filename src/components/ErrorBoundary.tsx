import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[MARSAD ErrorBoundary Caught Exception]:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-500/40 bg-[#0d1322] p-6 sm:p-8 shadow-2xl text-center space-y-4 my-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 font-mono text-xs font-semibold text-rose-300">
            <span>SCIENTIFIC WORKSTATION EXCEPTION CAUGHT</span>
          </div>
          <h3 className="font-serif text-2xl text-slate-100">
            {this.props.fallbackTitle || "Scientific Module Display Recovered"}
          </h3>
          <p className="max-w-xl mx-auto font-mono text-xs text-slate-300 leading-relaxed">
            {this.state.error?.message ||
              "An unexpected error occurred while rendering this module. Archival data remains safe and accessible."}
          </p>
          <div className="pt-2">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-mono text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer shadow-sm"
            >
              Reset Module View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
