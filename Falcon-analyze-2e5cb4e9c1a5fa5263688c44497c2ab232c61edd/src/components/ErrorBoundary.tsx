import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Frontend ErrorBoundary caught error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-[#0D121F] border border-rose-500/40 rounded-xl text-center space-y-4 shadow-xl my-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              {this.props.fallbackTitle || 'Display Reset & Recovery'}
            </h3>
            <p className="text-xs font-mono text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              {this.state.error?.message || 'A temporary visual render issue occurred. Click below to refresh view.'}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
