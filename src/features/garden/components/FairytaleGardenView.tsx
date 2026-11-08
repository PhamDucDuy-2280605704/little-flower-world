"use client";

import { useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import type { GardenItem, TimeOfDay, WindLevel } from "@/types/garden";
import Flower from "@/features/flowers/components/Flower";
import { useElementWidth } from "../hooks/useElementWidth";
import styles from "../styles/FairytaleGardenView.module.css";

type Props = {
  items: GardenItem[];
  readIds: string[];
  onOpenChapter: (chapterId: string) => void;
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

const STARS = Array.from({ length: 28 }, (_, index) => ({
  left: 3 + pseudoRandom(index, 1) * 94,
  top: 4 + pseudoRandom(index, 2) * 43,
  size: 1.5 + pseudoRandom(index, 3) * 2.5,
  delay: pseudoRandom(index, 4) * 4,
}));

const FIREFLIES = Array.from({ length: 18 }, (_, index) => ({
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

export default function FairytaleGardenView({ items, readIds, onOpenChapter }: Props) {
  const [time, setTime] = useState<TimeOfDay>("night");
  const [wind, setWind] = useState<WindLevel>("breeze");
  const reduceMotion = useReducedMotion();
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const scale = width > 0 ? Math.min(1, Math.max(0.5, width / 860)) : 1;

  const sceneStyle = {
    "--scene-scale": scale,
    "--sway-duration": wind === "calm" ? "7s" : wind === "strong" ? "2.8s" : "4.5s",
    "--firefly-duration": wind === "calm" ? "7s" : wind === "strong" ? "3s" : "5s",
  } as CSSProperties;

  const chapters = items.filter((item) => Boolean(item.chapterId));
  const decorations = items.filter((item) => !item.chapterId);
  const mobileChapterX = [13, 38, 64, 88];
  const mobileChapterBottom = [14, 9, 17, 11];
  const mobileDecorationX = [6, 29, 51, 73, 95];
  const mobileDecorationBottom = [5, 22, 10, 25, 8, 17];
  const compact = scale < 0.75;

  const sceneClass = [
    styles.realm,
    time === "day" ? styles.day : styles.night,
    reduceMotion ? styles.still : "",
  ].filter(Boolean).join(" ");

  return (
    <section className={styles.wrapper} aria-label="Khu vườn cổ tích">
      <div className={styles.sceneFrame}>
        <div ref={ref} className={sceneClass} style={sceneStyle}>
          <div className={styles.sky} aria-hidden="true" />
          <div className={styles.stars} aria-hidden="true">
            {STARS.map((star, index) => (
              <span
                key={index}
                className={styles.star}
                style={{
                  left: String(star.left) + "%",
                  top: String(star.top) + "%",
                  width: star.size,
                  height: star.size,
                  animationDelay: String(star.delay) + "s",
                }}
              />
            ))}
          </div>
          <div className={styles.moon} aria-hidden="true" />
          <div className={styles.sun} aria-hidden="true" />
          <div className={styles.farHills} aria-hidden="true" />
          <div className={styles.trees} aria-hidden="true">
            {TREES.map((tree, index) => (
              <span
                key={index}
                className={styles.tree}
                style={{
                  left: tree.left,
                  width: tree.width * scale,
                  height: tree.height * scale,
                  animationDelay: String(index * 0.13) + "s",
                } as CSSProperties}
              />
            ))}
          </div>
          <div className={styles.ground} aria-hidden="true" />
          <div className={styles.pond} aria-hidden="true">
            <span className={styles.pondShine} />
            <span className={styles.lilyPad} />
          </div>
          <div className={styles.path} aria-hidden="true" />
          <div className={styles.pathStones} aria-hidden="true">
            {STONES.map((stone, index) => (
              <span
                key={index}
                className={styles.stone}
                style={{
                  left: String(stone.left) + "%",
                  bottom: String(stone.bottom) + "%",
                  width: stone.width * scale,
                  transform: "translateX(-50%) rotate(" + stone.rotation + "deg)",
                }}
              />
            ))}
          </div>
          <div className={styles.fireflies} aria-hidden="true">
            {FIREFLIES.map((firefly, index) => (
              <span
                key={index}
                className={styles.firefly}
                style={{
                  left: String(firefly.left) + "%",
                  top: String(firefly.top) + "%",
                  animationDelay: String(firefly.delay) + "s, " + String(firefly.delay) + "s",
                  "--firefly-duration": String(firefly.duration) + "s",
                } as CSSProperties}
              />
            ))}
          </div>

          <div className={styles.flowers}>
            {items.map((item) => {
              const chapterIndex = item.chapterId ? chapters.indexOf(item) : -1;
              const decorationIndex = item.chapterId ? -1 : decorations.indexOf(item);
              const mobileX = item.chapterId
                ? (mobileChapterX[chapterIndex] ?? 8 + (chapterIndex * 84) / Math.max(chapters.length - 1, 1))
                : (mobileDecorationX[decorationIndex] ?? 7 + (decorationIndex * 86) / Math.max(decorations.length - 1, 1));
              const mobileBottom = item.chapterId
                ? (mobileChapterBottom[chapterIndex] ?? 12)
                : (mobileDecorationBottom[decorationIndex] ?? 10);
              const position = {
                left: String(compact ? mobileX : item.x) + "%",
                bottom: String(compact ? mobileBottom : 8 + item.depth * 16) + "%",
                zIndex: Math.round((1 - item.depth) * 100),
              } as CSSProperties;
              const flowerSize = item.size * (1 - item.depth * 0.22) * scale;
              const isRead = Boolean(item.chapterId && readIds.includes(item.chapterId));

              const flowerArt = (
                <div className={styles.flowerArt} aria-hidden="true">
                  <Flower kind={item.kind} color={item.color} size={flowerSize} />
                </div>
              );

              if (item.chapterId) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.chapterFlower}
                    style={position}
                    onClick={() => onOpenChapter(item.chapterId as string)}
                    aria-label={
                      "Mở " + (item.label ?? "chương truyện") + ": " + (item.title ?? "") +
                      (isRead ? " (đã đọc)" : "")
                    }
                  >
                    <span className={isRead ? styles.readLabel : styles.label}>
                      {isRead ? "✦ " : ""}
                      {item.label ?? "Khám phá"}
                    </span>
                    {flowerArt}
                  </button>
                );
              }

              return (
                <div
                  key={item.id}
                  className={styles.decorativeFlower}
                  style={position}
                  aria-hidden="true"
                >
                  {flowerArt}
                </div>
              );
            })}
          </div>

          <div className={styles.sceneCaption} aria-hidden="true">
            <span>✧</span> The secret garden <span>✧</span>
          </div>
        </div>
      </div>

      <div className={styles.controls} aria-label="Điều khiển khu vườn">
        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Thời gian</span>
          <div className={styles.controlButtons}>
            <button
              type="button"
              className={time === "day" ? styles.controlActive : styles.controlButton}
              aria-pressed={time === "day"}
              onClick={() => setTime("day")}
            >
              ☀️ Ban ngày
            </button>
            <button
              type="button"
              className={time === "night" ? styles.controlActive : styles.controlButton}
              aria-pressed={time === "night"}
              onClick={() => setTime("night")}
            >
              🌙 Ban đêm
            </button>
          </div>
        </div>
        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>Gió</span>
          <div className={styles.controlButtons}>
            {(["calm", "breeze", "strong"] as const).map((level) => (
              <button
                key={level}
                type="button"
                className={wind === level ? styles.controlActive : styles.controlButton}
                aria-pressed={wind === level}
                onClick={() => setWind(level)}
              >
                {level === "calm" ? "Lặng" : level === "breeze" ? "Nhẹ" : "Mạnh"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
