"use client";

// GardenView = khu vườn + bảng điều khiển.
// Nơi duy nhất nhớ "đang ban ngày hay ban đêm" và "gió mức nào".

import { useState } from "react";
import type { GardenItem, TimeOfDay, WindLevel } from "@/types/garden";
import GardenControls from "./GardenControls";
import GardenScene from "./GardenScene";
import styles from "../styles/GardenView.module.css";

type GardenViewProps = {
  items: GardenItem[];
  readIds: string[];
  onOpenChapter: (chapterId: string) => void;
};

export default function GardenView({
  items,
  readIds,
  onOpenChapter,
}: GardenViewProps) {
  const [time, setTime] = useState<TimeOfDay>("day");
  const [wind, setWind] = useState<WindLevel>("breeze");

  return (
    <div className={styles.view}>
      <GardenScene
        items={items}
        time={time}
        wind={wind}
        readIds={readIds}
        onOpenChapter={onOpenChapter}
      />
      <GardenControls
        time={time}
        wind={wind}
        onTimeChange={setTime}
        onWindChange={setWind}
      />
    </div>
  );
}
