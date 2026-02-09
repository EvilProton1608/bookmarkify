import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { clearTokens, getTokens } from './auth';
import { createBookmark, listBookmarks, listFolders, listTags } from './api';

type Folder = {
    id: string;
    name: string;
    color?: string;
};

type Status = { type: 'idle' | 'success' | 'error'; message?: string };
type Tab = 'all' | 'tags' | 'favorites' | 'collections';

const Popup = () => {
    const [isAuthed, setIsAuthed] = useState(false);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [tagsList, setTagsList] = useState<any[]>([]);
    const [folderId, setFolderId] = useState<string>('');
    const [tags, setTags] = useState('');
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ total: 0, done: 0, skipped: 0, failed: 0 });
    const [status, setStatus] = useState<Status>({ type: 'idle' });
    const [tab, setTab] = useState<Tab>('all');
    const [search, setSearch] = useState('');
    const [bookmarks, setBookmarks] = useState<any[]>([]);
    const [selectedTag, setSelectedTag] = useState<string>('');
    const [selectedFolder, setSelectedFolder] = useState<string>('');

    useEffect(() => {
        getTokens().then((tokens) => {
            setIsAuthed(!!tokens);
            if (tokens) {
                listFolders()
                    .then((data) => setFolders(data))
                    .catch(() => setFolders([]));
                listTags()
                    .then((data) => setTagsList(data))
                    .catch(() => setTagsList([]));
            }
        });
    }, []);

    useEffect(() => {
        if (!isAuthed) return;
        const params: any = { page: 1, limit: 100 };
        if (search) params.search = search;
        if (tab === 'favorites') params.isFavorite = true;
        if (tab === 'collections' && selectedFolder) params.folderId = selectedFolder;
        if (tab === 'tags' && selectedTag) params.tags = selectedTag;
        listBookmarks(params)
            .then((data) => setBookmarks(data?.data || []))
            .catch(() => setBookmarks([]));
    }, [isAuthed, tab, search, selectedFolder, selectedTag]);

    const handleSave = async () => {
        setSaving(true);
        setStatus({ type: 'idle' });
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const activeTab = tabs[0];
            if (!activeTab?.url || !activeTab.title) {
                throw new Error('No active tab found.');
            }

            const tagList = tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);

            const created = await createBookmark({
                url: activeTab.url,
                title: activeTab.title,
                tags: tagList.length > 0 ? tagList : undefined,
                folderId: folderId || undefined,
            });

            if (created?.suggestedFolderName) {
                setStatus({ type: 'success', message: `Suggestion: create "${created.suggestedFolderName}" collection.` });
            } else {
                setStatus({ type: 'success', message: 'Saved!' });
            }
        } catch (error: any) {
            const msg = error?.message || 'Failed to save.';
            if (msg.includes('Session expired')) {
                setIsAuthed(false);
            }
            setStatus({ type: 'error', message: msg });
        } finally {
            setSaving(false);
        }
    };

    const flattenBookmarks = (nodes: chrome.bookmarks.BookmarkTreeNode[]): chrome.bookmarks.BookmarkTreeNode[] => {
        const result: chrome.bookmarks.BookmarkTreeNode[] = [];
        const stack = [...nodes];
        while (stack.length) {
            const node = stack.pop();
            if (!node) continue;
            if (node.url) {
                result.push(node);
            }
            if (node.children) {
                stack.push(...node.children);
            }
        }
        return result;
    };

    const handleImport = async () => {
        setImporting(true);
        setStatus({ type: 'idle' });
        try {
            const tree = await chrome.bookmarks.getTree();
            const bookmarks = flattenBookmarks(tree);
            setImportProgress({ total: bookmarks.length, done: 0, skipped: 0, failed: 0 });

            let done = 0;
            let skipped = 0;
            let failed = 0;

            for (const bm of bookmarks) {
                try {
                    await createBookmark({
                        url: bm.url || '',
                        title: bm.title || bm.url || 'Untitled',
                    });
                    done += 1;
                } catch (err: any) {
                    const msg = String(err?.message || '');
                    if (msg.includes('already exists') || msg.includes('409')) {
                        skipped += 1;
                    } else {
                        failed += 1;
                    }
                }
                setImportProgress({ total: bookmarks.length, done, skipped, failed });
            }

            setStatus({ type: 'success', message: 'Import complete.' });
        } catch (error: any) {
            const msg = error?.message || 'Import failed.';
            if (msg.includes('Session expired')) {
                setIsAuthed(false);
            }
            setStatus({ type: 'error', message: msg });
        } finally {
            setImporting(false);
        }
    };

    const handleLogout = async () => {
        await clearTokens();
        setIsAuthed(false);
        setFolders([]);
        setFolderId('');
        setTags('');
        setStatus({ type: 'idle' });
    };

    return (
        <div className="glass-root p-3 w-80">
            <div className="glass-card p-4 space-y-4 relative">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Bookmarkify</div>
                    <h1 className="text-lg font-semibold text-slate-900">Quick Save</h1>
                </div>
                {isAuthed && (
                    <button
                        className="text-xs text-slate-500 hover:text-slate-700"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                )}
            </div>

            {!isAuthed ? (
                <div className="space-y-2">
                    <p className="text-sm text-slate-600">
                        Not connected. Connect from the Bookmarkify web app header.
                    </p>
                    <div className="text-xs text-slate-500">
                        After connecting, reopen this popup.
                    </div>
                    <button
                        className="w-full glass-button-outline px-3 py-2 rounded text-sm"
                        onClick={() => {
                            // Re-check tokens without requiring an extension reload.
                            getTokens().then((tokens) => {
                                setIsAuthed(!!tokens);
                                if (tokens) {
                                    listFolders()
                                        .then((data) => setFolders(data))
                                        .catch(() => setFolders([]));
                                }
                            });
                        }}
                    >
                        Refresh status
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <button
                        className="w-full glass-success px-3 py-2 rounded text-sm cursor-default"
                        disabled
                    >
                        Connection completed
                    </button>

                    <div className="flex gap-2 text-xs">
                        {(['all', 'tags', 'favorites', 'collections'] as Tab[]).map((t) => (
                            <button
                                key={t}
                                className={`px-2 py-1 rounded ${
                                    tab === t ? 'bg-slate-900 text-white' : 'bg-white/60 text-slate-700'
                                }`}
                                onClick={() => {
                                    setTab(t);
                                    setSelectedFolder('');
                                    setSelectedTag('');
                                }}
                            >
                                {t === 'all' ? 'All' : t === 'tags' ? 'Tags' : t === 'favorites' ? 'Stars' : 'Collections'}
                            </button>
                        ))}
                    </div>

                    <input
                        className="w-full glass-input rounded px-2 py-1 text-sm"
                        placeholder="Filter..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    {tab === 'collections' && (
                        <div className="flex flex-wrap gap-2">
                            {folders.map((f) => (
                                <button
                                    key={f.id}
                                    className={`px-2 py-1 rounded text-xs ${
                                        selectedFolder === f.id ? 'bg-slate-900 text-white' : 'bg-white/60 text-slate-700'
                                    }`}
                                    onClick={() => setSelectedFolder(f.id)}
                                >
                                    {f.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {tab === 'tags' && (
                        <div className="flex flex-wrap gap-2">
                            {tagsList.map((t) => (
                                <button
                                    key={t.id}
                                    className={`px-2 py-1 rounded text-xs ${
                                        selectedTag === t.name ? 'bg-slate-900 text-white' : 'bg-white/60 text-slate-700'
                                    }`}
                                    onClick={() => setSelectedTag(t.name)}
                                >
                                    #{t.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs text-slate-600">Folder</label>
                        <select
                            className="w-full glass-input rounded px-2 py-1 text-sm"
                            value={folderId}
                            onChange={(e) => setFolderId(e.target.value)}
                        >
                            <option value="">No folder</option>
                            {folders.map((folder) => (
                                <option key={folder.id} value={folder.id}>
                                    {folder.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-slate-600">Tags (comma separated)</label>
                        <input
                            className="w-full glass-input rounded px-2 py-1 text-sm"
                            placeholder="productivity, ai, work"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                        />
                    </div>

                    <button
                        className="w-full glass-button px-3 py-2 rounded text-sm disabled:opacity-60"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : 'Save Current Page'}
                    </button>

                    <button
                        className="w-full glass-button-outline px-3 py-2 rounded text-sm disabled:opacity-60"
                        onClick={handleImport}
                        disabled={importing}
                    >
                        {importing ? 'Importing…' : 'Import Chrome Bookmarks'}
                    </button>

                    {importing && (
                        <div className="text-xs text-slate-600">
                            {importProgress.done}/{importProgress.total} imported
                            {importProgress.skipped > 0 && ` • ${importProgress.skipped} skipped`}
                            {importProgress.failed > 0 && ` • ${importProgress.failed} failed`}
                        </div>
                    )}

                    <div className="max-h-64 overflow-y-auto space-y-2 pt-2">
                        {bookmarks.map((b) => (
                            <div key={b.id} className="flex items-start gap-2 text-sm">
                                <div className="w-6 h-6 rounded bg-white/70 flex items-center justify-center text-xs">
                                    {b.domain?.[0]?.toUpperCase() || 'B'}
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate text-slate-900">{b.title}</div>
                                    <div className="text-xs text-slate-500 truncate">{b.domain}</div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {b.tags?.slice(0, 3).map((t: any) => (
                                            <span
                                                key={t.id}
                                                className="text-[10px] px-1.5 py-0.5 rounded bg-white/70"
                                                style={{ color: t.color || undefined }}
                                            >
                                                #{t.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {status.type !== 'idle' && (
                <div
                    className={`text-xs rounded px-2 py-1 ${
                        status.type === 'success'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                    }`}
                >
                    {status.message}
                </div>
            )}
            </div>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <Popup />
    </React.StrictMode>
);
