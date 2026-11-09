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

const MELODY = [7, 11, 12, 11, 7] as const;
const CHORD_DURATION = 8;
const ROOT_FREQUENCY = 130.8128;

function frequencyFor(semitones: number, base = ROOT_FREQUENCY): number {
  return base * 2 ** (semitones / 12);
}

export default function SiteAmbience() {
  const { language } = useLanguage();
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.24);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [audioError, setAudioError] = useState("");
  const audioRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const schedulerRef = useRef<number | null>(null);

  const stopMusic = useCallback(() => {
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

    setPlaying(false);
  }, []);

  useEffect(() => {
    const gain = masterGainRef.current;
    const context = audioRef.current;
    if (!gain || !context || context.state === "closed") return;
    gain.gain.setTargetAtTime(volume, context.currentTime, 0.24);
  }, [volume]);

  useEffect(() => () => {
    if (schedulerRef.current !== null) {
      window.clearInterval(schedulerRef.current);
    }
    const context = audioRef.current;
    audioRef.current = null;
    if (context && context.state !== "closed") {
      void context.close().catch(() => undefined);
    }
  }, []);

  const startMusic = useCallback(async () => {
    if (audioRef.current) return;
    setAudioError("");

    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) {
      setAudioError(language === "vi"
        ? "Trình duyệt này chưa hỗ trợ nhạc nền."
        : "This browser does not support background music.");
      return;
    }

    let context: AudioContext | null = null;

    try {
      context = new AudioContextConstructor();
      await context.resume();

      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, context.currentTime);
      master.gain.setTargetAtTime(volume, context.currentTime, 0.9);

      const lowPass = context.createBiquadFilter();
      lowPass.type = "lowpass";
      lowPass.frequency.setValueAtTime(2600, context.currentTime);
      lowPass.Q.setValueAtTime(0.45, context.currentTime);

      const dryOutput = context.createGain();
      dryOutput.gain.value = 0.92;
      master.connect(lowPass);
      lowPass.connect(dryOutput);
      dryOutput.connect(context.destination);

      const echo = context.createDelay(1.2);
      echo.delayTime.value = 0.36;
      const feedback = context.createGain();
      feedback.gain.value = 0.2;
      const echoOutput = context.createGain();
      echoOutput.gain.value = 0.14;
      lowPass.connect(echo);
      echo.connect(feedback);
      feedback.connect(echo);
      echo.connect(echoOutput);
      echoOutput.connect(context.destination);

      const playPad = (frequency: number, startAt: number, duration: number, level: number) => {
        if (!context) return;
        const oscillator = context.createOscillator();
        const voiceGain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, startAt);
        voiceGain.gain.setValueAtTime(0.0001, startAt);
        voiceGain.gain.linearRampToValueAtTime(level, startAt + 1.7);
        voiceGain.gain.setValueAtTime(level * 0.82, startAt + duration - 1.5);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        oscillator.connect(voiceGain);
        voiceGain.connect(master);
        oscillator.start(startAt);
        oscillator.stop(startAt + duration + 0.04);
        oscillator.onended = () => {
          oscillator.disconnect();
          voiceGain.disconnect();
        };
      };

      const playBell = (frequency: number, startAt: number) => {
        if (!context) return;
        const oscillator = context.createOscillator();
        const overtone = context.createOscillator();
        const voiceGain = context.createGain();
        const overtoneGain = context.createGain();

        oscillator.type = "sine";
        overtone.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, startAt);
        overtone.frequency.setValueAtTime(frequency * 2.01, startAt);
        voiceGain.gain.setValueAtTime(0.0001, startAt);
        voiceGain.gain.linearRampToValueAtTime(0.052, startAt + 0.025);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 1.32);
        overtoneGain.gain.setValueAtTime(0.0001, startAt);
        overtoneGain.gain.linearRampToValueAtTime(0.013, startAt + 0.02);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.72);

        oscillator.connect(voiceGain);
        overtone.connect(overtoneGain);
        voiceGain.connect(master);
        overtoneGain.connect(master);
        oscillator.start(startAt);
        overtone.start(startAt);
        oscillator.stop(startAt + 1.36);
        overtone.stop(startAt + 0.76);
        oscillator.onended = () => {
          oscillator.disconnect();
          voiceGain.disconnect();
        };
        overtone.onended = () => {
          overtone.disconnect();
          overtoneGain.disconnect();
        };
      };

      const scheduleBlock = (startAt: number, chordIndex: number) => {
        const chord = CHORDS[chordIndex % CHORDS.length];
        chord.forEach((note, index) => {
          const octave = index === 0 ? 0 : index === 3 ? 12 : 0;
          const level = index === 0 ? 0.105 : index === 3 ? 0.035 : 0.07;
          playPad(frequencyFor(note + octave), startAt, CHORD_DURATION + 0.35, level);
        });

        MELODY.forEach((note, index) => {
          const melodyFrequency = frequencyFor(chord[0] + note + (index === 2 ? 12 : 0), 261.6256);
          playBell(melodyFrequency, startAt + 0.75 + index * 1.42);
        });
      };

      audioRef.current = context;
      masterGainRef.current = master;

      let nextBlockAt = context.currentTime + 0.12;
      let chordIndex = 0;
      const scheduleAhead = () => {
        if (!context || context.state !== "running") return;
        while (nextBlockAt < context.currentTime + 10) {
          scheduleBlock(nextBlockAt, chordIndex);
          nextBlockAt += CHORD_DURATION;
          chordIndex = (chordIndex + 1) % CHORDS.length;
        }
      };

      scheduleAhead();
      schedulerRef.current = window.setInterval(scheduleAhead, 700);
      setPlaying(true);
      setVolumeOpen(true);
    } catch (error) {
      console.error("Start ambient music failed:", error);
      if (context && context.state !== "closed") {
        void context.close().catch(() => undefined);
      }
      audioRef.current = null;
      masterGainRef.current = null;
      setAudioError(language === "vi"
        ? "Chưa bật được nhạc. Anh thử bấm lại nhé."
        : "Music could not start. Please try again.");
    }
  }, [language, volume]);

  const toggleMusic = () => {
    if (playing) {
      stopMusic();
      setVolumeOpen(false);
      return;
    }
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
            className={playing ? styles.musicButtonActive : styles.musicButton}
            onClick={toggleMusic}
            aria-pressed={playing}
            aria-label={playing
              ? (isVietnamese ? "Tắt nhạc nền" : "Turn background music off")
              : (isVietnamese ? "Bật nhạc nền" : "Turn background music on")}
          >
            <span className={styles.musicIcon} aria-hidden="true">{playing ? "♫" : "♪"}</span>
            <span>{playing
              ? (isVietnamese ? "Đang phát" : "Playing")
              : (isVietnamese ? "Nhạc nền" : "Ambient music")}</span>
            {playing && <span className={styles.equalizer} aria-hidden="true"><i /><i /><i /></span>}
          </button>

          {playing && (
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

        {playing && volumeOpen && (
          <div className={styles.volumePanel}>
            <label htmlFor="ambient-volume">
              <span>{isVietnamese ? "Âm lượng" : "Volume"}</span>
              <output>{Math.round(volume * 100)}%</output>
            </label>
            <input
              id="ambient-volume"
              type="range"
              min="0"
              max="0.65"
              step="0.01"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
            <p>{isVietnamese ? "Giai điệu chuông gió và âm thanh thiên nhiên dịu nhẹ" : "Soft wind chimes and nature ambience"}</p>
          </div>
        )}

        {audioError && <p className={styles.audioError} role="alert">{audioError}</p>}
      </section>
    </>
  );
}
