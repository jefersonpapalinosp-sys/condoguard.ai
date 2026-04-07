import { Component as ReactComponent, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends ReactComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <span className="material-symbols-outlined text-error text-4xl mb-3">error</span>
          <p className="font-headline font-bold text-on-surface">Algo deu errado</p>
          <p className="text-sm text-on-surface-variant mt-1">
            {this.state.error?.message ?? 'Erro inesperado. Recarregue a pagina.'}
          </p>
          <button
            className="mt-4 px-4 py-2 text-sm font-label font-bold uppercase tracking-widest bg-primary text-on-primary rounded-lg"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
