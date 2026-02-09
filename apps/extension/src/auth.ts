export type Tokens = {
    accessToken: string;
    refreshToken: string;
};

export const STORAGE_KEYS = {
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
};

export async function getTokens(): Promise<Tokens | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.accessToken, STORAGE_KEYS.refreshToken], (result) => {
            const accessToken = result[STORAGE_KEYS.accessToken];
            const refreshToken = result[STORAGE_KEYS.refreshToken];
            if (accessToken && refreshToken) {
                resolve({ accessToken, refreshToken });
            } else {
                resolve(null);
            }
        });
    });
}

export async function setTokens(tokens: Tokens): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.set(
            {
                [STORAGE_KEYS.accessToken]: tokens.accessToken,
                [STORAGE_KEYS.refreshToken]: tokens.refreshToken,
            },
            () => resolve()
        );
    });
}

export async function clearTokens(): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.remove([STORAGE_KEYS.accessToken, STORAGE_KEYS.refreshToken], () => resolve());
    });
}
