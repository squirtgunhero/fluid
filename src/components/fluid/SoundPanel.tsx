"use client";

import { motion } from "framer-motion";
import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import { formatTime } from "@/lib/presets";
import type { Track } from "@/lib/sound/db";
import { useSound } from "./SoundProvider";
import { GlassPanel } from "./GlassPanel";
import { CloseIcon, ImportIcon, NoteIcon, PauseIcon, PlayIcon, PlusIcon, SkipIcon, SoundIcon } from "./Icons";

const TAP = { type: "spring", stiffness: 520, damping: 30 } as const;

/** The music: a Suno link or a file in, a library, and a quiet transport. */
export function SoundPanel() {
  const { tracks, current, playing, position, status, progress, play, toggle, next, prev, seek, addSuno, importFiles, remove } =
    useSound();
  const [link, setLink] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = status.kind === "busy";

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    const value = link;
    setLink("");
    await addSuno(value);
  };

  const onSeek = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek((e.clientX - r.left) / r.width);
  };

  return (
    <GlassPanel className="sound" tilt={0}>
      <div className="sound-head">
        <div className="sound-title">
          <SoundIcon />
          <span>Sound</span>
        </div>
        <div className="sound-now" aria-live="polite">
          {current ? (
            <>
              <b>{current.title}</b>
              {current.artist && <span className="sound-artist"> · {current.artist}</span>}
            </>
          ) : (
            <span className="sound-muted">Nothing playing</span>
          )}
        </div>
        <div className="sound-transport">
          <motion.button type="button" className="icon-btn" aria-label="Previous track" onClick={prev} disabled={tracks.length === 0} whileTap={{ scale: 0.9 }} transition={TAP}>
            <SkipIcon back />
          </motion.button>
          <motion.button
            type="button"
            className="icon-btn icon-btn-main"
            aria-label={playing ? "Pause" : "Play"}
            aria-pressed={playing}
            onClick={toggle}
            disabled={tracks.length === 0}
            whileTap={{ scale: 0.9 }}
            transition={TAP}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </motion.button>
          <motion.button type="button" className="icon-btn" aria-label="Next track" onClick={next} disabled={tracks.length === 0} whileTap={{ scale: 0.9 }} transition={TAP}>
            <SkipIcon />
          </motion.button>
        </div>
      </div>

      <div
        className="sound-progress"
        role="slider"
        aria-label="Position in track"
        aria-valuemin={0}
        aria-valuemax={current?.duration ? Math.round(current.duration) : 0}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${formatTime(position)} of ${formatTime(current?.duration ?? 0)}`}
        tabIndex={current ? 0 : -1}
        onClick={onSeek}
        onKeyDown={(e) => {
          if (!current?.duration) return;
          const stepFrac = 10 / current.duration;
          if (e.key === "ArrowRight") seek(position / current.duration + stepFrac);
          if (e.key === "ArrowLeft") seek(position / current.duration - stepFrac);
        }}
      >
        <motion.div className="sound-progress-fill" style={{ scaleX: progress }} />
        <span className="sound-time">
          {formatTime(position)} / {formatTime(current?.duration ?? 0)}
        </span>
      </div>

      <form className="sound-add" onSubmit={onAdd}>
        <label htmlFor="suno-link" className="sr-only">
          Suno link
        </label>
        <input
          id="suno-link"
          className="glass-input"
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Paste a Suno link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          disabled={busy}
        />
        <motion.button type="submit" className="pill-btn" disabled={busy || !link.trim()} whileTap={{ scale: 0.95 }} transition={TAP}>
          <PlusIcon />
          <span>Add</span>
        </motion.button>
        <motion.button
          type="button"
          className="pill-btn"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          whileTap={{ scale: 0.95 }}
          transition={TAP}
        >
          <ImportIcon />
          <span>Import</span>
        </motion.button>
        <input
          ref={fileInput}
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            if (e.target.files?.length) void importFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </form>

      {status.message && (
        <p className={`sound-status is-${status.kind}`} role="status">
          {status.message}
        </p>
      )}

      {tracks.length === 0 ? (
        <p className="sound-empty">Add a song from Suno, or import audio from your files. Music begins with the breath and fades when it ends.</p>
      ) : (
        <ul className="track-list" aria-label="Library">
          {tracks.map((t) => (
            <TrackRow key={t.id} track={t} active={t.id === current?.id} playing={playing && t.id === current?.id} onPlay={() => play(t.id)} onRemove={() => remove(t.id)} />
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}

function TrackRow({ track, active, playing, onPlay, onRemove }: { track: Track; active: boolean; playing: boolean; onPlay: () => void; onRemove: () => void }) {
  return (
    <li className={`track${active ? " is-active" : ""}`}>
      <motion.button type="button" className="track-main" onClick={onPlay} aria-current={active ? "true" : undefined} whileTap={{ scale: 0.985 }} transition={TAP}>
        <span className="track-art" style={track.cover ? { backgroundImage: `url(${track.cover})` } : undefined} aria-hidden="true">
          {!track.cover && <NoteIcon />}
          {playing && <span className="track-live" />}
        </span>
        <span className="track-text">
          <b>{track.title}</b>
          <small>{track.artist ?? (track.source === "suno" ? "Suno" : "Imported")}{!track.stored && " · streams"}</small>
        </span>
        <span className="track-dur">{track.duration ? formatTime(track.duration) : "–:––"}</span>
      </motion.button>
      <motion.button type="button" className="icon-btn icon-btn-sm" aria-label={`Remove ${track.title}`} onClick={onRemove} whileTap={{ scale: 0.9 }} transition={TAP}>
        <CloseIcon />
      </motion.button>
    </li>
  );
}
