(() => {
  "use strict";

  const DEFAULTS = { enabled: true, autoSkip: false, minVideos: 1, compact: false };
  let settings = { ...DEFAULTS };
  let overlay;
  let skipCooldown = 0;
  let sessionStarted = Date.now();

  const loadSettings = () => new Promise((resolve) => {
    chrome.storage.local.get(DEFAULTS, (data) => resolve({ ...DEFAULTS, ...data }));
  });

  const visible = (el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" &&
      rect.width > 0 && rect.height > 0;
  };

  const videos = () => [...document.querySelectorAll("video")].filter((video) =>
    visible(video) && video.readyState >= 2 && video.videoWidth > 0 &&
    video.videoHeight > 0 && !video.paused
  );

  const skipButton = () => [...document.querySelectorAll("button,[role='button']")]
    .find((button) => {
      if (!visible(button) || button.disabled) return false;
      const label = (button.innerText || button.getAttribute("aria-label") || "").toLowerCase();
      return ["skip", "next", "pomiń", "następny"].some((word) => label.includes(word));
    });

  const status = (text, tone) => {
    const el = overlay?.querySelector("[data-status]");
    if (el) {
      el.textContent = text;
      el.dataset.tone = tone || "normal";
    }
  };

  const render = () => {
    if (!overlay) return;
    overlay.hidden = !settings.enabled;
    overlay.classList.toggle("oc-compact", settings.compact);

    const active = videos();
    const main = active[0];
    overlay.querySelector("[data-cameras]").textContent = String(active.length);
    overlay.querySelector("[data-quality]").textContent = main
      ? main.videoWidth + "×" + main.videoHeight
      : "oczekiwanie";
    overlay.querySelector("[data-mode]").textContent =
      settings.autoSkip ? "Auto Skip: ON" : "Auto Skip: OFF";

    status(active.length ? "Połączenie aktywne" : "Oczekiwanie na obraz",
      active.length ? "good" : "waiting");

    if (settings.autoSkip && Date.now() > skipCooldown &&
        Date.now() - sessionStarted > 8000 &&
        active.length < Number(settings.minVideos)) {
      const button = skipButton();
      if (button) {
        skipCooldown = Date.now() + 5000;
        button.click();
        status("Auto Skip wykonany", "good");
      }
    }
  };

  const createOverlay = () => {
    if (document.getElementById("omeconnector-overlay")) return;
    overlay = document.createElement("section");
    overlay.id = "omeconnector-overlay";
    overlay.innerHTML = [
      "<div class='oc-header'><strong>OmeConnector</strong><button class='oc-close' aria-label='Ukryj panel'>×</button></div>",
      "<div class='oc-status' data-status data-tone='normal'>Uruchamianie…</div>",
      "<div class='oc-grid'>",
      "<div class='oc-card'><span>Aktywne kamery</span><b data-cameras>0</b></div>",
      "<div class='oc-card'><span>Rozdzielczość</span><b data-quality>—</b></div>",
      "<div class='oc-card'><span>Tryb</span><b data-mode>Auto Skip: OFF</b></div>",
      "<div class='oc-card oc-location'><span>Lokalizacja</span><b>Backend jeszcze niepodłączony</b></div>",
      "</div>",
      "<small>Działa tylko na ome.tv · ustawienia lokalne</small>"
    ].join("");
    document.documentElement.appendChild(overlay);
    overlay.querySelector(".oc-close").onclick = () => {
      settings.enabled = false;
      chrome.storage.local.set({ enabled: false });
      render();
    };
  };

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "omeconnector-settings") {
      settings = { ...settings, ...message.settings };
      render();
    }
  });

  (async () => {
    settings = await loadSettings();
    createOverlay();
    render();
    setInterval(render, 1000);
    new MutationObserver(() => {
      if (!document.getElementById("omeconnector-overlay")) createOverlay();
    }).observe(document.documentElement, { childList: true, subtree: true });
  })();
})();
