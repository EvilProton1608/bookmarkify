import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Settings = {
    aiEnabled: boolean;
    categories: string[];
    brandColorMap: Record<string, string> | null;
};

export function SettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [newCategory, setNewCategory] = useState('');
    const [brandDomain, setBrandDomain] = useState('');
    const [brandColor, setBrandColor] = useState('');

    useEffect(() => {
        api.get('/settings').then((res) => setSettings(res.data));
    }, []);

    const updateSettings = async (updates: Partial<Settings>) => {
        if (!settings) return;
        const next = { ...settings, ...updates };
        setSettings(next);
        await api.put('/settings', updates);
    };

    if (!settings) {
        return <div className="p-6">Loading settings…</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Settings</h1>

            <Card>
                <CardHeader>
                    <CardTitle>AI Auto‑Categorization</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Automatically categorize and tag bookmarks using Gemini.
                    </div>
                    <input
                        type="checkbox"
                        checked={settings.aiEnabled}
                        onChange={(e) => updateSettings({ aiEnabled: e.target.checked })}
                        className="h-4 w-4 accent-primary"
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Add category"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <Button
                            onClick={() => {
                                const name = newCategory.trim();
                                if (!name) return;
                                const next = Array.from(new Set([...settings.categories, name]));
                                setNewCategory('');
                                updateSettings({ categories: next });
                            }}
                        >
                            Add
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {settings.categories.map((c) => (
                            <Button
                                key={c}
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                    updateSettings({
                                        categories: settings.categories.filter((x) => x !== c),
                                    })
                                }
                            >
                                {c} ✕
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Brand Colors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-2">
                        <Input
                            placeholder="domain.com"
                            value={brandDomain}
                            onChange={(e) => setBrandDomain(e.target.value)}
                        />
                        <Input
                            placeholder="#RRGGBB"
                            value={brandColor}
                            onChange={(e) => setBrandColor(e.target.value)}
                        />
                        <Button
                            onClick={() => {
                                const domain = brandDomain.trim();
                                const color = brandColor.trim();
                                if (!domain || !color) return;
                                const next = {
                                    ...(settings.brandColorMap || {}),
                                    [domain]: color,
                                };
                                setBrandDomain('');
                                setBrandColor('');
                                updateSettings({ brandColorMap: next });
                            }}
                        >
                            Add
                        </Button>
                    </div>
                    <div className="space-y-2">
                {Object.entries(settings.brandColorMap || {}).map(([domain, color]) => (
                    <div key={domain} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full" style={{ background: color }} />
                        <span className="flex-1">{domain}</span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        const next = { ...(settings.brandColorMap || {}) };
                                        delete next[domain];
                                        updateSettings({ brandColorMap: next });
                                    }}
                                >
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
