import { AppLayout } from './components/layout/AppLayout'

function App() {
    return (
        <AppLayout>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Placeholder for Bookmark Grid */}
                <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                    <h3 className="font-semibold">Example Bookmark</h3>
                    <p className="text-sm text-muted-foreground">example.com</p>
                </div>
            </div>
        </AppLayout>
    )
}

export default App
