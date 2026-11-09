"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import styles from "./SiteAmbience.module.css";

type TrackId = "sunny" | "piano" | "musicbox" | "moonlight";

type Track = {
  id: TrackId;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  chords: number[][];
  melodies: number[][];
  rootFrequency: number;
  padLevel: number;
  leadLevel: number;
  leadStyle: "piano" | "bell" | "soft" | "plucky";
  echo: number;
  barDuration?: number;
};

const TRACKS: Record<TrackId, Track> = {
  sunny: {
    id: "sunny",
    title: "Nắng vui mỗi ngày",
    titleEn: "Sunny days",
    description: "Giai điệu tươi sáng, nhịp vui nhẹ nhàng và lạc quan",
    descriptionEn: "Bright, playful melodies with a gentle, happy rhythm",
    rootFrequency: 174.614,
    padLevel: 0.058,
    leadLevel: 0.086,
    leadStyle: "plucky",
    echo: 0.075,
    barDuration: 7.6,
    chords: [
      [0, 4, 7, 11], [7, 11, 14, 17], [9, 12, 16, 19], [5, 9, 12, 16],
      [0, 4, 7, 12], [7, 11, 14, 19], [5, 9, 12, 16], [9, 12, 16, 21],
      [0, 4, 7, 11], [2, 5, 9, 12], [7, 11, 14, 17], [5, 9, 12, 16],
      [9, 12, 16, 19], [5, 9, 12, 16], [0, 4, 7, 11], [0, 4, 7, 12],
    ],
    melodies: [
      [12, 16, 19, 21, 19, 16, 14, 16],
      [7, 11, 14, 16, 14, 11, 9, 11],
      [9, 12, 16, 19, 16, 14, 12, 14],
      [5, 9, 12, 14, 12, 9, 7, 9],
      [16, 19, 21, 24, 21, 19, 16, 14],
      [14, 16, 19, 21, 19, 16, 14, 12],
      [12, 14, 16, 19, 16, 14, 12, 9],
      [7, 9, 11, 14, 16, 14, 11, 9],
      [19, 21, 24, 26, 24, 21, 19, 16],
      [16, 14, 12, 14, 16, 19, 16, 14],
      [9, 12, 14, 16, 19, 16, 14, 12],
      [5, 7, 9, 12, 14, 12, 9, 7],
      [12, 16, 19, 21, 24, 21, 19, 16],
      [14, 12, 9, 12, 14, 16, 19, 16],
      [7, 11, 14, 19, 17, 14, 11, 9],
      [19, 16, 14, 12, 11, 9, 7, 4],
    ],
  },
  piano: {
    id: "piano",
    title: "Piano dịu dàng",
    titleEn: "Gentle piano",
    description: "Piano ấm áp, chậm rãi và giàu cảm xúc",
    descriptionEn: "Warm, slow piano with a tender melody",
    rootFrequency: 130.8128,
    padLevel: 0.073,
    leadLevel: 0.082,
    leadStyle: "piano",
    echo: 0.13,
    chords: [
      [0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17],
      [4, 7, 11, 14], [9, 12, 16, 21], [2, 5, 9, 12], [7, 11, 14, 17],
      [0, 4, 7, 11], [4, 7, 11, 14], [5, 9, 12, 16], [9, 12, 16, 19],
      [2, 5, 9, 12], [7, 11, 14, 17], [0, 4, 7, 11], [0, 2, 4, 7, 11],
    ],
    melodies: [
      [7, 11, 14, 12, 9, 7, 4, 2],
      [4, 7, 11, 14, 16, 14, 11, 9],
      [12, 11, 9, 7, 9, 11, 14, 12],
      [7, 9, 11, 16, 14, 11, 9, 7],
      [16, 14, 12, 11, 9, 7, 4, 7],
      [2, 4, 7, 9, 11, 9, 7, 4],
      [11, 14, 16, 19, 16, 14, 12, 11],
      [9, 12, 14, 16, 14, 12, 11, 9],
      [7, 4, 2, 4, 7, 11, 9, 7],
      [14, 16, 19, 21, 19, 16, 14, 11],
      [4, 9, 11, 14, 12, 11, 7, 4],
      [16, 14, 11, 9, 7, 9, 11, 14],
      [12, 14, 16, 14, 11, 9, 7, 4],
      [7, 11, 12, 16, 19, 16, 14, 12],
      [9, 7, 4, 2, 4, 7, 9, 11],
      [19, 16, 14, 12, 11, 9, 7, 4],
    ],
  },
  musicbox: {
    id: "musicbox",
    title: "Hộp nhạc mơ màng",
    titleEn: "Dreamy music box",
    description: "Tiếng chuông pha lê trong trẻo, lấp lánh",
    descriptionEn: "Delicate, crystal-clear music-box notes",
    rootFrequency: 164.8138,
    padLevel: 0.038,
    leadLevel: 0.061,
    leadStyle: "bell",
    echo: 0.22,
    chords: [
      [0, 4, 7, 12], [9, 12, 16, 21], [5, 9, 12, 16], [7, 11, 14, 19],
      [2, 5, 9, 14], [7, 11, 14, 19], [4, 7, 11, 16], [9, 12, 16, 21],
      [0, 4, 7, 12], [5, 9, 12, 16], [2, 5, 9, 14], [7, 11, 14, 19],
      [4, 7, 11, 16], [9, 12, 16, 21], [5, 9, 12, 16], [0, 4, 7, 12],
    ],
    melodies: [
      [12, 16, 19, 21, 19, 16, 14, 12],
      [7, 12, 16, 19, 16, 14, 12, 9],
      [16, 19, 21, 24, 21, 19, 16, 14],
      [14, 12, 9, 12, 14, 16, 19, 16],
      [19, 16, 14, 12, 14, 16, 21, 19],
      [9, 12, 14, 16, 19, 16, 14, 12],
      [21, 19, 16, 14, 12, 14, 16, 19],
      [12, 14, 16, 21, 19, 16, 14, 12],
      [16, 21, 24, 26, 24, 21, 19, 16],
      [14, 16, 19, 21, 19, 16, 12, 14],
      [7, 9, 12, 16, 14, 12, 9, 7],
      [19, 21, 24, 21, 19, 16, 14, 12],
      [12, 16, 14, 19, 21, 19, 16, 14],
      [9, 14, 16, 19, 16, 14, 12, 9],
      [21, 24, 26, 24, 21, 19, 16, 14],
      [16, 14, 12, 9, 12, 14, 16, 19],
    ],
  },
  moonlight: {
    id: "moonlight",
    title: "Đêm yên bình",
    titleEn: "Quiet moonlight",
    description: "Hòa âm sâu lắng, mềm như một buổi tối yên tĩnh",
    descriptionEn: "Soft, spacious harmonies for a quiet evening",
    rootFrequency: 110,
    padLevel: 0.088,
    leadLevel: 0.043,
    leadStyle: "soft",
    echo: 0.19,
    chords: [
      [0, 3, 7, 10], [8, 12, 15, 19], [5, 8, 12, 15], [10, 14, 17, 21],
      [3, 7, 10, 14], [8, 12, 15, 19], [1, 5, 8, 12], [10, 14, 17, 21],
      [0, 3, 7, 10], [5, 8, 12, 15], [3, 7, 10, 14], [8, 12, 15, 19],
      [1, 5, 8, 12], [10, 14, 17, 21], [5, 8, 12, 15], [0, 3, 7, 10],
    ],
    melodies: [
      [7, 10, 12, 15, 12, 10, 7, 5],
      [3, 7, 10, 12, 10, 8, 7, 3],
      [12, 15, 17, 19, 17, 15, 12, 10],
      [10, 8, 7, 5, 7, 10, 12, 10],
      [15, 12, 10, 8, 7, 8, 10, 12],
      [5, 7, 10, 12, 15, 12, 10, 8],
      [17, 15, 12, 10, 8, 10, 12, 15],
      [7, 10, 12, 17, 15, 12, 10, 7],
      [12, 10, 8, 7, 5, 7, 10, 12],
      [19, 17, 15, 12, 10, 8, 10, 12],
      [8, 10, 12, 15, 17, 15, 12, 10],
      [5, 8, 10, 12, 10, 8, 7, 5],
      [15, 17, 19, 17, 15, 12, 10, 8],
      [10, 12, 15, 17, 15, 12, 10, 7],
      [7, 5, 3, 5, 7, 10, 12, 10],
      [17, 15, 12, 10, 7, 8, 10, 12],
    ],
  },
};

