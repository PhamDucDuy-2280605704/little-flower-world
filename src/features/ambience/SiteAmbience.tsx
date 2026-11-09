"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import styles from "./SiteAmbience.module.css";

const CHORDS = [
  [0, 4, 7, 11],
  [9, 12, 16, 19],
  [5, 9, 12, 16],
  [7, 11, 14, 17],
] as const;

const MELODY = [7, 11, 14, 12, 11, 7, 4, 7, 11, 12, 14, 19, 17, 14, 12, 11] as const;
const CHORD_DURATION = 8;
const ROOT_FREQUENCY = 130.8128;
const MELODY_FREQUENCY = 261.6256;

function frequencyFor(semitones: number, base = ROOT_FREQUENCY): number {
  return base * 2 ** (semitones / 12);
}

type UnlockHandler = () => void;

export default function SiteAmbience() {
  const { language } = useLanguage();
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.52);
  const [volumeOpen, setVolumeOpen] = useState(true);
  const [audioError, setAudioError] = useState("");
  const audioRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const schedulerRef = useRef<number | null>(null);
  const unlockHandlerRef = useRef<UnlockHandler | null>(null);
  const startingRef = useRef(false);
  const enabledRef = useRef(true);
  const volumeRef = useRef(volume);
  const generationRef = useRef(0);

  useEffect(() => {
    volumeRef.current = volume;
    const gain = masterGainRef.current;
    const context = audioRef.current;
    if (gain && context && context.state !== "closed") {
      gain.gain.setTargetAtTime(volume, context.currentTime, 0.18);
    }
  }, [volume]);

  const removeUnlockHandlers = useCallback(() => {
    const handler = unlockHandlerRef.current;
    if (!handler) return;
    window.removeEventListener("pointerdown", handler, true);
    window.removeEventListener("keydown", handler, true);
    unlockHandlerRef.current = null;
  }, []);

  const startMusic = useCallback(async () => {
    if (!enabledRef.current || audioRef.current || startingRef.current) return;

    startingRef.current = true;
    setAudioError("");
    setVolumeOpen(true);
    const generation = ++generationRef.current;
    const AudioContextConstructor = window.AudioContext;

    if (!AudioContextConstructor) {
      startingRef.current = false;
      enabledRef.current = false;
      setMusicEnabled(false);
      setAudioError(language === "vi"
        ? "Trình duyệt này chưa hỗ trợ nhạc nền."
        : "This browser does not support background music.");
      return;
    }

    let context: AudioContext | null = null;

    try {
      context = new AudioContextConstructor();
      audioRef.current = context;

      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, context.currentTime);
      master.gain.setTargetAtTime(volumeRef.current, context.currentTime, 0.55);

      const toneFilter = context.createBiquadFilter();
      toneFilter.type = "lowpass";
      toneFilter.frequency.setValueAtTime(4600, context.currentTime);
      toneFilter.Q.setValueAtTime(0.32, context.currentTime);

      const compressor = context.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-19, context.currentTime);
      compressor.knee.setValueAtTime(18, context.currentTime);
      compressor.ratio.setValueAtTime(2.8, context.currentTime);
      compressor.attack.setValueAtTime(0.018, context.currentTime);
      compressor.release.setValueAtTime(0.28, context.currentTime);

      master.connect(toneFilter);
      toneFilter.connect(compressor);
      compressor.connect(context.destination);

      const echo = context.createDelay(1.2);
      echo.delayTime.value = 0.31;
      const feedback = context.createGain();
      feedback.gain.value = 0.22;
      const echoLevel = context.createGain();
      echoLevel.gain.value = 0.16;
      toneFilter.connect(echo);
      echo.connect(feedback);
      feedback.connect(echo);
      echo.connect(echoLevel);
      echoLevel.connect(compressor);
      masterGainRef.current = master;

      const playPad = (frequency: number, startAt: number, duration: number, level: number) => {
        if (!context) return;
        const pair = [
          { type: "triangle" as OscillatorType, detune: -5, gain: level * 0.72 },
          { type: "sine" as OscillatorType, detune: 5, gain: level * 0.42 },
        ];
        pair.forEach((voice) => {
          const oscillator = context!.createOscillator();
          const voiceGain = context!.createGain();
          oscillator.type = voice.type;
          oscillator.frequency.setValueAtTime(frequency, startAt);
          oscillator.detune.setValueAtTime(voice.detune, startAt);
          voiceGain.gain.setValueAtTime(0.0001, startAt);
          voiceGain.gain.linearRampToValueAtTime(voice.gain, startAt + 1.9);
          voiceGain.gain.setValueAtTime(voice.gain * 0.78, startAt + duration - 1.7);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
          oscillator.connect(voiceGain);
          voiceGain.connect(master);
          oscillator.start(startAt);
          oscillator.stop(startAt + duration + 0.05);
          oscillator.onended = () => {
            oscillator.disconnect();
            voiceGain.disconnect();
          };
        });
      };

      const playPianoNote = (frequency: number, startAt: number, duration: number, level: number, pan: number) => {
        if (!context) return;
        const panner = context.createStereoPanner();
        panner.pan.setValueAtTime(pan, startAt);
        panner.connect(master);

        const fundamental = context.createOscillator();
        const harmonic = context.createOscillator();
        const fundamentalGain = context.createGain();
        const harmonicGain = context.createGain();

        fundamental.type = "triangle";
        harmonic.type = "sine";
        fundamental.frequency.setValueAtTime(frequency, startAt);
        harmonic.frequency.setValueAtTime(frequency * 2.002, startAt);
        fundamentalGain.gain.setValueAtTime(0.0001, startAt);
        fundamentalGain.gain.linearRampToValueAtTime(level, startAt + 0.018);
        fundamentalGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        harmonicGain.gain.setValueAtTime(0.0001, startAt);
        harmonicGain.gain.linearRampToValueAtTime(level * 0.18, startAt + 0.012);
        harmonicGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration * 0.62);

        fundamental.connect(fundamentalGain);
        harmonic.connect(harmonicGain);
        fundamentalGain.connect(panner);
        harmonicGain.connect(panner);
        fundamental.start(startAt);
        harmonic.start(startAt);
        fundamental.stop(startAt + duration + 0.04);
        harmonic.stop(startAt + duration * 0.65);
        fundamental.onended = () => {
          fundamental.disconnect();
          fundamentalGain.disconnect();
        };
        harmonic.onended = () => {
          harmonic.disconnect();
          harmonicGain.disconnect();
        };
        panner.onended = null;
        window.setTimeout(() => panner.disconnect(), Math.ceil((duration + 0.2) * 1000));
      };

      let schedulerStarted = false;
      const startScheduler = () => {
        if (schedulerStarted || !context || context.state !== "running") return;
        schedulerStarted = true;
        let nextBlockAt = context.currentTime + 0.12;
        let chordIndex = 0;

        const scheduleBlock = (startAt: number, index: number) => {
          const chord = CHORDS[index % CHORDS.length];
          chord.forEach((note, voiceIndex) => {
            const octave = voiceIndex === 3 ? 12 : 0;
            const level = voiceIndex === 0 ? 0.105 : voiceIndex === 3 ? 0.041 : 0.064;
            playPad(frequencyFor(note + octave), startAt, CHORD_DURATION + 0.45, level);
          });

          MELODY.forEach((note, noteIndex) => {
            const octave = noteIndex === 11 ? 12 : 0;
            const notePan = Math.sin(noteIndex * 0.78) * 0.34;
            const melodyFrequency = frequencyFor(chord[0] + note + octave, MELODY_FREQUENCY);
            playPianoNote(melodyFrequency, startAt + 0.48 + noteIndex * 0.46, 1.62, 0.086, notePan);
          });
        };

        const scheduleAhead = () => {
          if (!context || context.state !== "running" || !enabledRef.current) return;
          if (nextBlockAt < context.currentTime - CHORD_DURATION) {
            const skippedBlocks = Math.floor((context.currentTime - nextBlockAt) / CHORD_DURATION);
            nextBlockAt += skippedBlocks * CHORD_DURATION;
            chordIndex = (chordIndex + skippedBlocks) % CHORDS.length;
          }
          while (nextBlockAt < context.currentTime + 10) {
            scheduleBlock(nextBlockAt, chordIndex);
            nextBlockAt += CHORD_DURATION;
            chordIndex = (chordIndex + 1) % CHORDS.length;
          }
        };

        scheduleAhead();
        schedulerRef.current = window.setInterval(scheduleAhead, 650);
      };

      const activateAfterGesture = () => {
        if (!context || !enabledRef.current || audioRef.current !== context) return;
        void context.resume().then(() => {
          if (
            context &&
            context.state === "running" &&
            enabledRef.current &&
            audioRef.current === context &&
            generationRef.current === generation
          ) {
            removeUnlockHandlers();
            startScheduler();
            setPlaying(true);
          }
        }).catch((resumeError: unknown) => {
          console.warn("Ambient audio is still waiting for browser permission:", resumeError);
        });
      };

      let timeoutId: number | undefined;
      const resumeAttempt = context.resume().catch(() => undefined);
      await Promise.race([
        resumeAttempt,
        new Promise<void>((resolve) => {
          timeoutId = window.setTimeout(resolve, 850);
        }),
      ]);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);

      if (generationRef.current !== generation || !enabledRef.current || audioRef.current !== context) {
        return;
      }

      if (context.state === "running") {
        startScheduler();
        setPlaying(true);
      } else {
        setPlaying(false);
        setAudioError("");
        removeUnlockHandlers();
        unlockHandlerRef.current = activateAfterGesture;
        window.addEventListener("pointerdown", activateAfterGesture, true);
        window.addEventListener("keydown", activateAfterGesture, true);
      }
    } catch (error) {
      if (generationRef.current !== generation) return;
      console.error("Start ambient music failed:", error);
      if (context && context.state !== "closed") {
        void context.close().catch(() => undefined);
      }
      audioRef.current = null;
      masterGainRef.current = null;
      enabledRef.current = false;
      setMusicEnabled(false);
      setPlaying(false);
      setAudioError(language === "vi"
        ? "Chưa bật được nhạc. Anh thử nhấn nút phát lại nhé."
        : "Music could not start. Please try the play button again.");
    } finally {
      if (generationRef.current === generation) startingRef.current = false;
    }
  }, [language, removeUnlockHandlers]);

  const stopMusic = useCallback(() => {
    enabledRef.current = false;
    generationRef.current += 1;
    startingRef.current = false;
    removeUnlockHandlers();
    if (schedulerRef.current !== null) {
      window.clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
    const context = audioRef.current;
    audioRef.current = null;
    masterGainRef.current = null;
    if (context && context.state !== "closed") {
      void context.close().catch(() => undefined);
    }
    setMusicEnabled(false);
    setPlaying(false);
  }, [removeUnlockHandlers]);

  useEffect(() => {
    void startMusic();
    return () => {
      enabledRef.current = false;
      generationRef.current += 1;
      startingRef.current = false;
      removeUnlockHandlers();
      if (schedulerRef.current !== null) {
        window.clearInterval(schedulerRef.current);
        schedulerRef.current = null;
      }
      const context = audioRef.current;
      audioRef.current = null;
      masterGainRef.current = null;
      if (context && context.state !== "closed") {
        void context.close().catch(() => undefined);
      }
    };
  }, [startMusic, removeUnlockHandlers]);

  const toggleMusic = () => {
    if (enabledRef.current) {
      stopMusic();
      setVolumeOpen(false);
      return;
    }
    enabledRef.current = true;
    setMusicEnabled(true);
    setPlaying(false);
    void startMusic();
  };

  const isVietnamese = language === "vi";

  return (
    <>
      <div className={styles.atmosphere} aria-hidden="true">
        <span className={styles.glowOne} />
        <span className={styles.glowTwo} />
        <span className={styles.leafOne} />
        <span className={styles.leafTwo} />
        <span className={styles.leafThree} />
      </div>

      <section className={styles.musicDock} aria-label={isVietnamese ? "Nhạc nền" : "Background music"}>
        <div className={styles.musicControls}>
          <button
            type="button"
            className={musicEnabled ? styles.musicButtonActive : styles.musicButton}
            onClick={toggleMusic}
            aria-pressed={musicEnabled}
            aria-label={musicEnabled
              ? (isVietnamese ? "Tắt nhạc nền" : "Turn background music off")
              : (isVietnamese ? "Bật nhạc nền" : "Turn background music on")}
          >
            <span className={styles.musicIcon} aria-hidden="true">{musicEnabled ? "♫" : "♪"}</span>
            <span>{!musicEnabled
              ? (isVietnamese ? "Nhạc nền đang tắt" : "Music is off")
              : playing
                ? (isVietnamese ? "Đang phát" : "Playing")
                : (isVietnamese ? "Nhạc đã sẵn sàng" : "Music is ready")}</span>
            {musicEnabled && <span className={styles.equalizer} aria-hidden="true"><i /><i /><i /></span>}
          </button>

          {musicEnabled && (
            <button
              type="button"
              className={volumeOpen ? styles.volumeButtonActive : styles.volumeButton}
              aria-expanded={volumeOpen}
              aria-label={isVietnamese ? "Điều chỉnh âm lượng" : "Adjust volume"}
              onClick={() => setVolumeOpen((open) => !open)}
            >
              <span aria-hidden="true">◖</span>
            </button>
          )}
        </div>

        {musicEnabled && volumeOpen && (
          <div className={styles.volumePanel}>
            <label htmlFor="ambient-volume">
              <span>{isVietnamese ? "Âm lượng" : "Volume"}</span>
              <output>{Math.round(volume * 100)}%</output>
            </label>
            <input
              id="ambient-volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
            <p>{isVietnamese
              ? playing
                ? "Nhạc piano êm dịu cùng hòa âm và tiếng chuông ngân nhẹ"
                : "Trình duyệt có thể cần một lần chạm để cho phép tự phát âm thanh"
              : playing
                ? "Gentle piano melody, warm chords, and soft chimes"
                : "Your browser may need one tap to allow background audio"}</p>
          </div>
        )}

        {audioError && <p className={styles.audioError} role="alert">{audioError}</p>}
      </section>
    </>
  );
}
