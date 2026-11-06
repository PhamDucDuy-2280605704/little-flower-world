import type { TimeOfDay, WindLevel } from "@/types/garden";
import { timeLabels, windLevels, windSettings } from "../data/gardenSettings";
import styles from "../styles/GardenControls.module.css";

type GardenControlsProps = {
  time: TimeOfDay;
  wind: WindLevel;
  onTimeChange: (time: TimeOfDay) => void;
  onWindChange: (wind: WindLevel) => void;
};

const TIMES: TimeOfDay[] = ["day", "night"];

// Bảng điều khiển: chọn ban ngày/ban đêm và mức gió.
// Component này không tự nhớ gì: nó nhận giá trị từ ngoài và báo ra ngoài khi người dùng bấm.
export default function GardenControls({
  time,
  wind,
  onTimeChange,
  onWindChange,
}: GardenControlsProps) {
  return (
    <div className={styles.controls}>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Thời gian</legend>
        <div className={styles.buttons}>
          {TIMES.map((value) => (
            <button
              key={value}
              type="button"
              className={
                value === time
                  ? `${styles.button} ${styles.active}`
                  : styles.button
              }
              aria-pressed={value === time}
              onClick={() => onTimeChange(value)}
            >
              {value === "day" ? "☀️ " : "🌙 "}
              {timeLabels[value]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Gió</legend>
        <div className={styles.buttons}>
          {windLevels.map((level) => (
            <button
              key={level}
              type="button"
              className={
                level === wind
                  ? `${styles.button} ${styles.active}`
                  : styles.button
              }
              aria-pressed={level === wind}
              onClick={() => onWindChange(level)}
            >
              {windSettings[level].label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
