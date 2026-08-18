import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Logged with a tag so it's easy to spot in production console/DevTools
    // and lets us pin the crashing component from the stack instead of guessing.
    console.error('[ErrorBoundary] caught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-6 text-center dark:bg-slate-900">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Something went wrong</h1>
          <p className="max-w-md text-sm text-gray-500 dark:text-slate-400">
            {this.state.error.message || 'An unexpected error occurred while rendering this page.'}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
