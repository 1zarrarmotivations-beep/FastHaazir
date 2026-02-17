import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-100 p-4 font-sans text-neutral-800">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center border border-neutral-200">
                        <h1 className="text-3xl font-bold mb-4 text-red-600">Something went wrong.</h1>
                        <p className="mb-6 text-neutral-600">
                            We apologize for the inconvenience. An unexpected error has occurred.
                            Our team has been notified.
                        </p>
                        <div className="bg-neutral-50 p-4 rounded text-left mb-6 overflow-auto max-h-40 text-xs font-mono border border-neutral-200">
                            {this.state.error?.toString()}
                        </div>

                        <div className="flex gap-4 justify-center">
                            <Button
                                onClick={() => window.location.reload()}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Refresh Page
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => window.location.href = '/'}
                            >
                                Go to Home
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
