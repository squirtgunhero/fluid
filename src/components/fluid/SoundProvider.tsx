"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAnimationFrame, useMotionValue, type MotionValue } from "framer-motion";
import {
  deleteBlob,
  deleteTrack,
  getBlob,
  listTracks,
  probeDuration,
  putBlob,
  putTrack,
  type Track,
} from "@/lib/sound/db";
import { fetchBlob } from "@/lib/sound/http";
import { isSunoInput, resolveSuno } from "@/lib/sound/suno";
import { useFluid } from "./FluidProvider";
import { haptic } from "@/lib/haptics";

export type SoundStatus = { kind: "idle" | "busy" | "error" | "info"; message?: string };

type SoundContextValue = {
  tracks: Track[];
  current: Track | null;
  playing: boolean;
  /** Seconds into the current track, updated a few times a second. */
  position: number;
  status: SoundStatus;
  /** 0–1 through the current track. */
  progress: MotionValue<number>;
  play: (id: string) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (fraction: number) => void;
  addSuno: (link: string) => Promise<void>;
  importFiles: (files: FileList | File[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Called inside the orb's tap when a session begins. */
  playForSession: () => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

const FADE_SECONDS = 1.8;

/**
 * The sound engine. One audio element for locally stored tracks, routed
 * through Web Audio (gain for fades, analyser for the orb), and a second
 * plain element for streamed tracks whose servers do not allow analysis.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const { mv, session } = useFluid();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [status, setStatus] = useState<SoundStatus>({ kind: "idle" });
  const progress = useMotionValue(0);

  const graphEl = useRef<HTMLAudioElement | null>(null);
  const streamEl = useRef<HTMLAudioElement | null>(null);
  const active = useRef<HTMLAudioElement | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const samples = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const objectUrls = useRef(new Map<string, string>());
  const startedBySession = useRef(false);
  const fadeTimer = useRef<number | undefined>(undefined);
  const tracksRef = useRef<Track[]>([]);
  const currentRef = useRef<string | null>(null);
  const nextRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    tracksRef.current = tracks;
    currentRef.current = currentId;
  }, [tracks, currentId]);

  const current = useMemo(() => tracks.find((t) => t.id === currentId) ?? null, [tracks, currentId]);

  // Elements are created once, on the client.
  useEffect(() => {
    const urls = objectUrls.current;
    const a = new Audio();
    a.preload = "auto";
    const b = new Audio();
    b.preload = "auto";
    graphEl.current = a;
    streamEl.current = b;
    const onTime = (e: Event) => {
      const el = e.currentTarget as HTMLAudioElement;
      if (el !== active.current) return;
      setPosition(el.currentTime);
      progress.set(el.duration ? el.currentTime / el.duration : 0);
    };
    const onPlay = (e: Event) => {
      if (e.currentTarget === active.current) setPlaying(true);
    };
    const onPause = (e: Event) => {
      if (e.currentTarget === active.current) setPlaying(false);
    };
    const onEnded = () => nextRef.current();
    for (const el of [a, b]) {
      el.addEventListener("timeupdate", onTime);
      el.addEventListener("play", onPlay);
      el.addEventListener("pause", onPause);
      el.addEventListener("ended", onEnded);
    }
    return () => {
      for (const el of [a, b]) {
        el.pause();
        el.removeEventListener("timeupdate", onTime);
        el.removeEventListener("play", onPlay);
        el.removeEventListener("pause", onPause);
        el.removeEventListener("ended", onEnded);
      }
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
    };
  }, [progress]);

  // The library, from IndexedDB.
  useEffect(() => {
    let cancelled = false;
    listTracks()
      .then((list) => {
        if (!cancelled) setTracks(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  /** Build the Web Audio graph. Must first run inside a user gesture. */
  const ensureGraph = useCallback(() => {
    const el = graphEl.current;
    if (!el) return;
    if (!ctx.current) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const c = new AC();
      const src = c.createMediaElementSource(el);
      const g = c.createGain();
      const an = c.createAnalyser();
      an.fftSize = 1024;
      an.smoothingTimeConstant = 0.6;
      src.connect(g);
      g.connect(an);
      an.connect(c.destination);
      ctx.current = c;
      gain.current = g;
      analyser.current = an;
      samples.current = new Uint8Array(an.fftSize) as Uint8Array<ArrayBuffer>;
    }
    if (ctx.current.state === "suspended") void ctx.current.resume();
  }, []);

  const cancelFade = useCallback(() => {
    window.clearTimeout(fadeTimer.current);
    const g = gain.current;
    const c = ctx.current;
    if (g && c) {
      g.gain.cancelScheduledValues(c.currentTime);
      g.gain.setValueAtTime(1, c.currentTime);
    }
  }, []);

  const urlFor = useCallback(async (track: Track): Promise<{ url: string; local: boolean } | null> => {
    if (track.stored) {
      const cached = objectUrls.current.get(track.id);
      if (cached) return { url: cached, local: true };
      const blob = await getBlob(track.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        objectUrls.current.set(track.id, url);
        return { url, local: true };
      }
    }
    return track.url ? { url: track.url, local: false } : null;
  }, []);

  const updateMediaSession = useCallback((track: Track) => {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist ?? (track.source === "suno" ? "Suno" : "Fluid"),
        album: "Fluid",
        artwork: track.cover ? [{ src: track.cover, sizes: "512x512", type: "image/jpeg" }] : [],
      });
    } catch {
      // Metadata is a nicety.
    }
  }, []);

  const play = useCallback(
    async (id: string) => {
      const track = tracksRef.current.find((t) => t.id === id);
      if (!track) return;
      cancelFade();
      const resolved = await urlFor(track);
      if (!resolved) {
        setStatus({ kind: "error", message: "That track has no audio to play." });
        return;
      }
      const el = resolved.local ? graphEl.current : streamEl.current;
      const other = resolved.local ? streamEl.current : graphEl.current;
      if (!el) return;
      other?.pause();
      if (resolved.local) ensureGraph();
      if (active.current !== el || el.src !== resolved.url) {
        el.src = resolved.url;
        el.currentTime = 0;
      }
      active.current = el;
      setCurrentId(id);
      updateMediaSession(track);
      try {
        await el.play();
        setStatus({ kind: "idle" });
      } catch {
        setStatus({
          kind: "error",
          message: resolved.local ? "Playback was blocked. Tap play to start." : "This song could not be streamed.",
        });
      }
    },
    [cancelFade, urlFor, ensureGraph, updateMediaSession],
  );

  const toggle = useCallback(() => {
    const el = active.current;
    if (!el || !currentRef.current) {
      const first = tracksRef.current[0];
      if (first) void play(first.id);
      return;
    }
    cancelFade();
    if (el.paused) {
      if (el === graphEl.current) ensureGraph();
      void el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }, [play, cancelFade, ensureGraph]);

  const step = useCallback(
    (dir: 1 | -1) => {
      const list = tracksRef.current;
      if (list.length === 0) return;
      const i = list.findIndex((t) => t.id === currentRef.current);
      const n = i < 0 ? 0 : (i + dir + list.length) % list.length;
      void play(list[n].id);
    },
    [play],
  );
  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => {
    const el = active.current;
    if (el && el.currentTime > 4) {
      el.currentTime = 0;
      return;
    }
    step(-1);
  }, [step]);
  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  const seek = useCallback((fraction: number) => {
    const el = active.current;
    if (!el || !Number.isFinite(el.duration)) return;
    el.currentTime = Math.max(0, Math.min(1, fraction)) * el.duration;
  }, []);

  // Lock-screen and headphone controls.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // Unsupported action on this platform.
      }
    };
    set("play", () => toggle());
    set("pause", () => toggle());
    set("nexttrack", () => next());
    set("previoustrack", () => prev());
    return () => {
      for (const a of ["play", "pause", "nexttrack", "previoustrack"] as MediaSessionAction[]) set(a, null);
    };
  }, [toggle, next, prev]);

  // Loudness for the orb: RMS of the waveform, fast attack, slow release.
  useAnimationFrame(() => {
    const an = analyser.current;
    const buf = samples.current;
    const el = active.current;
    let target = 0;
    if (an && buf && el === graphEl.current && el && !el.paused) {
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      target = Math.min(1, Math.sqrt(sum / buf.length) * 2.6);
    }
    const cur = mv.level.get();
    mv.level.set(cur + (target - cur) * (target > cur ? 0.35 : 0.08));
  });

  // Music the session started fades out when the session ends.
  useEffect(() => {
    if (session || !startedBySession.current) return;
    startedBySession.current = false;
    const el = active.current;
    if (!el || el.paused) return;
    const g = gain.current;
    const c = ctx.current;
    if (el === graphEl.current && g && c) {
      g.gain.cancelScheduledValues(c.currentTime);
      g.gain.setValueAtTime(g.gain.value, c.currentTime);
      g.gain.linearRampToValueAtTime(0, c.currentTime + FADE_SECONDS);
      fadeTimer.current = window.setTimeout(() => {
        el.pause();
        g.gain.setValueAtTime(1, c.currentTime);
      }, FADE_SECONDS * 1000);
    } else {
      el.pause();
    }
  }, [session]);

  const playForSession = useCallback(() => {
    const el = active.current;
    if (el && !el.paused) return;
    const id = currentRef.current ?? tracksRef.current[0]?.id;
    if (!id) return;
    startedBySession.current = true;
    void play(id);
  }, [play]);

  const addSuno = useCallback(async (link: string) => {
    const input = link.trim();
    if (!input) return;
    if (!isSunoInput(input)) {
      setStatus({ kind: "error", message: "That doesn't look like a Suno link." });
      return;
    }
    setStatus({ kind: "busy", message: "Reaching Suno…" });
    const song = await resolveSuno(input);
    if (!song) {
      setStatus({ kind: "error", message: "Couldn't find a song in that link." });
      return;
    }
    if (tracksRef.current.some((t) => t.id === song.id)) {
      setStatus({ kind: "info", message: `${song.title} is already in your library.` });
      return;
    }
    setStatus({ kind: "busy", message: `Downloading ${song.title}…` });
    const blob = await fetchBlob(song.audioUrl);
    let duration = 0;
    let stored = false;
    if (blob && blob.size > 1024) {
      await putBlob(song.id, blob);
      duration = await probeDuration(blob);
      stored = true;
    }
    const track: Track = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      source: "suno",
      stored,
      url: song.audioUrl,
      cover: song.coverUrl,
      page: song.page,
      duration,
      addedAt: Date.now(),
    };
    await putTrack(track);
    setTracks((t) => [...t, track]);
    setStatus(
      stored
        ? { kind: "idle" }
        : { kind: "info", message: `${song.title} will stream. Add it in the app to keep it offline.` },
    );
    haptic("light");
  }, []);

  const importFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("audio/") || /\.(mp3|m4a|wav|aac|ogg|flac)$/i.test(f.name));
    if (list.length === 0) {
      setStatus({ kind: "error", message: "No audio files were chosen." });
      return;
    }
    setStatus({ kind: "busy", message: list.length === 1 ? `Adding ${list[0].name}…` : `Adding ${list.length} files…` });
    const added: Track[] = [];
    for (const file of list) {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await putBlob(id, file);
      const duration = await probeDuration(file);
      const track: Track = {
        id,
        title: file.name.replace(/\.[^.]+$/, ""),
        source: "file",
        stored: true,
        duration,
        addedAt: Date.now(),
      };
      await putTrack(track);
      added.push(track);
    }
    setTracks((t) => [...t, ...added]);
    setStatus({ kind: "idle" });
    haptic("light");
  }, []);

  const remove = useCallback(async (id: string) => {
    if (currentRef.current === id) {
      active.current?.pause();
      if (active.current) active.current.removeAttribute("src");
      active.current = null;
      setCurrentId(null);
      setPlaying(false);
      progress.set(0);
      setPosition(0);
    }
    const url = objectUrls.current.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      objectUrls.current.delete(id);
    }
    await Promise.all([deleteTrack(id), deleteBlob(id)]);
    setTracks((t) => t.filter((x) => x.id !== id));
  }, [progress]);

  const value = useMemo<SoundContextValue>(
    () => ({ tracks, current, playing, position, status, progress, play, toggle, next, prev, seek, addSuno, importFiles, remove, playForSession }),
    [tracks, current, playing, position, status, progress, play, toggle, next, prev, seek, addSuno, importFiles, remove, playForSession],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used inside <SoundProvider>");
  return ctx;
}
