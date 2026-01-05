(function () {
  const settingsDefaults = {
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

  /** @type {typeof settingsDefaults} */
  let settings = { ...settingsDefaults };

  /** Track submissions we've already reacted to to avoid duplicate shocks. */
  const seenSubmissions = new Set();

  function loadSettings() {
    return browser.storage.local
      .get(settingsDefaults)
      .then((stored) => {
        settings = Object.assign({}, settingsDefaults, stored);
      })
      .catch((err) => {
        console.error("PiShock extension: failed to load settings", err);
      });
  }

  // Initialize settings on startup.
  loadSettings();

  // Keep in-memory settings in sync with storage.
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    Object.keys(changes).forEach((key) => {
      if (key in settings) {
        settings[key] = changes[key].newValue;
      }
    });
  });

  function clamp(num, min, max) {
    num = Number(num);
    if (!Number.isFinite(num)) return min;
    return Math.max(min, Math.min(max, num));
  }

  async function sendPiShock(action) {
    const { pishockUsername, pishockApiKey, pishockCode } = settings;

    if (!pishockUsername || !pishockApiKey || !pishockCode) {
      console.warn(
        "PiShock extension: device not fully configured, skipping operation."
      );
      return;
    }

    const isShock = action === "shock";
    const rawIntensity = isShock
      ? settings.shockIntensity
      : settings.vibrateIntensity;
    const rawDuration = isShock
      ? settings.shockDuration
      : settings.vibrateDuration;

    const intensity = clamp(rawIntensity, 1, 100);
    const duration = clamp(rawDuration, 1, 15);

    const payload = {
      Username: pishockUsername,
      Apikey: pishockApiKey,
      Code: pishockCode,
      Name: "cursor-gpt-5.1",
      Op: isShock ? 0 : 1, // 0 = shock, 1 = vibrate
      Intensity: intensity,
      Duration: duration
    };

    try {
      const response = await fetch("https://do.pishock.com/api/apioperate/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(
          "PiShock extension: API request failed with status",
          response.status
        );
        return;
      }

      // The PiShock API often returns JSON; we log only on error to avoid noise.
      let result = null;
      try {
        result = await response.json();
      } catch (_ignore) {
        // Non-JSON or empty response, silently ignore.
      }
      if (result && result.success === false) {
        console.error("PiShock extension: API indicated failure", result);
      }
    } catch (err) {
      console.error("PiShock extension: failed to call PiShock API", err);
    }
  }

  /**
   * Handle a LeetCode submission result message from the content script.
   * @param {any} data
   */
  function handleSubmissionResult(data) {
    if (!data || typeof data !== "object") return;

    const state = data.state;
    if (state && state !== "SUCCESS") {
      // Ignore PENDING and any non-success states.
      return;
    }

    const taskName = data.task_name;
    const isTestSubmit = taskName === "judger.runcodetask.RunCode";
    const isFinalSubmit = taskName === "judger.judgetask.Judge";

    if (!isTestSubmit && !isFinalSubmit) {
      return;
    }

    const submissionId =
      data.submission_id ||
      data.submissionId ||
      `${taskName}:${data.task_finish_time || ""}`;

    if (submissionId && seenSubmissions.has(submissionId)) {
      return;
    }
    if (submissionId) {
      seenSubmissions.add(submissionId);
    }

    const runSuccess = Boolean(data.run_success);

    if (runSuccess) {
      // Always send a vibration on success.
      void sendPiShock("vibrate");
      return;
    }

    // Incorrect submission.
    if (
      (isTestSubmit && settings.shockOnTestFail) ||
      (isFinalSubmit && settings.shockOnFinalFail)
    ) {
      void sendPiShock("shock");
    }
  }

  browser.runtime.onMessage.addListener((message) => {
    if (!message || typeof message !== "object") {
      return;
    }

    if (message.type === "leetcodeSubmissionResult") {
      handleSubmissionResult(message.payload || message.data || {});
    } else if (message.type === "testVibrate") {
      void sendPiShock("vibrate");
    }
  });

  // Monitor LeetCode submission check responses via webRequest.
  browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      try {
        const filter = browser.webRequest.filterResponseData(details.requestId);
        const decoder = new TextDecoder("utf-8");
        let body = "";

        filter.ondata = (event) => {
          try {
            body += decoder.decode(event.data, { stream: true });
          } catch (err) {
            console.error(
              "PiShock extension: failed to decode response chunk",
              err
            );
          }
          // Pass the data through unchanged.
          filter.write(event.data);
        };

        filter.onstop = () => {
          try {
            body += decoder.decode();
            if (body) {
              try {
                const json = JSON.parse(body);
                handleSubmissionResult(json);
              } catch (_parseErr) {
                // Not JSON or not the expected structure; ignore.
              }
            }
          } catch (err) {
            console.error(
              "PiShock extension: error finalizing response body",
              err
            );
          }
          filter.close();
        };
      } catch (err) {
        console.error(
          "PiShock extension: failed to attach response filter",
          err
        );
      }
      // We are not modifying the request itself.
      return {};
    },
    {
      urls: ["https://leetcode.com/submissions/detail/*/check/"]
    },
    ["blocking"]
  );
})();


