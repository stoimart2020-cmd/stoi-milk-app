import React from "react";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("ErrorBoundary caught an error", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="p-6 bg-red-50 border border-red-200 rounded-lg m-4">
                    <h2 className="text-lg font-semibold text-red-700 mb-2">
                        Something went wrong.
                    </h2>
                    <p className="text-red-600 mb-4">
                        {this.state.error?.message || "An unexpected error occurred."}
                    </p>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null, errorInfo: null });
                            window.location.reload();
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        Reload Page
                    </button>
                    {process.env.NODE_ENV === "development" && this.state.errorInfo && (
                        <details className="mt-4 p-4 bg-white rounded border border-red-100 overflow-auto max-h-64">
                            <summary className="cursor-pointer text-red-500 font-medium">
                                Error Details
                            </summary>
                            <pre className="mt-2 text-xs text-gray-600">
                                {this.state.error && this.state.error.toString()}
                                <br />
                                {this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
