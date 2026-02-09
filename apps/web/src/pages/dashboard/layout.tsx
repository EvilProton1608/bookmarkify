import { Sidebar } from '@/components/sidebar/sidebar';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { LogOut, Sun, Moon } from 'lucide-react';

export function DashboardLayout() {
    const { user, logout } = useAuthStore();
    const { toggleTheme, isDark } = useTheme();
    const [connectStatus, setConnectStatus] = useState<'checking' | 'not_detected' | 'not_connected' | 'connecting' | 'connected' | 'error'>('checking');
    const [connectMessage, setConnectMessage] = useState('Checking extension…');
    const [connectModalOpen, setConnectModalOpen] = useState(false);

    const checkExtension = async () => {
        setConnectStatus('checking');
        setConnectMessage('Checking extension…');

        // 1) Detect extension via ping/pong
        const detected = await new Promise<boolean>((resolve) => {
            let done = false;
            const onPong = (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;
                if (event.data?.type !== 'BOOKMARKIFY_PONG') return;
                if (done) return;
                done = true;
                window.removeEventListener('message', onPong);
                resolve(true);
            };
            window.addEventListener('message', onPong);
            window.postMessage({ type: 'BOOKMARKIFY_PING' }, window.location.origin);
            setTimeout(() => {
                if (done) return;
                done = true;
                window.removeEventListener('message', onPong);
                resolve(false);
            }, 500);
        });

        if (!detected) {
            setConnectStatus('not_detected');
            setConnectMessage('Extension not detected.');
            return;
        }

        // 2) Ask status
        const connected = await new Promise<boolean>((resolve) => {
            let done = false;
            const onStatus = (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;
                if (event.data?.type !== 'BOOKMARKIFY_STATUS') return;
                if (done) return;
                done = true;
                window.removeEventListener('message', onStatus);
                resolve(!!event.data?.connected);
            };
            window.addEventListener('message', onStatus);
            window.postMessage({ type: 'BOOKMARKIFY_STATUS_REQUEST' }, window.location.origin);
            setTimeout(() => {
                if (done) return;
                done = true;
                window.removeEventListener('message', onStatus);
                resolve(false);
            }, 500);
        });

        if (connected) {
            setConnectStatus('connected');
            setConnectMessage('Extension connected.');
        } else {
            setConnectStatus('not_connected');
            setConnectMessage('Extension detected. Not connected.');
        }
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <header className="h-14 border-b px-6 flex items-center justify-between bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="font-semibold text-lg">Bookmarkify</div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2">
                            <Dialog
                                open={connectModalOpen}
                                onOpenChange={(open) => {
                                    setConnectModalOpen(open);
                                    if (open) {
                                        checkExtension();
                                    }
                                }}
                            >
                                <DialogTrigger asChild>
                                    <Button
                                        variant={connectStatus === 'connected' ? 'default' : 'outline'}
                                        size="sm"
                                        className={connectStatus === 'connected' ? 'bg-green-600 hover:bg-green-600' : undefined}
                                    >
                                        {connectStatus === 'checking' ? 'Checking…' :
                                            connectStatus === 'not_detected' ? 'Extension not detected' :
                                                connectStatus === 'not_connected' ? 'Connect extension' :
                                                    connectStatus === 'connecting' ? 'Connecting…' :
                                                        connectStatus === 'connected' ? 'Extension connected' :
                                                            'Connect extension'}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Browser Extension</DialogTitle>
                                        <DialogDescription>{connectMessage}</DialogDescription>
                                    </DialogHeader>

                                    {connectStatus === 'not_detected' && (
                                        <div className="text-sm space-y-2">
                                            <div>Install the extension (dev):</div>
                                            <div className="font-mono text-xs bg-muted/40 p-2 rounded">
                                                chrome://extensions → Developer mode → Load unpacked → {`/Users/swapnilnegi/bookmarkify/apps/extension/dist`}
                                            </div>
                                            <Button variant="outline" size="sm" onClick={checkExtension}>
                                                I installed it, recheck
                                            </Button>
                                        </div>
                                    )}

                                    {connectStatus === 'not_connected' && (
                                        <div className="text-sm space-y-3">
                                            <div>Click connect to link this browser extension to your account.</div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => {
                                                        const accessToken = localStorage.getItem('accessToken');
                                                        const refreshToken = localStorage.getItem('refreshToken');
                                                        if (!accessToken || !refreshToken) {
                                                            setConnectStatus('error');
                                                            setConnectMessage('Please log in first.');
                                                            return;
                                                        }
                                                        setConnectStatus('connecting');
                                                        setConnectMessage('Connecting…');

                                                        let acknowledged = false;
                                                        const onAck = (event: MessageEvent) => {
                                                            if (event.origin !== window.location.origin) return;
                                                            if (event.data?.type !== 'BOOKMARKIFY_CONNECT_ACK') return;
                                                            acknowledged = true;
                                                            window.removeEventListener('message', onAck);
                                                            if (event.data?.ok) {
                                                                setConnectStatus('connected');
                                                                setConnectMessage('Extension connected.');
                                                            } else {
                                                                setConnectStatus('error');
                                                                setConnectMessage(event.data?.reason || 'Failed to connect.');
                                                            }
                                                        };
                                                        window.addEventListener('message', onAck);
                                                        window.postMessage(
                                                            { type: 'BOOKMARKIFY_CONNECT', accessToken, refreshToken },
                                                            window.location.origin
                                                        );
                                                        setTimeout(() => {
                                                            if (!acknowledged) {
                                                                setConnectStatus('error');
                                                                setConnectMessage('No response from extension. Is it enabled?');
                                                                window.removeEventListener('message', onAck);
                                                            }
                                                        }, 800);
                                                    }}
                                                    disabled={false}
                                                >
                                                    Connect
                                                </Button>
                                                <Button variant="outline" onClick={checkExtension}>
                                                    Refresh
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {connectStatus === 'connected' && (
                                        <div className="text-sm space-y-2">
                                            <div className="text-green-700 font-medium">Connection completed.</div>
                                            <div>You can now use Save/Import from the extension popup.</div>
                                        </div>
                                    )}

                                    {connectStatus === 'error' && (
                                        <div className="text-sm text-red-600">
                                            {connectMessage}
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {user?.name}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            aria-label="Toggle dark mode"
                            className="focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {isDark ? (
                                <Sun className="h-4 w-4" />
                            ) : (
                                <Moon className="h-4 w-4" />
                            )}
                        </Button>
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
    );
}
