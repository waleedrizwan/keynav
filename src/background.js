chrome.runtime.onMessage.addListener((msg, sender) => {
  const tab = sender.tab;
  if (!tab || tab.id === undefined) return;
  switch (msg.type) {
    case 'open':
      chrome.tabs.create({
        url: msg.url,
        index: tab.index + 1,
        active: false,
        openerTabId: tab.id,
      });
      break;
    case 'close':
      chrome.tabs.remove(tab.id);
      break;
    case 'newtab':
      chrome.tabs.create({ index: tab.index + 1 });
      break;
    case 'tab': // msg.dir = +1 or -1
      chrome.tabs.query({ windowId: tab.windowId }, (tabs) => {
        tabs.sort((a, b) => a.index - b.index);
        const i = tabs.findIndex((t) => t.id === tab.id);
        const next = tabs[(i + msg.dir + tabs.length) % tabs.length];
        chrome.tabs.update(next.id, { active: true });
      });
      break;
  }
});
