const DEFAULTS = { enabled: true, autoSkip: false, minVideos: 1, compact: false };
const byId = (id) => document.getElementById(id);

chrome.storage.local.get(DEFAULTS, (settings) => {
  byId("enabled").checked = settings.enabled;
  byId("autoSkip").checked = settings.autoSkip;
  byId("minVideos").value = settings.minVideos;
  byId("compact").checked = settings.compact;
});

byId("save").addEventListener("click", async () => {
  const settings = {
    enabled: byId("enabled").checked,
    autoSkip: byId("autoSkip").checked,
    minVideos: Math.max(0, Math.min(4, Number(byId("minVideos").value) || 0)),
    compact: byId("compact").checked
  };
  await chrome.storage.local.set(settings);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "omeconnector-settings", settings }).catch(() => {});
  byId("message").textContent = "Ustawienia zapisane";
});
