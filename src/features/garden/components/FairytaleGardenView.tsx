"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useReducedMotion } from "motion/react";
import type { GardenItem, TimeOfDay, WindLevel } from "@/types/garden";
import type { FlowerKind } from "@/types/flower";
import Flower from "@/features/flowers/components/Flower";
import { useElementWidth } from "../hooks/useElementWidth";
import styles from "../styles/FairytaleGardenView.module.css";

type Weather = "clear" | "cloudy" | "rain" | "snow";
type Season = "spring" | "summer" | "autumn" | "winter";
type PlacedKind = FlowerKind | "lantern" | "mushroom" | "stone" | "herb";
type PlacedDecoration = { id: string; kind: PlacedKind; x: number; y: number };
type MusicMood = "bells" | "piano" | "lullaby";

export type GardenSave = {
  version: 1;
  weather: Weather;
  season: Season;
  decorations: PlacedDecoration[];
  moisture: number;
  wateredCount: number;
  discoveries: string[];
  cinematicLighting: boolean;
  ecologyEnabled: boolean;
  musicVolume: number;
  musicMood: MusicMood;
  time: TimeOfDay;
  wind: WindLevel;
};

type Props = {
  gardenId: string;
  items: GardenItem[];
  readIds: string[];
  onOpenChapter: (chapterId: string) => void;
  viewerMode?: boolean;
  initialSettings?: Partial<GardenSave>;
};

const TREES = [
  { left: "-5%", width: 190, height: 270 },
  { left: "7%", width: 154, height: 220 },
  { left: "22%", width: 138, height: 196 },
  { left: "39%", width: 172, height: 242 },
  { left: "62%", width: 150, height: 214 },
  { left: "78%", width: 186, height: 262 },
  { left: "91%", width: 150, height: 220 },
];

