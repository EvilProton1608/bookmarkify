console.log('Bookmarkify background script running');

chrome.runtime.onInstalled.addListener(() => {
    console.log('Bookmarkify Extension Installed');
});
