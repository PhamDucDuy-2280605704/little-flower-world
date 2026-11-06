"use client";

// Cảnh khu vườn: nền + các bông hoa đặt đúng vị trí + hiệu ứng phủ lên trên.
// Mọi kích thước được nhân với "scale" để cả khu vườn thu nhỏ vừa màn hình điện thoại.

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import type { GardenItem, TimeOfDay, WindLevel } from "@/types/garden";
import Flower from "@/features/flowers/components/Flower";
import { windSettings } from "../data/gardenSettings";
import { useElementWidth } from "../hooks/useElementWidth";
import GardenBackdrop from "./GardenBackdrop";
import GardenEffects from "./GardenEffects";
import styles from "../styles/GardenScene.module.css";

// Kích thước thiết kế gốc của cảnh (trên màn hình rộng).
const DESIGN_WIDTH = 860;
const DESIGN_HEIGHT = 520;

// Hoa dưới cùng đứng cách đáy cảnh 18px; hoa xa nhất đứng cao hơn thêm 140px.
const GROUND_FRONT = 18;
const GROUND_DEPTH_RANGE = 140;

// Thân hoa kết thúc cách đáy khung hoa 25px (khung cao 340px, thân dài tới 315px).
const STEM_GAP = 25;

// Bồ công anh mọc lại hạt sau bao lâu (mili-giây).
const REGROW_MS = 5000;

type GardenSceneProps = {
  items: GardenItem[];
  time: TimeOfDay;
  wind: WindLevel;
  readIds: string[];
  onOpenChapter: (chapterId: string) => void;
};

export default function GardenScene({
  items,
  time,
  wind,
  readIds,
  onOpenChapter,
}: GardenSceneProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  // Danh sách bồ công anh đang bị thổi bay hạt
  const [blownIds, setBlownIds] = useState<string[]>([]);
  // Giữ các bộ hẹn giờ để dọn dẹp khi rời trang
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((id) => window.clearTimeout(id));
  }, []);

  // Tỉ lệ thu phóng: màn hình hẹp hơn 860px thì thu nhỏ, nhưng không nhỏ hơn 0.55.
  const scale = width > 0 ? Math.min(1, Math.max(0.55, width / DESIGN_WIDTH)) : 1;
  const sceneHeight = DESIGN_HEIGHT * scale;
  // Màn hình hẹp: nhãn chỉ ghi số ("1" thay vì "Chương 1") để các nhãn không đè lên nhau.
  const compactLabels = scale < 0.8;
  const setting = windSettings[wind];

  // Thổi bồ công anh: hạt bay đi, vài giây sau mọc lại.
  function blowDandelion(id: string) {
    if (blownIds.includes(id)) return;
    setBlownIds((current) => [...current, id]);
    const timer = window.setTimeout(() => {
      setBlownIds((current) => current.filter((item) => item !== id));
    }, REGROW_MS);
    timers.current.push(timer);
  }

  // Các biến CSS "truyền" thông số gió và kích thước xuống mọi thứ bên trong cảnh.
  const sceneStyle = {
    height: sceneHeight,
    "--sway-duration": setting.swayDuration,
    "--sway-angle": setting.swayAngle,
    "--speed": setting.speed,
    "--drift": setting.drift,
    "--scene-w": `${width || DESIGN_WIDTH}px`,
    "--scene-h": `${sceneHeight}px`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={
        time === "night" ? `${styles.scene} ${styles.night}` : styles.scene
      }
      style={sceneStyle}
    >
      <GardenBackdrop time={time} />

      <div className={styles.items}>
        {items.map((item) => {
          // Hoa xa nhỏ hơn hoa gần (tối đa nhỏ đi 38%)
          const flowerScale = item.size * (1 - item.depth * 0.38) * scale;
          const bottom =
            (GROUND_FRONT + item.depth * GROUND_DEPTH_RANGE) * scale -
            STEM_GAP * flowerScale;

          const position: CSSProperties = {
            left: `${item.x}%`,
            bottom,
            // Hoa gần (depth nhỏ) nằm phía trước hoa xa
            zIndex: Math.round((1 - item.depth) * 100),
          };

          const isChapter = Boolean(item.chapterId);
          const isDandelion = item.kind === "dandelion";
          const isRead = item.chapterId
            ? readIds.includes(item.chapterId)
            : false;

          const flower = (
            <div className={styles.flowerWrap} aria-hidden="true">
              <Flower
                kind={item.kind}
                color={item.color}
                size={flowerScale}
                blown={blownIds.includes(item.id)}
              />
            </div>
          );

          // 1) Hoa mở chương truyện
          if (isChapter && item.chapterId) {
            const chapterId = item.chapterId;
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.item} ${styles.clickable}`}
                style={position}
                onClick={() => onOpenChapter(chapterId)}
                aria-label={`Đọc ${(item.label ?? "chương").toLowerCase()}: ${
                  item.title ?? ""
                }${isRead ? " (đã đọc)" : ""}`}
              >
                <span
                  className={
                    isRead ? `${styles.label} ${styles.labelRead}` : styles.label
                  }
                >
                  {isRead ? "✓ " : ""}
                  {compactLabels
                    ? (item.label ?? "").replace("Chương ", "")
                    : item.label}
                </span>
                {flower}
              </button>
            );
          }

          // 2) Bồ công anh: bấm để thổi
          if (isDandelion) {
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.item} ${styles.clickable}`}
                style={position}
                onClick={() => blowDandelion(item.id)}
                aria-label="Thổi bồ công anh"
              >
                {flower}
              </button>
            );
          }

          // 3) Hoa trang trí, không bấm được
          return (
            <div
              key={item.id}
              className={styles.item}
              style={position}
              aria-hidden="true"
            >
              {flower}
            </div>
          );
        })}
      </div>

      <GardenEffects time={time} gusts={setting.gusts} />
    </div>
  );
}
