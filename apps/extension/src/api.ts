import { clearTokens, getTokens, setTokens, Tokens } from './auth';

const API_BASE = 'http://localhost:3000';

async function refreshAccessToken(refreshToken: string): Promise<Tokens> {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
        throw new Error('REFRESH_FAILED');
    }
    const data = await res.json();
    return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

async function apiRequest(path: string, options: RequestInit = {}, retry = true): Promise<any> {
    const tokens = await getTokens();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
    };
    if (tokens?.accessToken) {
        headers.Authorization = `Bearer ${tokens.accessToken}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401 && retry && tokens?.refreshToken) {
        try {
            const newTokens = await refreshAccessToken(tokens.refreshToken);
            await setTokens(newTokens);
            return apiRequest(path, options, false);
        } catch {
            await clearTokens();
            throw new Error('Session expired. Reconnect from the web app.');
        }
    }

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return res.json();
    }
    return res.text();
}

export async function listFolders(): Promise<any[]> {
    const data = await apiRequest('/folders');
    return data || [];
}

export async function listTags(): Promise<any[]> {
    const data = await apiRequest('/tags');
    return data || [];
}

export async function listBookmarks(params: Record<string, any>): Promise<any> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        query.set(key, String(value));
    });
    const path = query.toString() ? `/bookmarks?${query.toString()}` : '/bookmarks';
    return apiRequest(path);
}

export async function createBookmark(payload: {
    url: string;
    title: string;
    tags?: string[];
    folderId?: string | null;
}): Promise<any> {
    return apiRequest('/bookmarks', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
