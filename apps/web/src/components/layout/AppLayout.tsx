import React from 'react';

// This is the shell of your application
export function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen w-full bg-background text-foreground">
            {/* Sidebar Area */}
            <aside className="w-64 border-r border-border p-4">
                <h1 className="text-xl font-bold">Bookmarkify</h1>
                <nav className="mt-8">
                    {/* Navigation Links will go here */}
                    <div className="p-2 bg-secondary/50 rounded">All Bookmarks</div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden flex flex-col">
                <header className="h-14 border-b border-border flex items-center px-6">
                    {/* Top Bar / Search */}
                    <div className="text-sm text-muted-foreground">Search implementation pending...</div>
                </header>

                <div className="flex-1 overflow-auto p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
