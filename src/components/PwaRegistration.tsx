import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let disposed = false;

    const clearBadge = async () => {
      if (document.visibilityState !== "visible") return;

      try {
        if ("clearAppBadge" in navigator) {
          await navigator.clearAppBadge();
        }
      } catch (error) {
        console.warn("LVI Admin app badge could not be cleared", error);
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        if (!disposed) {
          registration.active?.postMessage({ type: "CLEAR_APP_BADGE" });
        }
      } catch (error) {
        console.warn("LVI Admin service worker badge reset failed", error);
      }
    };

    navigator.serviceWorker
      .register("/admin-sw.js")
      .then(() => clearBadge())
      .catch((error) => {
        console.error("LVI Admin service worker could not be registered", error);
      });

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void clearBadge();
    };
    const onFocus = () => void clearBadge();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
