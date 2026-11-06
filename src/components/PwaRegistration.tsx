import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let disposed = false;
    let checkingVersion = false;

    const normalizedModuleScripts = (root: Document) =>
      Array.from(root.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'))
        .map((script) => new URL(script.src, window.location.origin).pathname)
        .sort()
        .join("|");

    const reloadIfNewBuild = async () => {
      const isAdminSurface =
        window.location.pathname === "/auth" ||
        window.location.pathname === "/admin" ||
        window.location.pathname.startsWith("/admin/");
      if (!isAdminSurface) return;
      if (disposed || checkingVersion || document.visibilityState !== "visible") return;
      checkingVersion = true;
      try {
        const response = await fetch(`${window.location.pathname}?__lvi_build_check=${Date.now()}`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { "x-lvi-build-check": "1" },
        });
        if (!response.ok) return;
        const html = await response.text();
        const nextDocument = new DOMParser().parseFromString(html, "text/html");
        const currentScripts = normalizedModuleScripts(document);
        const nextScripts = normalizedModuleScripts(nextDocument);
        if (currentScripts && nextScripts && currentScripts !== nextScripts) {
          window.location.reload();
        }
      } catch (error) {
        console.warn("LVI Admin build check failed", error);
      } finally {
        checkingVersion = false;
      }
    };

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
      .register("/admin-sw.js", { updateViaCache: "none" })
      .then(async (registration) => {
        await registration.update();
        await clearBadge();
        await reloadIfNewBuild();
      })
      .catch((error) => {
        console.error("LVI Admin service worker could not be registered", error);
      });

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void clearBadge();
        void reloadIfNewBuild();
      }
    };
    const onFocus = () => {
      void clearBadge();
      void reloadIfNewBuild();
    };

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
