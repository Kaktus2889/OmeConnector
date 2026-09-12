const DEFAULTS = {
  enabled: true,
  autoSkip: false,
  skipNoCamera: true,
  minVideos: 1,
  compact: false,
  position: null,
  autoSkips: 0
};

const byId = (id) => document.getElementById(id);

const showUpdate = (data) => {
  const status = byId("updateStatus");
  const link = byId("downloadUpdate");
  if (data?.version) {
    status.textContent = "Dostępna wersja " + data.version;
    link.href = data.url;
    link.hidden = false;
  } else {
    status.textContent = "Masz najnowszą wersję";
    link.hidden = true;
  }
};

const loadUpdate = () => new Promise((resolve) => {
  chrome.storage.local.get(["updateAvailable", "updateCheckedAt"], (data) => {
    showUpdate(data.updateAvailable);
    resolve(data);
  });
});

chrome.storage.local.get(DEFAULTS, (settings) => {
  byId("enabled").checked = settings.enabled;
  byId("autoSkip").checked = settings.autoSkip;
  byId("skipNoCamera").checked = settings.skipNoCamera;
  byId("minVideos").value = settings.minVideos;
  byId("compact").checked = settings.compact;
  loadUpdate();
});

const activeTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
};

byId("save").addEventListener("click", async () => {
  const settings = {
    enabled: byId("enabled").checked,
    autoSkip: byId("autoSkip").checked,
    skipNoCamera: byId("skipNoCamera").checked,
    minVideos: Math.max(0, Math.min(4, Number(byId("minVideos").value) || 0)),
    compact: byId("compact").checked
  };
  await chrome.storage.local.set(settings);
  const tab = await activeTab();
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "omeconnector-settings", settings }).catch(() => {});
  byId("message").textContent = "Ustawienia zapisane";
});

byId("resetPosition").addEventListener("click", async () => {
  await chrome.storage.local.set({ position: null });
  const tab = await activeTab();
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "omeconnector-reset-position" }).catch(() => {});
  byId("message").textContent = "Pozycja zresetowana";
});

byId("checkUpdate").addEventListener("click", () => {
  byId("updateStatus").textContent = "Sprawdzanie…";
  chrome.runtime.sendMessage({ type: "omeconnector-check-update" }, (data) => {
    if (chrome.runtime.lastError) {
      byId("updateStatus").textContent = "Nie udało się sprawdzić";
      return;
    }
    showUpdate(data?.updateAvailable);
  });
});