const TRACK_IDS: TrackId[] = ["sunny", "piano", "musicbox", "moonlight"];
const TRACK_STORAGE_KEY = "little-story-world-ambience-track-v2";
const BAR_DURATION = 9.6;
const SONG_BARS = 64;

function frequencyFor(semitones: number, base: number): number {
  return base * 2 ** (semitones / 12);
}

type UnlockHandler = () => void;

export default function SiteAmbience() {
  const { language } = useLanguage();
  const languageRef = useRef(language);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [trackId, setTrackId] = useState<TrackId>("sunny");
  const [volume, setVolume] = useState(0.72);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioError, setAudioError] = useState("");
  const audioRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const schedulerRef = useRef<number | null>(null);
  const unlockHandlerRef = useRef<UnlockHandler | null>(null);
  const startingRef = useRef(false);
  const enabledRef = useRef(true);
  const volumeRef = useRef(volume);
  const trackRef = useRef<TrackId>("sunny");
  const generationRef = useRef(0);

  const isVietnamese = language === "vi";
  const selectedTrack = TRACKS[trackId];

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

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

  const disposeAudio = useCallback(() => {
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
  }, [removeUnlockHandlers]);

  const startMusic = useCallback(async () => {
    if (!enabledRef.current || audioRef.current || startingRef.current) return;

    startingRef.current = true;
    setAudioError("");
    const generation = ++generationRef.current;
    const track = TRACKS[trackRef.current];
    const AudioContextConstructor = window.AudioContext;

    if (!AudioContextConstructor) {
      startingRef.current = false;
      enabledRef.current = false;
      setMusicEnabled(false);
      setAudioError(languageRef.current === "vi"
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
      master.gain.setTargetAtTime(volumeRef.current, context.currentTime, 0.65);

      const warmth = context.createBiquadFilter();
      warmth.type = "lowpass";
      warmth.frequency.setValueAtTime(track.leadStyle === "bell" ? 6200 : track.leadStyle === "plucky" ? 5200 : 3600, context.currentTime);
      warmth.Q.setValueAtTime(0.28, context.currentTime);

      const compressor = context.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, context.currentTime);
      compressor.knee.setValueAtTime(18, context.currentTime);
      compressor.ratio.setValueAtTime(2.6, context.currentTime);
      compressor.attack.setValueAtTime(0.025, context.currentTime);
      compressor.release.setValueAtTime(0.42, context.currentTime);

      master.connect(warmth);
      warmth.connect(compressor);
      compressor.connect(context.destination);

      const echo = context.createDelay(1.6);
      echo.delayTime.value = track.id === "musicbox" ? 0.42 : 0.34;
      const feedback = context.createGain();
      feedback.gain.value = 0.17;
      const echoLevel = context.createGain();
      echoLevel.gain.value = track.echo;
      warmth.connect(echo);
      echo.connect(feedback);
      feedback.connect(echo);
      echo.connect(echoLevel);
      echoLevel.connect(compressor);
      masterGainRef.current = master;

      const playPad = (frequency: number, startAt: number, duration: number, level: number) => {
        if (!context) return;
        const voices = [
          { type: "triangle" as OscillatorType, detune: -4, gain: level * 0.7 },
          { type: "sine" as OscillatorType, detune: 4, gain: level * 0.46 },
        ];
        voices.forEach((voice) => {
          const oscillator = context!.createOscillator();
          const envelope = context!.createGain();
          oscillator.type = voice.type;
          oscillator.frequency.setValueAtTime(frequency, startAt);
          oscillator.detune.setValueAtTime(voice.detune, startAt);
          envelope.gain.setValueAtTime(0.0001, startAt);
          envelope.gain.linearRampToValueAtTime(voice.gain, startAt + (track.id === "moonlight" ? 2.8 : 1.9));
          envelope.gain.setValueAtTime(voice.gain * 0.82, startAt + duration - 1.8);
          envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
          oscillator.connect(envelope);
          envelope.connect(master);
          oscillator.start(startAt);
          oscillator.stop(startAt + duration + 0.05);
          oscillator.onended = () => {
            oscillator.disconnect();
            envelope.disconnect();
          };
        });
      };

      const playLead = (frequency: number, startAt: number, duration: number, level: number, pan: number) => {
        if (!context) return;
        const panner = context.createStereoPanner();
        panner.pan.setValueAtTime(pan, startAt);
        panner.connect(master);

        const primary = context.createOscillator();
        const overtone = context.createOscillator();
        const primaryGain = context.createGain();
        const overtoneGain = context.createGain();

        primary.type = track.leadStyle === "bell" ? "sine" : "triangle";
        overtone.type = track.leadStyle === "bell" ? "triangle" : "sine";
        primary.frequency.setValueAtTime(frequency, startAt);
        overtone.frequency.setValueAtTime(
          frequency * (track.leadStyle === "bell" ? 3.01 : 2.002),
          startAt,
        );

        const attack = track.leadStyle === "soft" ? 0.16 : track.leadStyle === "bell" ? 0.035 : track.leadStyle === "plucky" ? 0.018 : 0.025;
        const tail = track.leadStyle === "bell" ? duration * 0.82 : track.leadStyle === "plucky" ? duration * 0.72 : duration;

        primaryGain.gain.setValueAtTime(0.0001, startAt);
        primaryGain.gain.linearRampToValueAtTime(level, startAt + attack);
        primaryGain.gain.exponentialRampToValueAtTime(0.0001, startAt + tail);
        overtoneGain.gain.setValueAtTime(0.0001, startAt);
        overtoneGain.gain.linearRampToValueAtTime(level * (track.leadStyle === "bell" ? 0.13 : track.leadStyle === "plucky" ? 0.12 : 0.2), startAt + attack);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration * 0.56);

        primary.connect(primaryGain);
        overtone.connect(overtoneGain);
        primaryGain.connect(panner);
        overtoneGain.connect(panner);
        primary.start(startAt);
        overtone.start(startAt);
        primary.stop(startAt + duration + 0.04);
        overtone.stop(startAt + duration * 0.6);
        primary.onended = () => {
          primary.disconnect();
          primaryGain.disconnect();
          panner.disconnect();
        };
        overtone.onended = () => {
          overtone.disconnect();
          overtoneGain.disconnect();
        };
      };

      let schedulerStarted = false;
      const startScheduler = () => {
        if (schedulerStarted || !context || context.state !== "running") return;
        schedulerStarted = true;
        let nextBlockAt = context.currentTime + 0.18;
        let blockIndex = 0;
        const barDuration = track.barDuration ?? BAR_DURATION;

        const scheduleBlock = (startAt: number, absoluteIndex: number) => {
          const cycle = Math.floor(absoluteIndex / SONG_BARS);
          const bar = absoluteIndex % SONG_BARS;
          const section = Math.floor(bar / 16);
          const progressionIndex = (bar + section * 3 + cycle * 5) % track.chords.length;
          const phraseIndex = (bar * 7 + section * 5 + cycle * 3) % track.melodies.length;
          const keyShift = [0, 2, -2, 1][cycle % 4];
          const chord = track.chords[progressionIndex];
          const phrase = track.melodies[phraseIndex];

          chord.forEach((note, voiceIndex) => {
            const octave = voiceIndex === chord.length - 1 ? 12 : 0;
            const level = voiceIndex === 0
              ? track.padLevel
              : voiceIndex === chord.length - 1
                ? track.padLevel * 0.46
                : track.padLevel * 0.72;
            playPad(
              frequencyFor(note + octave + keyShift, track.rootFrequency),
              startAt,
              barDuration + 0.55,
              level,
            );
          });

          phrase.forEach((note, noteIndex) => {
            const octave = noteIndex === 7 && section % 2 === 1 ? 12 : 0;
            const pan = Math.sin((noteIndex + section * 1.7) * 0.72) * 0.28;
            const noteTime = startAt + 0.38 + noteIndex * (barDuration / 8);
            const duration = noteIndex === 7 ? (track.leadStyle === "plucky" ? 1.9 : 2.4) : track.leadStyle === "bell" ? 1.75 : track.leadStyle === "plucky" ? 1.32 : 1.62;
            playLead(
              frequencyFor(note + octave + keyShift, track.rootFrequency),
              noteTime,
              duration,
              track.leadLevel * (noteIndex === 7 ? 1.08 : 1),
              pan,
            );
          });

          if (track.id === "musicbox") {
            const sparkle = [chord[1] + 12, chord[2] + 19];
            sparkle.forEach((note, index) => {
              playLead(
                frequencyFor(note + keyShift, track.rootFrequency),
                startAt + 4.25 + index * 1.55,
                2.15,
                track.leadLevel * 0.46,
                index === 0 ? -0.42 : 0.42,
              );
            });
          }
        };

        const scheduleAhead = () => {
          if (!context || context.state !== "running" || !enabledRef.current) return;
          if (nextBlockAt < context.currentTime - barDuration) {
            const skipped = Math.floor((context.currentTime - nextBlockAt) / barDuration);
            nextBlockAt += skipped * barDuration;
            blockIndex += skipped;
          }
          while (nextBlockAt < context.currentTime + barDuration * 2) {
            scheduleBlock(nextBlockAt, blockIndex);
            nextBlockAt += barDuration;
            blockIndex += 1;
          }
        };

        scheduleAhead();
        schedulerRef.current = window.setInterval(scheduleAhead, 700);
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
      setAudioError(languageRef.current === "vi"
        ? "Chưa bật được nhạc. Anh thử nhấn nút phát lại nhé."
        : "Music could not start. Please press play and try again.");
    } finally {
      if (generationRef.current === generation) startingRef.current = false;
    }
  }, [removeUnlockHandlers]);

  const stopMusic = useCallback(() => {
    enabledRef.current = false;
    disposeAudio();
    setMusicEnabled(false);
    setPlaying(false);
  }, [disposeAudio]);

  const toggleMusic = () => {
    if (enabledRef.current) {
      stopMusic();
      return;
    }
    enabledRef.current = true;
    setMusicEnabled(true);
    setPlaying(false);
    void startMusic();
  };

  const changeTrack = (nextTrack: TrackId) => {
    if (nextTrack === trackRef.current) {
      setSettingsOpen(false);
      return;
    }
    trackRef.current = nextTrack;
    setTrackId(nextTrack);
    setAudioError("");
    try {
      window.localStorage.setItem(TRACK_STORAGE_KEY, nextTrack);
    } catch {
      // Track selection still works for this visit if storage is unavailable.
    }
    if (enabledRef.current) {
      disposeAudio();
      setPlaying(false);
      void startMusic();
    }
  };

  useEffect(() => {
    const startTimer = window.setTimeout(() => {
      try {
        const storedTrack = window.localStorage.getItem(TRACK_STORAGE_KEY);
        if (storedTrack && TRACK_IDS.includes(storedTrack as TrackId)) {
          trackRef.current = storedTrack as TrackId;
          setTrackId(storedTrack as TrackId);
        }
      } catch {
        // The default piano track remains available when storage is blocked.
      }
      enabledRef.current = true;
      void startMusic();
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      enabledRef.current = false;
      disposeAudio();
    };
  }, [disposeAudio, startMusic]);

  return (
    <>
      <div className={styles.atmosphere} aria-hidden="true">
        <span className={styles.glowOne} />
        <span className={styles.glowTwo} />
        <span className={styles.leafOne} />
        <span className={styles.leafTwo} />
        <span className={styles.leafThree} />
      </div>

      <section className={styles.musicDock} aria-label={isVietnamese ? "Điều khiển nhạc nền" : "Background music controls"}>
        <div className={styles.musicControls}>
          <button
            type="button"
            className={musicEnabled ? styles.musicToggleActive : styles.musicToggleOff}
            onClick={toggleMusic}
            aria-pressed={musicEnabled}
            aria-label={musicEnabled
              ? (isVietnamese ? "Tắt nhạc nền" : "Turn background music off")
              : (isVietnamese ? "Bật nhạc nền" : "Turn background music on")}
          >
            <span className={styles.musicToggleIcon} aria-hidden="true">{musicEnabled ? "♫" : "♪"}</span>
            <span className={styles.musicToggleLabels}>
              <strong>{isVietnamese ? "Nhạc nền" : "Background music"}</strong>
              <small>{!musicEnabled
                ? (isVietnamese ? "Đang tắt" : "Off")
                : playing
                  ? (isVietnamese ? "Đang phát" : "Playing")
                  : (isVietnamese ? "Chờ thao tác trình duyệt" : "Waiting for browser")}</small>
            </span>
            {musicEnabled && <span className={styles.equalizer} aria-hidden="true"><i /><i /><i /></span>}
          </button>
          <button
            type="button"
            className={styles.musicChoiceButton}
            onClick={() => setSettingsOpen((open) => !open)}
            aria-expanded={settingsOpen}
            aria-label={isVietnamese ? "Chọn nhạc nền" : "Choose background music"}
          >
            <span aria-hidden="true">♫</span>
            <span>{isVietnamese ? selectedTrack.title : selectedTrack.titleEn}</span>
            <span className={styles.choiceChevron} aria-hidden="true">{settingsOpen ? "⌃" : "⌄"}</span>
          </button>
        </div>

        {settingsOpen && (
          <div className={styles.musicPanel}>
            <div className={styles.musicPanelHeading}>
              <div>
                <strong>{isVietnamese ? "Chọn không gian âm nhạc" : "Choose your sound"}</strong>
                <p>{isVietnamese ? "Mỗi bản nhạc có giai điệu và màu âm riêng." : "Each selection has its own evolving melody and tone."}</p>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} aria-label={isVietnamese ? "Đóng" : "Close"}>×</button>
            </div>

            <div className={styles.trackOptions}>
              {TRACK_IDS.map((id) => {
                const track = TRACKS[id];
                const active = trackId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={active ? styles.trackOptionActive : styles.trackOption}
                    aria-pressed={active}
                    onClick={() => changeTrack(id)}
                  >
                    <span className={styles.trackOptionIcon} aria-hidden="true">{id === "sunny" ? "☀" : id === "piano" ? "♬" : id === "musicbox" ? "✧" : "☾"}</span>
                    <span className={styles.trackOptionText}>
                      <strong>{isVietnamese ? track.title : track.titleEn}</strong>
                      <small>{isVietnamese ? track.description : track.descriptionEn}</small>
                    </span>
                    {active && <span className={styles.trackCheck} aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>

            <div className={styles.musicVolume}>
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
                ? "Giai điệu được phát triển qua nhiều đoạn, thay đổi hòa âm và biến tấu để nghe lâu không bị lặp ngắn."
                : "Long-form melodies evolve through changing harmonies and variations instead of a short repeating loop."}</p>
            </div>
            {audioError && <p className={styles.audioError} role="alert">{audioError}</p>}
          </div>
        )}
      </section>
    </>
  );
}
