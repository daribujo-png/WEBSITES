"use client";

/**
 * Catches errors thrown while creating or rendering a canvas (no WebGL,
 * context creation refused, shader failure) and hands control back to the
 * poster / gallery fallback instead of breaking the page.
 */
import { Component, type ReactNode } from "react";

interface Props {
  onError: () => void;
  children: ReactNode;
}

export class CanvasBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
