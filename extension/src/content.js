(() => {
  "use strict";

  const DEFAULTS = {
    enabled: true, autoSkip: false, skipNoCamera: true, minVideos: 1,
    compact: false, position: null, autoSkips: 0
  };

  let settings = { ...DEFAULTS };
  let overlay;
  let skipCooldown = 0;
  let sessionStarted = Date.now();
  let dragState = null;

  const loadSettings = () => new Promise((resolve) => {
    chrome.storage.local.get(DEFAULTS, (data) => resolve({ ...DEFAULTS, ...data }));
  });

  const visible = (el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" &&
      rect.width > 0 && rect.height > 0;
  };

  const streams = () => [...document.querySelectorAll("video")].filter((video) =>
    visible(video) && video.readyState >= 2 && video.videoWidth > 0 &&
    video.videoHeight > 0 && !video.paused
  );

  const audioTracks = (list) => list.reduce((total, video) =>
    total + (video.srcObject?.getAudioTracks?.().length || 0), 0);

  const findSkipButton = () => [...document.querySelectorAll("button,[role='button']")]
    .find((button) => {
      if (!visible(button) || button.disabled) return false;
      const label = (button.innerText || button.getAttribute("aria-label") || "").toLowerCase();
      return ["skip", "next", "pomiń", "następny"].some((word) => label.includes(word));
    });

  const setStatus = (text, tone = "normal") => {
    const el = overlay?.querySelector("[data-status]");
    if (el) { el.textContent = text; el.dataset.tone = tone; }
  };

  const doSkip = (automatic = false) => {
    const button = findSkipButton();
    if (!button) { setStatus("Nie znaleziono przycisku Skip", "waiting"); return false; }
    button.click();
    skipCooldown = Date.now() + 5000;
    if (automatic) {
      settings.autoSkips = Number(settings.autoSkips || 0) + 1;
      chrome.storage.local.set({ autoSkips: settings.autoSkips });
    }
    setStatus(automatic ? "Auto Skip wykonany" : "Pominięto rozmowę", "good");
    return true;
  };

  const applyPosition = () => {
    if (!overlay || !settings.position) return;
    overlay.style.left = settings.position.x + "px";
    overlay.style.top = settings.position.y + "px";
    overlay.style.right = "auto";
  };

  const savePosition = () => {
    const rect = overlay.getBoundingClientRect();
    settings.position = { x: Math.max(0, Math.round(rect.left)), y: Math.max(0, Math.round(rect.top)) };
    chrome.storage.local.set({ position: settings.position });
  };

  const makeDraggable = () => {
    const header = overlay.querySelector(".oc-header");
    header.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      const rect = overlay.getBoundingClientRect();
      dragState = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      header.setPointerCapture(event.pointerId);
    });
    header.addEventListener("pointermove", (event) => {
      if (!dragState) return;
      overlay.style.left = Math.max(0, dragState.left + event.clientX - dragState.x) + "px";
      overlay.style.top = Math.max(0, dragState.top + event.clientY - dragState.y) + "px";
      overlay.style.right = "auto";
    });
    header.addEventListener("pointerup", (event) => {
      if (dragState) savePosition();
      dragState = null;
      header.releasePointerCapture?.(event.pointerId);
    });
  };

  const showUpdate = (update) => {
    if (!overlay || !update) return;
    let notice = overlay.querySelector(".oc-update");
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "oc-update";
      overlay.appendChild(notice);
    }
    notice.innerHTML = "Nowa wersja <b>" + update.version +
      "</b> <a href='" + update.url + "' target='_blank' rel='noopener'>Pobierz</a>";
  };

  const render = () => {
    if (!overlay) return;
    overlay.hidden = !settings.enabled;
    overlay.classList.toggle("oc-compact", settings.compact);

    const active = streams();
    const main = active[0];
    const audio = audioTracks(active);
    const seconds = Math.floor((Date.now() - sessionStarted) / 1000);
    const duration = String(Math.floor(seconds / 60)).padStart(2, "0") + ":" +
      String(seconds % 60).padStart(2, "0");

    overlay.querySelector("[data-cameras]").textContent = String(active.length);
    overlay.querySelector("[data-audio]").textContent = String(audio);
    overlay.querySelector("[data-quality]").textContent =
      main ? main.videoWidth + "×" + main.videoHeight : "oczekiwanie";
    overlay.querySelector("[data-duration]").textContent = duration;
    overlay.querySelector("[data-skips]").textContent = String(settings.autoSkips || 0);
    overlay.querySelector("[data-mode]").textContent =
      settings.autoSkip ? "Auto Skip: ON" : "Auto Skip: OFF";

    setStatus(active.length ? "Połączenie aktywne" : "Oczekiwanie na obraz",
      active.length ? "good" : "waiting");

    const shouldSkip = settings.autoSkip && Date.now() > skipCooldown &&
      Date.now() - sessionStarted > 8000 &&
      ((settings.skipNoCamera && active.length === 0) ||
       active.length < Number(settings.minVideos));
    if (shouldSkip) doSkip(true);
  };

  const createOverlay = () => {
    if (document.getElementById("omeconnector-overlay")) return;
    overlay = document.createElement("section");
    overlay.id = "omeconnector-overlay";
    overlay.innerHTML = [
      "<div class='oc-header'><strong>OmeConnector <small>companion</small></strong><button class='oc-close' aria-label='Ukryj panel'>×</button></div>",
      "<div class='oc-status' data-status data-tone='normal'>Uruchamianie…</div>",
      "<div class='oc-grid'>",
      "<div class='oc-card'><span>Kamery</span><b data-cameras>0</b></div>",
      "<div class='oc-card'><span>Audio</span><b data-audio>0</b></div>",
      "<div class='oc-card'><span>Obraz</span><b data-quality>—</b></div>",
      "<div class='oc-card'><span>Czas sesji</span><b data-duration>00:00</b></div>",
      "<div class='oc-card'><span>Auto Skip</span><b data-skips>0</b></div>",
      "<div class='oc-card'><span>Tryb</span><b data-mode>Auto Skip: OFF</b></div>",
      "<div class='oc-card oc-location'><span>Lokalizacja</span><b>Moduł backendu jeszcze niepodłączony</b></div>",
      "</div>",
      "<div class='oc-actions'><button class='oc-skip' type='button'>Pomiń teraz</button></div>",
      "<small>Przeciągnij nagłówek · Alt+O pokazuje/ukrywa panel</small>"
    ].join("");
    document.documentElement.appendChild(overlay);
    applyPosition();
    makeDraggable();

    overlay.querySelector(".oc-close").onclick = () => {
      settings.enabled = false;
      chrome.storage.local.set({ enabled: false });
      render();
    };
    overlay.querySelector(".oc-skip").onclick = () => doSkip(false);
  };

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "omeconnector-settings") {
      settings = { ...settings, ...message.settings };
      applyPosition();
      render();
    }
    if (message?.type === "omeconnector-reset-position") {
      settings.position = null;
      overlay.style.left = "";
      overlay.style.top = "";
      overlay.style.right = "18px";
    }
    if (message?.type === "omeconnector-update") showUpdate(message.update);
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.updateAvailable?.newValue) showUpdate(changes.updateAvailable.newValue);
  });

  document.addEventListener("keydown", (event) => {
    if (event.altKey && event.key.toLowerCase() === "o") {
      settings.enabled = !settings.enabled;
      chrome.storage.local.set({ enabled: settings.enabled });
      render();
    }
  });

  (async () => {
    settings = await loadSettings();
    createOverlay();
    chrome.storage.local.get(["updateAvailable"], (data) => {
      if (data.updateAvailable) showUpdate(data.updateAvailable);
    });
    render();
    setInterval(render, 1000);
    new MutationObserver(() => {
      if (!document.getElementById("omeconnector-overlay")) createOverlay();
    }).observe(document.documentElement, { childList: true, subtree: true });
  })();
})();
