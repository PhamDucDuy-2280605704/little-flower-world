import type { CSSProperties } from "react";
import type { TimeOfDay } from "@/types/garden";
import styles from "../styles/GardenEffects.module.css";

type GardenEffectsProps = {
  time: TimeOfDay;
  gusts: number; // số vệt gió cần hiện (0 = lặng gió)
};

// Số ngẫu nhiên giả: cùng i, cùng salt luôn ra cùng một số từ 0 đến 1.
function pseudoRandom(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const PETAL_COLORS = ["#ffb3cb", "#ffd0e0", "#ff9ec7", "#ffe3ec"];
const LEAF_COLORS = ["#7bc87c", "#5aab6a", "#a7dfa0"];

// Cánh hoa rơi: vị trí ngang, thời gian rơi, độ trễ, kích cỡ, màu.
const PETALS = Array.from({ length: 14 }, (_, i) => ({
  left: 4 + pseudoRandom(i, 1) * 92,
  duration: 9 + pseudoRandom(i, 2) * 7,
  delay: -pseudoRandom(i, 3) * 14, // trừ → bắt đầu "giữa chừng" nên không rơi đồng loạt
  size: 9 + pseudoRandom(i, 4) * 6,
  color: PETAL_COLORS[i % PETAL_COLORS.length],
}));

// Lá bay: giống cánh hoa nhưng lớn hơn và rơi chậm hơn.
const LEAVES = Array.from({ length: 7 }, (_, i) => ({
  left: 6 + pseudoRandom(i, 5) * 88,
  duration: 13 + pseudoRandom(i, 6) * 8,
  delay: -pseudoRandom(i, 7) * 18,
  size: 12 + pseudoRandom(i, 8) * 6,
  color: LEAF_COLORS[i % LEAF_COLORS.length],
}));

// Đom đóm (ban đêm): vị trí ngang/dọc, thời gian bay, độ trễ.
const FIREFLIES = Array.from({ length: 16 }, (_, i) => ({
  left: 5 + pseudoRandom(i, 9) * 90,
  top: 25 + pseudoRandom(i, 10) * 60,
  duration: 6 + pseudoRandom(i, 11) * 6,
  delay: -pseudoRandom(i, 12) * 8,
}));

// Bướm (ban ngày): độ cao, thời gian bay ngang qua cảnh, màu cánh.
const BUTTERFLIES = [
  { top: 30, duration: 26, delay: -4, color: "#ff9a6b" },
  { top: 48, duration: 34, delay: -19, color: "#ff8fb8" },
  { top: 38, duration: 30, delay: -11, color: "#8ec5ff" },
];

// Các vệt gió: độ cao, thời gian lướt qua.
const GUSTS = Array.from({ length: 7 }, (_, i) => ({
  top: 12 + pseudoRandom(i, 13) * 55,
  duration: 2.2 + pseudoRandom(i, 14) * 1.6,
  delay: -pseudoRandom(i, 15) * 4,
}));

// Lớp hiệu ứng phủ lên khu vườn: cánh hoa, lá, bướm hoặc đom đóm, gió.
// Các biến --speed, --drift, --scene-h, --scene-w do GardenScene đặt (theo mức gió và kích thước cảnh).
export default function GardenEffects({ time, gusts }: GardenEffectsProps) {
  const rootClass = `${styles.root} ${
    time === "night" ? styles.night : styles.day
  }`;

  return (
    <div className={rootClass} aria-hidden="true">
      {PETALS.map((petal, i) => (
        <span
          key={`petal-${i}`}
          className={styles.petal}
          style={
            {
              left: `${petal.left}%`,
              width: petal.size,
              height: petal.size * 1.4,
              background: petal.color,
              "--d": petal.duration,
              animationDelay: `${petal.delay}s`,
            } as CSSProperties
          }
        />
      ))}

      {LEAVES.map((leaf, i) => (
        <span
          key={`leaf-${i}`}
          className={styles.leaf}
          style={
            {
              left: `${leaf.left}%`,
              width: leaf.size,
              height: leaf.size * 0.7,
              background: leaf.color,
              "--d": leaf.duration,
              animationDelay: `${leaf.delay}s`,
            } as CSSProperties
          }
        />
      ))}

      {/* Bướm: chỉ nhìn thấy ban ngày (CSS ẩn đi khi .night) */}
      <div className={styles.butterflies}>
        {BUTTERFLIES.map((b, i) => (
          <div
            key={i}
            className={styles.butterfly}
            style={
              {
                top: `${b.top}%`,
                "--d": b.duration,
                "--c": b.color,
                "--flap": i,
                animationDelay: `${b.delay}s`,
              } as CSSProperties
            }
          >
            <div className={styles.flutter}>
              <span className={styles.wingLeft} />
              <span className={styles.wingRight} />
            </div>
          </div>
        ))}
      </div>

      {/* Đom đóm: chỉ nhìn thấy ban đêm */}
      <div className={styles.fireflies}>
        {FIREFLIES.map((f, i) => (
          <span
            key={i}
            className={styles.firefly}
            style={
              {
                left: `${f.left}%`,
                top: `${f.top}%`,
                "--d": f.duration,
                animationDelay: `${f.delay}s, ${f.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Vệt gió: lấy "gusts" vệt đầu tiên trong danh sách */}
      {GUSTS.slice(0, gusts).map((gust, i) => (
        <span
          key={`gust-${i}`}
          className={styles.gust}
          style={
            {
              top: `${gust.top}%`,
              "--d": gust.duration,
              animationDelay: `${gust.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
