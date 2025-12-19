export default function Loading() {
    return (
        <div className="flex flex-col min-w-0 h-dvh bg-background">
            {/* Progress bar at top of content area */}
            <div className="w-full h-1 overflow-hidden bg-border/50">
                <div
                    className="h-full w-1/3 bg-gradient-to-r from-transparent via-foreground to-transparent rounded-full"
                    style={{
                        animation: 'loading-slide 1.2s ease-in-out infinite',
                    }}
                />
            </div>

            {/* Empty content area */}
            <div className="flex-1" />
        </div>
    );
}
