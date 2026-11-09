import { Capacitor, CapacitorHttp } from "@capacitor/core";

/**
 * Platform-aware HTTP. In the iOS shell requests go through the native
 * layer, which is not bound by CORS, so Suno's pages and CDN can be read
 * directly. In a browser we fall back to `fetch`, which only succeeds where
 * the server allows cross-origin reads.
 */
export async function fetchText(url: string): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.get({ url, responseType: "text", connectTimeout: 15000, readTimeout: 15000 });
      if (res.status < 200 || res.status >= 300) return null;
      return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    }
    const res = await fetch(url, { mode: "cors" });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

export async function fetchBlob(url: string): Promise<Blob | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.get({ url, responseType: "blob", connectTimeout: 20000, readTimeout: 120000 });
      if (res.status < 200 || res.status >= 300 || typeof res.data !== "string") return null;
      const bytes = Uint8Array.from(atob(res.data), (c) => c.charCodeAt(0));
      const type = (res.headers["Content-Type"] ?? res.headers["content-type"] ?? "audio/mpeg").split(";")[0];
      return new Blob([bytes], { type });
    }
    const res = await fetch(url, { mode: "cors" });
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
}
