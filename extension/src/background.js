(() => {
  "use strict";

  const CURRENT = chrome.runtime.getManifest().version;
  const UPDATE_URL = "https://raw.githubusercontent.com/Kaktus2889/OmeConnector/main/extension/update.json";

  const compareVersions = (left, right) => {
    const a = String(left).split(".").map(Number);
    const b = String(right).split(".").map(Number);
    for (let i = 0; i < 3; i += 1) {
      if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0);
    }
    return 0;
  };

  const setBadge = (available) => {
    chrome.action.setBadgeText({ text: available ? "NEW" : "" });
    if (available) chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
  };

  const checkForUpdate = async () => {
    try {
      const response = await fetch(UPDATE_URL + "?t=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const remote = await response.json();
      const available = compareVersions(remote.version, CURRENT) > 0;
      await chrome.storage.local.set({
        updateAvailable: available ? remote : null,
        updateCheckedAt: Date.now()
      });
      setBadge(available);
      return available;
    } catch (error) {
      await chrome.storage.local.set({ updateCheckedAt: Date.now() });
      return false;
    }
  };

  chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("omeconnector-update-check", { periodInMinutes: 60 });
    checkForUpdate();
  });

  chrome.runtime.onStartup.addListener(() => {
    chrome.alarms.create("omeconnector-update-check", { periodInMinutes: 60 });
    checkForUpdate();
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "omeconnector-update-check") checkForUpdate();
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "omeconnector-check-update") return;
    checkForUpdate().then(() => {
      chrome.storage.local.get(["updateAvailable", "updateCheckedAt"], (data) => {
        sendResponse(data);
      });
    });
    return true;
  });
})();
