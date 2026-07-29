import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/admin-sw.js").catch((error) => {
      console.error("LVI Admin service worker could not be registered", error);
    });
  }, []);

  return null;
}