function pseudoRandom(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

const STARS = Array.from({ length: 18 }, (_, index) => ({
  left: 3 + pseudoRandom(index, 1) * 94,
  top: 4 + pseudoRandom(index, 2) * 43,
  size: 1.5 + pseudoRandom(index, 3) * 2.5,
  delay: pseudoRandom(index, 4) * 4,
}));

const FIREFLIES = Array.from({ length: 9 }, (_, index) => ({
  left: 5 + pseudoRandom(index, 5) * 90,
  top: 35 + pseudoRandom(index, 6) * 48,
  delay: pseudoRandom(index, 7) * 5,
  duration: 3.5 + pseudoRandom(index, 8) * 3.5,
}));

const STONES = Array.from({ length: 7 }, (_, index) => ({
  left: 43 + Math.sin(index * 0.72) * 8,
  bottom: 5 + index * 7,
  width: 26 + pseudoRandom(index, 9) * 20,
  rotation: -10 + pseudoRandom(index, 10) * 20,
}));

const CLOUDS = Array.from({ length: 3 }, (_, index) => ({
  left: 4 + pseudoRandom(index, 21) * 72,
  top: 10 + pseudoRandom(index, 22) * 26,
  width: 92 + pseudoRandom(index, 23) * 88,
  duration: 54 + pseudoRandom(index, 24) * 38,
  delay: -pseudoRandom(index, 25) * 42,
}));

const PETALS = Array.from({ length: 7 }, (_, index) => ({
  left: 8 + pseudoRandom(index, 26) * 84,
  top: 22 + pseudoRandom(index, 27) * 48,
  size: 5 + pseudoRandom(index, 28) * 5,
  duration: 13 + pseudoRandom(index, 29) * 10,
  delay: -pseudoRandom(index, 30) * 18,
  rotation: -35 + pseudoRandom(index, 31) * 70,
  color: ["#f3e2c3", "#f7ebd7", "#e7d9be", "#f0cda5"][index % 4],
}));

const POLLEN = Array.from({ length: 7 }, (_, index) => ({
  left: 4 + pseudoRandom(index, 32) * 92,
  top: 30 + pseudoRandom(index, 33) * 54,
  size: 1.5 + pseudoRandom(index, 34) * 2.2,
  duration: 8 + pseudoRandom(index, 35) * 8,
  delay: -pseudoRandom(index, 36) * 12,
}));

const GRASS = Array.from({ length: 22 }, (_, index) => ({
  left: 2 + pseudoRandom(index, 37) * 96,
  height: 12 + pseudoRandom(index, 38) * 28,
  width: 2 + pseudoRandom(index, 39) * 2.2,
  tilt: -24 + pseudoRandom(index, 40) * 48,
  delay: pseudoRandom(index, 41) * 2.5,
}));

const RAIN_DROPS = Array.from({ length: 28 }, (_, index) => ({
  left: 2 + pseudoRandom(index, 51) * 96,
  delay: -pseudoRandom(index, 52) * 2.8,
  duration: 0.9 + pseudoRandom(index, 53) * 0.8,
  length: 10 + pseudoRandom(index, 54) * 10,
}));

const SNOW_FLAKES = Array.from({ length: 22 }, (_, index) => ({
  left: 2 + pseudoRandom(index, 61) * 96,
  delay: -pseudoRandom(index, 62) * 12,
  duration: 7 + pseudoRandom(index, 63) * 8,
  size: 2 + pseudoRandom(index, 64) * 4,
}));

const AUTUMN_LEAVES = Array.from({ length: 14 }, (_, index) => ({
  left: 4 + pseudoRandom(index, 71) * 92,
  delay: -pseudoRandom(index, 72) * 15,
  duration: 9 + pseudoRandom(index, 73) * 10,
  size: 7 + pseudoRandom(index, 74) * 8,
  rotation: -30 + pseudoRandom(index, 75) * 60,
}));

const BIRDS = [
  { left: 13, top: 25, delay: -7, duration: 26 },
  { left: 55, top: 17, delay: -16, duration: 32 },
  { left: 76, top: 32, delay: -21, duration: 29 },
];

const WEATHER_OPTIONS: Array<{ value: Weather; label: string; icon: string }> = [
  { value: "clear", label: "Nắng nhẹ", icon: "☀" },
  { value: "cloudy", label: "Nhiều mây", icon: "☁" },
  { value: "rain", label: "Mưa dịu", icon: "雨" },
  { value: "snow", label: "Tuyết", icon: "❄" },
];

const SEASON_OPTIONS: Array<{ value: Season; label: string; icon: string }> = [
  { value: "spring", label: "Xuân", icon: "🌱" },
  { value: "summer", label: "Hạ", icon: "☀" },
  { value: "autumn", label: "Thu", icon: "🍂" },
  { value: "winter", label: "Đông", icon: "❄" },
];

const DECORATION_OPTIONS: Array<{ value: PlacedKind; label: string; icon: string }> = [
  { value: "daisy", label: "Hoa cúc", icon: "🌼" },
  { value: "tulip", label: "Tulip", icon: "🌷" },
  { value: "sunflower", label: "Hướng dương", icon: "🌻" },
  { value: "lantern", label: "Đèn lồng", icon: "🏮" },
  { value: "mushroom", label: "Nấm nhỏ", icon: "🍄" },
  { value: "stone", label: "Đá cuội", icon: "◒" },
  { value: "herb", label: "Bụi lá", icon: "🌿" },
];

const ACHIEVEMENTS = [
  { id: "first-water", icon: "💧", name: "Giọt sương đầu tiên", hint: "Tưới nước cho khu vườn" },
  { id: "green-thumb", icon: "🌱", name: "Bàn tay xanh", hint: "Chăm sóc hoa ba lần" },
  { id: "garden-designer", icon: "🪴", name: "Người làm vườn", hint: "Đặt món trang trí đầu tiên" },
  { id: "secret-seed", icon: "✦", name: "Hạt giống bí mật", hint: "Tìm thấy điều bất ngờ" },
  { id: "weather-watcher", icon: "🌦", name: "Người ngắm trời", hint: "Thử thay đổi thời tiết" },
  { id: "season-watcher", icon: "🍁", name: "Bốn mùa", hint: "Khám phá các mùa" },
  { id: "pond-listener", icon: "〰", name: "Người nghe hồ", hint: "Chạm vào mặt nước" },
  { id: "music-listener", icon: "♫", name: "Khoảng lặng", hint: "Bật nhạc khu vườn" },
  { id: "garden-curator", icon: "✧", name: "Người kể chuyện", hint: "Bắt đầu chế độ trình diễn" },
];

const FLOWER_COLORS: Partial<Record<FlowerKind, string>> = {
  daisy: "#e9dfc8",
  tulip: "#c58c78",
  sunflower: "#d4b56f",
  rose: "#c99a91",
  lavender: "#a79aaf",
  cherry: "#e0c5bd",
  lotus: "#d8b9a3",
  dandelion: "#d6bd79",
};

function isWeather(value: unknown): value is Weather {
  return value === "clear" || value === "cloudy" || value === "rain" || value === "snow";
}

function isSeason(value: unknown): value is Season {
  return value === "spring" || value === "summer" || value === "autumn" || value === "winter";
}

function isPlacedDecoration(value: unknown): value is PlacedDecoration {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  const validKind = typeof item.kind === "string" &&
    ["daisy", "tulip", "sunflower", "rose", "lavender", "cherry", "lotus", "dandelion", "lantern", "mushroom", "stone", "herb"].includes(item.kind);
  return typeof item.id === "string" && validKind &&
    typeof item.x === "number" && Number.isFinite(item.x) && item.x >= 0 && item.x <= 100 &&
    typeof item.y === "number" && Number.isFinite(item.y) && item.y >= 0 && item.y <= 100;
}

function isFlowerKind(kind: PlacedKind): kind is FlowerKind {
  return Object.prototype.hasOwnProperty.call(FLOWER_COLORS, kind);
}

export default function FairytaleGardenView({ gardenId, items, readIds, onOpenChapter, viewerMode = false, initialSettings }: Props) {
  const [time, setTime] = useState<TimeOfDay>(initialSettings?.time ?? "day");
  const [wind, setWind] = useState<WindLevel>(initialSettings?.wind ?? "breeze");
  const [weather, setWeather] = useState<Weather>(initialSettings?.weather ?? "clear");
  const [season, setSeason] = useState<Season>(initialSettings?.season ?? "spring");
  const [decorations, setDecorations] = useState<PlacedDecoration[]>(initialSettings?.decorations ?? []);
  const [moisture, setMoisture] = useState(initialSettings?.moisture ?? 58);
  const [wateredCount, setWateredCount] = useState(initialSettings?.wateredCount ?? 0);
  const [discoveries, setDiscoveries] = useState<string[]>(initialSettings?.discoveries ?? []);
  const [cinematicLighting, setCinematicLighting] = useState(initialSettings?.cinematicLighting ?? true);
  const [ecologyEnabled, setEcologyEnabled] = useState(initialSettings?.ecologyEnabled ?? true);
  const [editMode, setEditMode] = useState(false);
  const [selectedDecoration, setSelectedDecoration] = useState<PlacedKind>("daisy");
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [bloomCycle, setBloomCycle] = useState(0);
  const [waterFlash, setWaterFlash] = useState(false);
  const [pondRipple, setPondRipple] = useState(0);
  const [presentation, setPresentation] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [notice, setNotice] = useState("");
  const [saveReady, setSaveReady] = useState(false);

  const reduceMotion = useReducedMotion();
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const toastTimerRef = useRef<number | null>(null);
  const waterTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicTimerRef = useRef<number | null>(null);
  const draggingRef = useRef<string | null>(null);
  const decorationIdRef = useRef(0);
  const skipSceneClickRef = useRef(false);

  const scale = width > 0 ? Math.min(1, Math.max(0.5, width / 860)) : 1;
  const chapters = items.filter((item) => Boolean(item.chapterId));
  const decorationsFromStory = items.filter((item) => !item.chapterId);
  const tourChapter = chapters.length > 0 ? chapters[tourIndex % chapters.length] : null;
  const compact = scale < 0.75;
  const unlockedAchievements = ACHIEVEMENTS.filter((achievement) => discoveries.includes(achievement.id));

  const notify = (message: string) => {
    setNotice(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setNotice(""), 3000);
  };

  const unlock = (id: string) => {
    setDiscoveries((current) => current.includes(id) ? current : [...current, id]);
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (viewerMode) {
      setSaveReady(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem("lfw:vanilla-garden:v1:" + gardenId);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<GardenSave>;
        if (saved.version === 1) {
          if (isWeather(saved.weather)) setWeather(saved.weather);
          if (isSeason(saved.season)) setSeason(saved.season);
          if (saved.time === "day" || saved.time === "night") setTime(saved.time);
          if (saved.wind === "calm" || saved.wind === "breeze" || saved.wind === "strong") setWind(saved.wind);
          if (Array.isArray(saved.decorations)) {
            const restored = saved.decorations.filter(isPlacedDecoration).slice(0, 80);
            setDecorations(restored);
            decorationIdRef.current = restored.reduce((maximum, item) => {
              if (!item.id.startsWith("placed-")) return maximum;
              const suffix = Number(item.id.slice("placed-".length));
              return Number.isInteger(suffix) ? Math.max(maximum, suffix + 1) : maximum;
            }, 0);
          }
          if (typeof saved.moisture === "number" && Number.isFinite(saved.moisture)) setMoisture(Math.max(0, Math.min(100, saved.moisture)));
          if (typeof saved.wateredCount === "number" && Number.isFinite(saved.wateredCount)) setWateredCount(Math.max(0, saved.wateredCount));
          if (Array.isArray(saved.discoveries)) setDiscoveries(saved.discoveries.filter((value): value is string => typeof value === "string" && ACHIEVEMENTS.some((item) => item.id === value)));
          if (typeof saved.cinematicLighting === "boolean") setCinematicLighting(saved.cinematicLighting);
          if (typeof saved.ecologyEnabled === "boolean") setEcologyEnabled(saved.ecologyEnabled);
        }
      }
    } catch (error) {
      console.warn("Could not read local garden customisation:", error);
    } finally {
      setSaveReady(true);
    }
  }, [gardenId, viewerMode]);

  useEffect(() => {
    if (!saveReady || viewerMode) return;
    const save: GardenSave = {
      version: 1,
      weather,
      season,
      decorations,
      moisture,
      wateredCount,
      discoveries,
      cinematicLighting,
      ecologyEnabled,
      musicVolume: initialSettings?.musicVolume ?? 0.55,
      musicMood: initialSettings?.musicMood ?? "bells",
      time,
      wind,
    };
    try {
      window.localStorage.setItem("lfw:vanilla-garden:v1:" + gardenId, JSON.stringify(save));
    } catch (error) {
      console.warn("Could not save local garden customisation:", error);
    }
  }, [gardenId, saveReady, viewerMode, weather, season, decorations, moisture, wateredCount, discoveries, cinematicLighting, ecologyEnabled, time, wind, initialSettings?.musicVolume, initialSettings?.musicMood]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!presentation || chapters.length === 0) return;
    const timer = window.setInterval(() => {
      setTourIndex((current) => (current + 1) % chapters.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [presentation, chapters.length]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      if (waterTimerRef.current !== null) window.clearTimeout(waterTimerRef.current);
      if (musicTimerRef.current !== null) window.clearInterval(musicTimerRef.current);
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context && context.state !== "closed") void context.close();
    };
  }, []);

  const sceneStyle = {
    "--scene-scale": scale,
    "--sway-duration": wind === "calm" ? "7s" : wind === "strong" ? "2.8s" : "4.5s",
    "--firefly-duration": wind === "calm" ? "7s" : wind === "strong" ? "3s" : "5s",
    "--sway-angle": wind === "calm" ? "1deg" : wind === "strong" ? "4.2deg" : "2.2deg",
    "--tree-sway-angle": wind === "calm" ? "0.25deg" : wind === "strong" ? "1.1deg" : "0.55deg",
    "--flower-sway-angle": wind === "calm" ? "0.65deg" : wind === "strong" ? "2.8deg" : "1.45deg",
    "--petal-duration": wind === "calm" ? "22s" : wind === "strong" ? "9s" : "15s",
    "--particle-drift": wind === "calm" ? "18px" : wind === "strong" ? "105px" : "54px",
    "--garden-moisture": String(moisture / 100),
  } as CSSProperties;

  const sceneClass = [
    styles.realm,
    time === "day" ? styles.day : styles.night,
    weather === "rain" ? styles.weatherRain : "",
    weather === "snow" ? styles.weatherSnow : "",
    weather === "cloudy" ? styles.weatherCloudy : "",
    season === "spring" ? styles.seasonSpring : "",
    season === "summer" ? styles.seasonSummer : "",
    season === "autumn" ? styles.seasonAutumn : "",
    season === "winter" ? styles.seasonWinter : "",
    cinematicLighting ? styles.cinematicLighting : styles.lightingOff,
    ecologyEnabled ? "" : styles.ecologyOff,
    moisture >= 76 ? styles.wellWatered : "",
    presentation ? styles.presentation : "",
    editMode ? styles.editing : "",
    reduceMotion ? styles.still : "",
  ].filter(Boolean).join(" ");

  function handleSceneClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (skipSceneClickRef.current) {
      skipSceneClickRef.current = false;
      return;
    }
    if (!editMode) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(4, Math.min(92, ((bounds.bottom - event.clientY) / bounds.height) * 100));
    const decoration: PlacedDecoration = {
      id: "placed-" + String(decorationIdRef.current++),
      kind: selectedDecoration,
      x,
      y,
    };
    setDecorations((current) => [...current, decoration].slice(-80));
    unlock("garden-designer");
    notify("Đã thêm " + DECORATION_OPTIONS.find((option) => option.value === selectedDecoration)?.label.toLowerCase() + " vào khu vườn.");
  }

  function moveDecoration(event: ReactPointerEvent<HTMLDivElement>, id: string) {
    if (!editMode || draggingRef.current !== id) return;
    event.preventDefault();
    event.stopPropagation();
    const scene = ref.current;
    if (!scene) return;
    const bounds = scene.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(4, Math.min(92, ((bounds.bottom - event.clientY) / bounds.height) * 100));
    setDecorations((current) => current.map((item) => item.id === id ? { ...item, x, y } : item));
    draggingRef.current = null;
    skipSceneClickRef.current = true;
  }

  function startMusic() {
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) {
      notify("Trình duyệt này chưa hỗ trợ âm thanh khu vườn.");
      return;
    }

    try {
      const context = new AudioContextConstructor();
      audioContextRef.current = context;
      const master = context.createGain();
      master.gain.value = Math.max(0, Math.min(1, initialSettings?.musicVolume ?? 0.55));
      master.connect(context.destination);

      const musicMood = initialSettings?.musicMood ?? "bells";
      const bassNotes = musicMood === "piano" ? [130.81, 196, 261.63] : musicMood === "lullaby" ? [98, 146.83, 196] : [110, 164.81, 220];
      bassNotes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const volume = context.createGain();
        oscillator.type = musicMood === "piano" ? "triangle" : index === 0 ? "sine" : "triangle";
        oscillator.frequency.value = frequency;
        volume.gain.value = [0.014, 0.009, 0.006][index];
        oscillator.connect(volume);
        volume.connect(master);
        oscillator.start();
      });

      const notes = musicMood === "piano"
        ? [261.63, 392, 329.63, 440, 392, 349.23, 293.66, 329.63]
        : musicMood === "lullaby"
          ? [392, 440, 523.25, 440, 392, 349.23, 329.63, 293.66]
          : [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 392];
      let noteIndex = 0;
      const playBell = () => {
        if (context.state === "closed") return;
        const now = context.currentTime;
        const oscillator = context.createOscillator();
        const volume = context.createGain();
        oscillator.type = musicMood === "piano" ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(notes[noteIndex % notes.length], now);
        noteIndex += 1;
        volume.gain.setValueAtTime(0.0001, now);
        volume.gain.exponentialRampToValueAtTime(musicMood === "piano" ? 0.015 : 0.022, now + 0.22);
        volume.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
        oscillator.connect(volume);
        volume.connect(master);
        oscillator.start(now);
        oscillator.stop(now + 2.9);
      };

      void context.resume().catch(() => {
        setMusicEnabled(false);
        notify("Trình duyệt chưa cho phép phát âm thanh.");
      });
      playBell();
      musicTimerRef.current = window.setInterval(playBell, musicMood === "lullaby" ? 4400 : 3600);
      setMusicEnabled(true);
      unlock("music-listener");
      notify("Giai điệu ambient Vanilla Garden đang phát.");
    } catch {
      audioContextRef.current = null;
      setMusicEnabled(false);
      notify("Chưa thể khởi tạo âm thanh trên thiết bị này.");
    }
  }

  function toggleMusic() {
    if (audioContextRef.current) {
      if (musicTimerRef.current !== null) window.clearInterval(musicTimerRef.current);
      musicTimerRef.current = null;
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context.state !== "closed") void context.close();
      setMusicEnabled(false);
      notify("Đã tắt nhạc khu vườn.");
      return;
    }
    startMusic();
  }

  function waterGarden() {
    setMoisture((current) => Math.min(100, current + 24));
    setWaterFlash(true);
    if (waterTimerRef.current !== null) window.clearTimeout(waterTimerRef.current);
    waterTimerRef.current = window.setTimeout(() => setWaterFlash(false), 1300);
    unlock("first-water");
    const nextWateredCount = wateredCount + 1;
    setWateredCount(nextWateredCount);
    if (nextWateredCount >= 3) unlock("green-thumb");
    notify("Một lượt tưới mát lành cho những bông hoa. 💧");
  }

  function touchPond() {
    setPondRipple((current) => current + 1);
    unlock("pond-listener");
    notify("Mặt hồ khẽ gợn sóng...");
  }

  function chooseWeather(value: Weather) {
    setWeather(value);
    unlock("weather-watcher");
  }

  function chooseSeason(value: Season) {
    setSeason(value);
    unlock("season-watcher");
    notify("Khu vườn chuyển sang mùa " + (SEASON_OPTIONS.find((option) => option.value === value)?.label.toLowerCase() ?? "") + ".");
  }

  function removeDecoration(id: string) {
    setDecorations((current) => current.filter((item) => item.id !== id));
    notify("Đã cất vật trang trí khỏi khu vườn.");
  }

  const mobileChapterX = [13, 38, 64, 88];
  const mobileChapterBottom = [14, 9, 17, 11];
  const mobileDecorationX = [6, 29, 51, 73, 95];
  const mobileDecorationBottom = [5, 22, 10, 25, 8, 17];

  return (
    <section className={styles.wrapper} aria-label="Khu vườn cổ tích">
      <div className={styles.sceneFrame}>
        <div ref={ref} className={sceneClass} style={sceneStyle} onClick={handleSceneClick}>
          <div className={styles.sky} aria-hidden="true" />
          <div className={styles.ambientGlow} aria-hidden="true" />
          <div className={styles.lightRays} aria-hidden="true" />
          <div className={styles.clouds} aria-hidden="true">
            {CLOUDS.map((cloud, index) => (
              <span key={index} className={styles.cloud} style={{
                left: String(cloud.left) + "%",
                top: String(cloud.top) + "%",
                width: cloud.width * scale,
                height: cloud.width * 0.22 * scale,
                animationDelay: String(cloud.delay) + "s",
                "--cloud-duration": String(cloud.duration) + "s",
              } as CSSProperties} />
            ))}
          </div>
          <div className={styles.stars} aria-hidden="true">
            {STARS.map((star, index) => (
              <span key={index} className={styles.star} style={{
                left: String(star.left) + "%",
                top: String(star.top) + "%",
                width: star.size,
                height: star.size,
                animationDelay: String(star.delay) + "s",
              }} />
            ))}
          </div>
          <div className={styles.moon} aria-hidden="true" />
          <div className={styles.sun} aria-hidden="true" />
          <div className={styles.farHills} aria-hidden="true" />
          <div className={styles.mist} aria-hidden="true"><span /><span /><span /></div>
          <div className={styles.trees} aria-hidden="true">
            {TREES.map((tree, index) => (
              <span key={index} className={styles.tree} style={{
                left: tree.left,
                width: tree.width * scale,
                height: tree.height * scale,
                animationDelay: String(index * 0.13) + "s",
              } as CSSProperties} />
            ))}
          </div>
          <div className={styles.ground} aria-hidden="true" />
          <div className={styles.grass} aria-hidden="true">
            {GRASS.map((blade, index) => (
              <span key={index} className={styles.grassBlade} style={{
                left: String(blade.left) + "%",
                height: blade.height * scale,
                width: blade.width * scale,
                "--grass-tilt": String(blade.tilt) + "deg",
                animationDelay: String(blade.delay) + "s",
              } as CSSProperties} />
            ))}
          </div>

          <div className={styles.pondLayer} aria-hidden="true">
            <button type="button" key={pondRipple} className={styles.pond} onClick={(event) => {
              event.stopPropagation();
              touchPond();
            }} aria-label="Chạm vào mặt hồ để tạo gợn sóng">
              <span className={styles.pondShine} />
              <span className={styles.pondRipple} />
              <span className={styles.pondRippleSecondary} />
              <span className={styles.lilyPad} />
              <span className={styles.pondTouchRing} />
            </button>
          </div>
          <div className={styles.path} aria-hidden="true" />
          <div className={styles.pathStones} aria-hidden="true">
            {STONES.map((stone, index) => (
              <span key={index} className={styles.stone} style={{
                left: String(stone.left) + "%",
                bottom: String(stone.bottom) + "%",
                width: stone.width * scale,
                transform: "translateX(-50%) rotate(" + stone.rotation + "deg)",
              }} />
            ))}
          </div>

          <div className={styles.birdsLayer} aria-hidden="true">
            {BIRDS.map((bird, index) => (
              <span key={index} className={styles.bird} style={{
                left: String(bird.left) + "%",
                top: String(bird.top) + "%",
                animationDelay: String(bird.delay) + "s",
                "--bird-duration": String(bird.duration) + "s",
              } as CSSProperties}>⌁</span>
            ))}
          </div>

          {ecologyEnabled && (
            <div className={styles.butterflies} aria-hidden="true">
              <span className={styles.butterfly} style={{ left: "8%", top: "42%", "--butterfly-duration": "29s", "--butterfly-color": "#e6bf8a", "--butterfly-size": 1, animationDelay: "-12s" } as CSSProperties} />
              <span className={styles.butterfly} style={{ left: "62%", top: "30%", "--butterfly-duration": "36s", "--butterfly-color": "#d8c4a5", "--butterfly-size": 0.78, animationDelay: "-25s" } as CSSProperties} />
              <span className={styles.butterfly} style={{ left: "44%", top: "53%", "--butterfly-duration": "33s", "--butterfly-color": "#d4a987", "--butterfly-size": 0.68, animationDelay: "-18s" } as CSSProperties} />
            </div>
          )}

          <div className={styles.driftingPetals} aria-hidden="true">
            {PETALS.map((petal, index) => (
              <span key={index} className={styles.driftingPetal} style={{
                left: String(petal.left) + "%",
                top: String(petal.top) + "%",
                width: petal.size * scale,
                height: petal.size * 1.45 * scale,
                background: petal.color,
                animationDelay: String(petal.delay) + "s",
                "--petal-duration": String(petal.duration) + "s",
                transform: "rotate(" + petal.rotation + "deg)",
              } as CSSProperties} />
            ))}
          </div>
          <div className={styles.pollen} aria-hidden="true">
            {POLLEN.map((particle, index) => (
              <span key={index} className={styles.pollenParticle} style={{
                left: String(particle.left) + "%",
                top: String(particle.top) + "%",
                width: particle.size * scale,
                height: particle.size * scale,
                animationDelay: String(particle.delay) + "s",
                "--pollen-duration": String(particle.duration) + "s",
              } as CSSProperties} />
            ))}
          </div>
          <div className={styles.fireflies} aria-hidden="true">
            {FIREFLIES.map((firefly, index) => (
              <span key={index} className={styles.firefly} style={{
                left: String(firefly.left) + "%",
                top: String(firefly.top) + "%",
                animationDelay: String(firefly.delay) + "s, " + String(firefly.delay) + "s",
                "--firefly-duration": String(firefly.duration) + "s",
              } as CSSProperties} />
            ))}
          </div>

          <div className={styles.rainDrops} aria-hidden="true">
            {RAIN_DROPS.map((drop, index) => (
              <span key={index} className={styles.rainDrop} style={{
                left: String(drop.left) + "%",
                height: drop.length * scale,
                animationDelay: String(drop.delay) + "s",
                animationDuration: String(drop.duration) + "s",
              }} />
            ))}
          </div>
          <div className={styles.snowfall} aria-hidden="true">
            {SNOW_FLAKES.map((flake, index) => (
              <span key={index} className={styles.snowFlake} style={{
                left: String(flake.left) + "%",
                width: flake.size * scale,
                height: flake.size * scale,
                animationDelay: String(flake.delay) + "s",
                animationDuration: String(flake.duration) + "s",
              }} />
            ))}
          </div>
          <div className={styles.seasonLeaves} aria-hidden="true">
            {AUTUMN_LEAVES.map((leaf, index) => (
              <span key={index} className={styles.autumnLeaf} style={{
                left: String(leaf.left) + "%",
                width: leaf.size * scale,
                height: leaf.size * 0.66 * scale,
                animationDelay: String(leaf.delay) + "s",
                animationDuration: String(leaf.duration) + "s",
                transform: "rotate(" + leaf.rotation + "deg)",
              }} />
            ))}
          </div>

          {decorationsFromStory.map((item, index) => (
            <div key={item.id} className={styles.decorativeFlower} style={{
              left: String(compact ? (mobileDecorationX[index] ?? 50) : item.x) + "%",
              bottom: String(compact ? (mobileDecorationBottom[index] ?? 12) : 8 + item.depth * 16) + "%",
              zIndex: Math.round((1 - item.depth) * 100),
            }}>
              <div className={styles.flowerArt}><Flower kind={item.kind} color={item.color} size={item.size * (1 - item.depth * 0.22) * scale} /></div>
            </div>
          ))}

          {decorations.map((decoration) => (
            <div
              key={decoration.id}
              role="group"
              aria-label="Vật trang trí do bạn thêm"
              className={styles.placedDecoration}
              style={{ left: String(decoration.x) + "%", bottom: String(decoration.y) + "%" }}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => {
                if (!editMode) return;
                event.stopPropagation();
                draggingRef.current = decoration.id;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerUp={(event) => moveDecoration(event, decoration.id)}
              onPointerCancel={() => { draggingRef.current = null; }}
            >
              {isFlowerKind(decoration.kind) ? (
                <Flower kind={decoration.kind} color={FLOWER_COLORS[decoration.kind]} size={0.23 * scale} />
              ) : (
                <span className={styles.placedIcon} aria-hidden="true">
                  {DECORATION_OPTIONS.find((option) => option.value === decoration.kind)?.icon ?? "✦"}
                </span>
              )}
              {editMode && (
                <button type="button" className={styles.placedRemove} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => {
                  event.stopPropagation();
                  removeDecoration(decoration.id);
                }} aria-label="Xóa vật trang trí">×</button>
              )}
            </div>
          ))}

          <div className={styles.flowers}>
            {items.map((item, index) => {
              if (!item.chapterId) return null;
              const chapterIndex = chapters.indexOf(item);
              const mobileX = mobileChapterX[chapterIndex] ?? 8 + (chapterIndex * 84) / Math.max(chapters.length - 1, 1);
              const mobileBottom = mobileChapterBottom[chapterIndex] ?? 12;
              const position = {
                left: String(compact ? mobileX : item.x) + "%",
                bottom: String(compact ? mobileBottom : 8 + item.depth * 16) + "%",
                zIndex: Math.round((1 - item.depth) * 100),
              } as CSSProperties;
              const flowerSize = item.size * (1 - item.depth * 0.22) * scale;
              const isRead = readIds.includes(item.chapterId);
              const isTourTarget = Boolean(presentation && tourChapter?.chapterId === item.chapterId);

              return (
                <button
                  key={item.id}
                  type="button"
                  className={[styles.chapterFlower, isTourTarget ? styles.tourHighlight : ""].filter(Boolean).join(" ")}
                  style={position}
                  onClick={(event) => {
                    event.stopPropagation();
                    unlock("story-seeker");
                    onOpenChapter(item.chapterId as string);
                  }}
                  aria-label={"Mở " + (item.label ?? "chương truyện") + ": " + (item.title ?? "") + (isRead ? " (đã đọc)" : "")}
                >
                  <span className={isRead ? styles.readLabel : styles.label}>
                    {isRead ? "✦ " : ""}{item.label ?? "Khám phá"}
                  </span>
                  <div key={item.id + "-" + String(bloomCycle)} className={[styles.flowerArt, styles.blooming].join(" ")} style={{ "--bloom-delay": String(Math.min(index * 0.12, 0.8)) + "s" } as CSSProperties}>
                    <Flower kind={item.kind} color={item.color} size={flowerSize} />
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={styles.secretSeed}
            onClick={(event) => {
              event.stopPropagation();
              if (!discoveries.includes("secret-seed")) {
                unlock("secret-seed");
                notify("Bạn tìm thấy một hạt giống bí mật! ✨");
              } else {
                notify("Hạt giống bí mật đang nằm an toàn trong bộ sưu tập.");
              }
            }}
            aria-label="Khám phá vật phẩm bí mật trong khu vườn"
            title="Một điều bí mật đang chờ..."
          >✦</button>

          <div className={styles.waterSpark} aria-hidden="true" data-active={waterFlash ? "true" : "false"} />
          <div className={styles.sceneCaption} aria-live={presentation ? "polite" : "off"}>
            <span>✧</span>
            {presentation && tourChapter ? "Đang dạo qua: " + (tourChapter.title ?? tourChapter.label ?? "một chương truyện") : "The secret garden"}
            <span>✧</span>
          </div>
          {editMode && (
            <div className={styles.editHint} aria-hidden="true">Chạm vào khoảng trống để đặt · kéo vật trang trí để di chuyển</div>
          )}
        </div>
      </div>

      <section className={styles.experiencePanel} aria-label="Bảng điều khiển trải nghiệm khu vườn">
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelKicker}>VANILLA GARDEN STUDIO</p>
            <h3>Chạm vào thế giới của mình</h3>
            <p>Thay đổi thời tiết, chăm hoa, tạo góc vườn và khám phá những điều bí mật.</p>
          </div>
          <span className={styles.savePill}>{saveReady ? "✓ Đã lưu trên thiết bị" : "Đang tải bản lưu"}</span>
        </div>

        {!viewerMode && (
          <div className={styles.experienceGrid}>
          <section className={styles.toolCard}>
            <h4>Thời tiết</h4>
            <div className={styles.choiceRow}>
              {WEATHER_OPTIONS.map((option) => (
                <button key={option.value} type="button" className={weather === option.value ? styles.choiceActive : styles.choiceButton} aria-pressed={weather === option.value} onClick={() => chooseWeather(option.value)}>
                  <span aria-hidden="true">{option.icon}</span>{option.label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.toolCard}>
            <h4>Bốn mùa</h4>
            <div className={styles.choiceRow}>
              {SEASON_OPTIONS.map((option) => (
                <button key={option.value} type="button" className={season === option.value ? styles.choiceActive : styles.choiceButton} aria-pressed={season === option.value} onClick={() => chooseSeason(option.value)}>
                  <span aria-hidden="true">{option.icon}</span>{option.label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.toolCard}>
            <h4>Thời gian &amp; gió</h4>
            <div className={styles.choiceRow}>
              <button type="button" className={time === "day" ? styles.choiceActive : styles.choiceButton} aria-pressed={time === "day"} onClick={() => setTime("day")}>☼ Ban ngày</button>
              <button type="button" className={time === "night" ? styles.choiceActive : styles.choiceButton} aria-pressed={time === "night"} onClick={() => setTime("night")}>☾ Ban đêm</button>
            </div>
            <div className={styles.choiceRow}>
              {(["calm", "breeze", "strong"] as const).map((level) => (
                <button key={level} type="button" className={wind === level ? styles.choiceActive : styles.choiceButton} aria-pressed={wind === level} onClick={() => setWind(level)}>
                  {level === "calm" ? "Lặng" : level === "breeze" ? "Gió nhẹ" : "Gió mạnh"}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.toolCard}>
            <h4>Không khí</h4>
            <div className={styles.choiceRow}>
              <button type="button" className={cinematicLighting ? styles.choiceActive : styles.choiceButton} aria-pressed={cinematicLighting} onClick={() => setCinematicLighting((current) => !current)}>
                ✧ {cinematicLighting ? "Ánh sáng điện ảnh" : "Ánh sáng dịu"}
              </button>
              <button type="button" className={ecologyEnabled ? styles.choiceActive : styles.choiceButton} aria-pressed={ecologyEnabled} onClick={() => setEcologyEnabled((current) => !current)}>
                🦋 {ecologyEnabled ? "Sinh vật: bật" : "Sinh vật: tắt"}
              </button>
            </div>
          </section>
          </div>
        )}

        {viewerMode ? (
          <div className={styles.actionBar}>
            <button type="button" className={styles.actionActive} onClick={() => {
              setBloomCycle((current) => current + 1);
              if (!musicEnabled) startMusic();
              notify("Khu vườn đã thức giấc. Chúc bạn có một chuyến dạo chơi thật dịu dàng. ✨");
            }}>✧ Đánh thức khu vườn</button>
            <button type="button" className={musicEnabled ? styles.actionActive : styles.actionButton} aria-pressed={musicEnabled} onClick={toggleMusic}>
              {musicEnabled ? "♫ Tắt nhạc" : "♫ Bật nhạc nền"}
            </button>
          </div>
        ) : (
          <>
          <div className={styles.actionBar}>
            <button type="button" className={editMode ? styles.actionActive : styles.actionButton} aria-pressed={editMode} onClick={() => {
              setEditMode((current) => !current);
              notify(editMode ? "Đã đóng chế độ sắp xếp khu vườn." : "Chế độ thiết kế đã bật. Chọn vật trang trí rồi chạm vào khu vườn.");
            }}>✿ {editMode ? "Hoàn tất sắp xếp" : "Thiết kế khu vườn"}</button>
            <button type="button" className={styles.actionButton} onClick={waterGarden}>💧 Tưới hoa</button>
            <button type="button" className={styles.actionButton} onClick={() => {
              setBloomCycle((current) => current + 1);
              notify("Những bông hoa đang bung nở...");
            }}>✧ Đánh thức hoa</button>
            <button type="button" className={musicEnabled ? styles.actionActive : styles.actionButton} aria-pressed={musicEnabled} onClick={toggleMusic}>{musicEnabled ? "♫ Tắt nhạc" : "♫ Nhạc khu vườn"}</button>
            <button type="button" className={presentation ? styles.actionActive : styles.actionButton} aria-pressed={presentation} onClick={() => {
              setPresentation((current) => !current);
              unlock("garden-curator");
              notify(presentation ? "Đã dừng chuyến dạo vườn." : "Bắt đầu chuyến dạo qua những câu chuyện.");
            }}>{presentation ? "Ⅱ Dừng trình diễn" : "▷ Trình diễn khu vườn"}</button>
          </div>
  
          {editMode && (
            <div className={styles.editorPanel}>
              <div>
                <h4>Chọn vật trang trí</h4>
                <p>Chạm vào khoảng trống để đặt; kéo vật đã đặt để đổi vị trí. Hoa và chương có sẵn vẫn được giữ nguyên.</p>
              </div>
              <div className={styles.choiceRow}>
                {DECORATION_OPTIONS.map((option) => (
                  <button key={option.value} type="button" className={selectedDecoration === option.value ? styles.choiceActive : styles.choiceButton} aria-pressed={selectedDecoration === option.value} onClick={() => setSelectedDecoration(option.value)}>
                    <span aria-hidden="true">{option.icon}</span>{option.label}
                  </button>
                ))}
              </div>
              <p className={styles.editorCount}>Đã thêm {decorations.length}/80 vật trang trí</p>
            </div>
          )}
          </>
        )}
        {!viewerMode && (
          <div className={styles.careAndCollection}>
          <section className={styles.careCard}>
            <div className={styles.careHeader}>
              <div><h4>Chăm sóc khu vườn</h4><p>Độ ẩm đất mô phỏng</p></div>
              <strong>{moisture}%</strong>
            </div>
            <div className={styles.moistureTrack} role="progressbar" aria-label="Độ ẩm khu vườn" aria-valuemin={0} aria-valuemax={100} aria-valuenow={moisture}>
              <span style={{ width: String(moisture) + "%" }} />
            </div>
            <p className={styles.careHint}>{moisture >= 76 ? "Đất đang đủ ẩm, lá cây tươi sáng." : moisture >= 40 ? "Khu vườn đang ổn; có thể tưới thêm một chút." : "Đất đang khô, hãy tưới nước cho cây nhé."} · Đã tưới {wateredCount} lần</p>
          </section>

          <section className={styles.collectionCard}>
            <div className={styles.careHeader}>
              <div><h4>Bộ sưu tập thành tựu</h4><p>Những dấu mốc trong khu vườn</p></div>
              <strong>{unlockedAchievements.length}/{ACHIEVEMENTS.length}</strong>
            </div>
            <div className={styles.badgeShelf}>
              {ACHIEVEMENTS.map((achievement) => {
                const unlocked = discoveries.includes(achievement.id);
                return (
                  <span key={achievement.id} className={unlocked ? styles.achievement : styles.achievementLocked} title={achievement.hint} aria-label={achievement.name + (unlocked ? " đã mở khóa" : " chưa mở khóa")}>
                    <span aria-hidden="true">{unlocked ? achievement.icon : "·"}</span>
                    {achievement.name}
                  </span>
                );
              })}
            </div>
          </section>
          </div>
        )}
        {notice && <p className={styles.gardenNotice} role="status" aria-live="polite">{notice}</p>}
        {!viewerMode && <p className={styles.localSaveNote}>Bản thiết kế, mùa, thời tiết và thành tựu được lưu riêng trên trình duyệt này; nội dung hoa, truyện và tiến độ đọc trên tài khoản vẫn giữ nguyên.</p>}
      </section>
    </section>
  );
}
