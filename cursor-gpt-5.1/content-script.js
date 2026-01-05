(function () {
  const targetRegex =
    /^https:\/\/leetcode\.com\/submissions\/detail\/[^/]+\/check\/?$/;

  function isTargetUrl(url) {
    if (!url) return false;
    try {
      const u = new URL(url, window.location.origin);
      return targetRegex.test(u.href);
    } catch {
      return false;
    }
  }

  /**
   * Send parsed submission data to the background script.
   * @param {any} data
   */
  function forwardSubmissionData(data) {
    if (!data || typeof data !== "object") return;

    try {
      browser.runtime.sendMessage({
        type: "leetcodeSubmissionResult",
        payload: {
          state: data.state,
          task_name: data.task_name,
          run_success: data.run_success,
          submission_id: data.submission_id,
          task_finish_time: data.task_finish_time,
          total_correct: data.total_correct,
          total_testcases: data.total_testcases
        }
      });
    } catch (err) {
      // In content scripts we should fail silently to avoid breaking the page.
      console.error("PiShock extension: failed to send message", err);
    }
  }

  function patchFetch() {
    if (typeof window.fetch !== "function") return;
    const originalFetch = window.fetch;

    window.fetch = function patchedFetch(input, init) {
      let url = "";
      if (typeof input === "string") {
        url = input;
      } else if (input && typeof input === "object" && "url" in input) {
        url = input.url;
      }

      const watch = isTargetUrl(url);

      return originalFetch.call(this, input, init).then((response) => {
        if (watch && response && response.ok) {
          try {
            const clone = response.clone();
            clone
              .json()
              .then((data) => {
                forwardSubmissionData(data);
              })
              .catch(() => {
                // Ignore JSON parse errors; not all responses will be JSON.
              });
          } catch (err) {
            console.error(
              "PiShock extension: error cloning fetch response",
              err
            );
          }
        }
        return response;
      });
    };
  }

  function patchXHR() {
    const OriginalXHR = window.XMLHttpRequest;
    if (!OriginalXHR) return;

    const originalOpen = OriginalXHR.prototype.open;
    const originalSend = OriginalXHR.prototype.send;

    OriginalXHR.prototype.open = function patchedOpen(
      method,
      url,
      async,
      user,
      password
    ) {
      this.__pishockIsLeetCodeCheck = isTargetUrl(url);
      return originalOpen.call(this, method, url, async, user, password);
    };

    OriginalXHR.prototype.send = function patchedSend(body) {
      if (this.__pishockIsLeetCodeCheck) {
        this.addEventListener("load", function () {
          try {
            if (
              this.responseType === "" ||
              this.responseType === "text" ||
              this.responseType === "json"
            ) {
              const text = this.responseText;
              if (!text) return;
              const data = JSON.parse(text);
              forwardSubmissionData(data);
            }
          } catch (err) {
            console.error(
              "PiShock extension: failed to read XHR response",
              err
            );
          }
        });
      }

      return originalSend.call(this, body);
    };
  }

  try {
    patchFetch();
    patchXHR();
  } catch (err) {
    console.error("PiShock extension: failed to patch network APIs", err);
  }
})();


