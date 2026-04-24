import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * RouteErrorBoundary — catches any runtime error thrown by a route's
 * component tree (including Canvas shader compile errors, missing
 * assets, or malformed state) and shows a recoverable fallback UI
 * instead of a blank page.
 *
 * Sits INSIDE the SharedLayout so the nav + atmosphere backdrop stay
 * visible — users can still navigate away from the broken route.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    // In dev this hits the Vite overlay anyway; in prod we log to the
    // console so visitors can share diagnostics if they report an issue.
    console.error('[Mindsai] Route crashed:', error, errorInfo)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div
          className="max-w-md text-center"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-brand-teal text-[10px] uppercase tracking-[0.3em] font-medium mb-4">
            Something went wrong
          </div>
          <h1 className="text-text-primary font-black text-[clamp(1.75rem,4vw,3rem)] leading-[0.95] tracking-tight mb-4">
            This view could not load.
          </h1>
          <p className="text-text-secondary text-[13px] leading-relaxed mb-8">
            The rest of the site is still working. Use the nav to head
            somewhere else, or refresh to try this page again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 text-text-primary text-[11px] uppercase tracking-[0.3em] font-medium border border-brand-teal/40 hover:border-brand-teal px-6 py-3 rounded-[3px] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
}
