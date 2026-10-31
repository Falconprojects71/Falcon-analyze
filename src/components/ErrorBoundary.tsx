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
        <div className="p-6 bg-white border border-[#DC4655]/30 rounded-xl text-center space-y-4 shadow-card my-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 text-[#DC4655] flex items-center justify-center border border-[#DC4655]/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-mono font-bold text-[#182338] uppercase tracking-wider">
              {this.props.fallbackTitle || 'Display Reset & Recovery'}
            </h3>
            <p className="text-xs font-mono text-[#64748B] mt-1 max-w-md mx-auto leading-relaxed">
              {this.state.error?.message || 'A temporary visual render issue occurred. Click below to refresh view.'}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 bg-[#245BDB] hover:bg-[#1948B8] text-white rounded-lg text-xs font-mono font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs"
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
