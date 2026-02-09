const ALLOWED_ORIGINS = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);

type IncomingMessage =
    | { type: 'BOOKMARKIFY_PING' }
    | { type: 'BOOKMARKIFY_STATUS_REQUEST' }
    | { type: 'BOOKMARKIFY_CONNECT'; accessToken?: string; refreshToken?: string }
    | { type: 'BOOKMARKIFY_DISCONNECT' };

function isAllowed(origin: string) {
    return ALLOWED_ORIGINS.has(origin);
}

function reply(origin: string, payload: any) {
    window.postMessage(payload, origin);
}

async function getConnected(): Promise<boolean> {
    return new Promise((resolve) => {
        chrome.storage.local.get(['accessToken', 'refreshToken'], (result) => {
            resolve(!!result.accessToken && !!result.refreshToken);
        });
    });
}

window.addEventListener('message', async (event: MessageEvent) => {
    if (!isAllowed(event.origin)) return;
    const data = event.data as IncomingMessage | undefined;
    if (!data?.type) return;

    if (data.type === 'BOOKMARKIFY_PING') {
        reply(event.origin, { type: 'BOOKMARKIFY_PONG' });
        return;
    }

    if (data.type === 'BOOKMARKIFY_STATUS_REQUEST') {
        const connected = await getConnected();
        reply(event.origin, { type: 'BOOKMARKIFY_STATUS', connected });
        return;
    }

    if (data.type === 'BOOKMARKIFY_DISCONNECT') {
        chrome.storage.local.remove(['accessToken', 'refreshToken'], () => {
            reply(event.origin, { type: 'BOOKMARKIFY_DISCONNECT_ACK', ok: true });
        });
        return;
    }

    if (data.type === 'BOOKMARKIFY_CONNECT') {
        const { accessToken, refreshToken } = data;
        if (!accessToken || !refreshToken) {
            reply(event.origin, {
                type: 'BOOKMARKIFY_CONNECT_ACK',
                ok: false,
                reason: 'Missing tokens',
            });
            return;
        }

        chrome.storage.local.set({ accessToken, refreshToken }, () => {
            reply(event.origin, { type: 'BOOKMARKIFY_CONNECT_ACK', ok: true });
        });
        return;
    }
});
