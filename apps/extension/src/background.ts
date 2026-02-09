import { createBookmark } from './api';

console.log('Bookmarkify background script running');

chrome.runtime.onInstalled.addListener(() => {
    console.log('Bookmarkify Extension Installed');
});

chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'save-current-page') return;
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url || !tab.title) return;
        await createBookmark({
            url: tab.url,
            title: tab.title,
        });
    } catch (err) {
        console.error('Failed to save via shortcut', err);
    }
});
