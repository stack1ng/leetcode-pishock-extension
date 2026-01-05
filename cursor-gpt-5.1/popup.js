document.addEventListener("DOMContentLoaded", () => {
  const usernameInput = document.getElementById("pishock-username");
  const apiKeyInput = document.getElementById("pishock-apikey");
  const codeInput = document.getElementById("pishock-code");
  const shockOnTestInput = document.getElementById("shock-on-test");
  const shockOnFinalInput = document.getElementById("shock-on-final");
  const shockIntensityInput = document.getElementById("shock-intensity");
  const shockDurationInput = document.getElementById("shock-duration");
  const vibrateIntensityInput = document.getElementById("vibrate-intensity");
  const vibrateDurationInput = document.getElementById("vibrate-duration");
  const statusEl = document.getElementById("status");
  const form = document.getElementById("settings-form");
  const testVibrateBtn = document.getElementById("test-vibrate");

  const defaults = {
    pishockUsername: "",
    pishockApiKey: "",
    pishockCode: "",
    shockOnTestFail: false,
    shockOnFinalFail: false,
    shockIntensity: 30,
    shockDuration: 1,
    vibrateIntensity: 25,
    vibrateDuration: 1
  };

  function showStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle("error", Boolean(isError));
  }

  function loadSettings() {
    browser.storage.local
      .get(defaults)
      .then((stored) => {
        usernameInput.value = stored.pishockUsername || "";
        apiKeyInput.value = stored.pishockApiKey || "";
        codeInput.value = stored.pishockCode || "";
        shockOnTestInput.checked = Boolean(stored.shockOnTestFail);
        shockOnFinalInput.checked = Boolean(stored.shockOnFinalFail);
        shockIntensityInput.value = stored.shockIntensity;
        shockDurationInput.value = stored.shockDuration;
        vibrateIntensityInput.value = stored.vibrateIntensity;
        vibrateDurationInput.value = stored.vibrateDuration;
      })
      .catch((err) => {
        console.error("PiShock popup: failed to load settings", err);
        showStatus("Failed to load settings.", true);
      });
  }

  function clamp(num, min, max) {
    num = Number(num);
    if (!Number.isFinite(num)) return min;
    return Math.max(min, Math.min(max, num));
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    const code = codeInput.value.trim();

    if (!username || !apiKey || !code) {
      showStatus("Please fill in username, API key and device code.", true);
      return;
    }

    const shockIntensity = clamp(shockIntensityInput.value || 30, 1, 100);
    const shockDuration = clamp(shockDurationInput.value || 1, 1, 15);
    const vibrateIntensity = clamp(vibrateIntensityInput.value || 25, 1, 100);
    const vibrateDuration = clamp(vibrateDurationInput.value || 1, 1, 15);

    browser.storage.local
      .set({
        pishockUsername: username,
        pishockApiKey: apiKey,
        pishockCode: code,
        shockOnTestFail: shockOnTestInput.checked,
        shockOnFinalFail: shockOnFinalInput.checked,
        shockIntensity,
        shockDuration,
        vibrateIntensity,
        vibrateDuration
      })
      .then(() => {
        showStatus("Settings saved.", false);
        setTimeout(() => showStatus("", false), 2000);
      })
      .catch((err) => {
        console.error("PiShock popup: failed to save settings", err);
        showStatus("Failed to save settings.", true);
      });
  });

  if (testVibrateBtn) {
    testVibrateBtn.addEventListener("click", () => {
      browser.runtime
        .sendMessage({ type: "testVibrate" })
        .then(() => {
          showStatus("Test vibrate sent (if configured).", false);
          setTimeout(() => showStatus("", false), 2000);
        })
        .catch((err) => {
          console.error("PiShock popup: failed to send test vibrate", err);
          showStatus("Failed to send test vibrate.", true);
        });
    });
  }

  loadSettings();
});


