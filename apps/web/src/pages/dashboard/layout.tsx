import { Sidebar } from '@/components/sidebar/sidebar';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import {
    DndContext,
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
    KeyboardSensor
} from '@dnd-kit/core';
import { useUpdateBookmark } from '@/hooks/use-data';
import { toast } from 'sonner';

export function DashboardLayout() {
    const { user, logout } = useAuthStore();
    const { mutate: updateBookmark } = useUpdateBookmark();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor)
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const bookmarkId = active.id as string;
            const folderId = (over.id as string).replace('folder-', '');

            updateBookmark(
                { id: bookmarkId, folderId },
                {
                    onSuccess: () => toast.success('Moved to collection'),
                    onError: () => toast.error('Failed to move bookmark'),
                }
            );
        }
    };

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex min-h-screen bg-background text-foreground">
                <Sidebar />
                <div className="flex-1 flex flex-col">
                    <header className="h-14 border-b px-6 flex items-center justify-between bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <div className="font-semibold text-lg">Bookmarkify</div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                                {user?.name}
                            </span>
                            <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    </header>
                    <main className="flex-1 p-6 overflow-y-auto">
                        <Outlet />
                    </main>
                </div>
            </div>
        </DndContext>
    );
}
