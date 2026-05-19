"use client";

import { Component } from "react";
import { Panel } from "@/components/ui";

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Panel className="p-6 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-coral">
            {this.props.fallbackTitle ?? "Something went wrong"}
          </p>
          <p className="mt-3 text-sm text-stone-600">
            This section encountered an error.
          </p>
          <button
            type="button"
            className="mt-4 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-sm font-semibold text-ink transition hover:border-lagoon hover:text-lagoon"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </Panel>
      );
    }

    return this.props.children;
  }
}
