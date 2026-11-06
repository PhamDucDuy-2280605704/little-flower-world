import type { CSSProperties } from "react";
import type { TimeOfDay } from "@/types/garden";
import styles from "../styles/GardenBackdrop.module.css";

type GardenBackdropProps = {
  time: TimeOfDay;
};

// Hàm tạo số "ngẫu nhiên giả": cùng một i luôn cho cùng một kết quả từ 0 đến 1.
// Nhờ vậy ngôi sao nằm cố định, không nhảy lung tung mỗi lần vẽ lại.
function pseudoRandom(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// 30 ngôi sao: vị trí, kích thước và độ trễ nhấp nháy khác nhau.
const STARS = Array.from({ length: 30 }, (_, i) => ({
  left: pseudoRandom(i, 1) * 100,
  top: pseudoRandom(i, 2) * 45,
  size: 1 + pseudoRandom(i, 3) * 2,
  delay: pseudoRandom(i, 4) * 3,
}));

// 3 đám mây: độ cao, kích thước, thời gian trôi và độ trễ.
const CLOUDS = [
  { top: 7, width: 120, duration: 110, delay: -20 },
  { top: 17, width: 86, duration: 150, delay: -90 },
  { top: 27, width: 150, duration: 130, delay: -55 },
];

// Nền của khu vườn: bầu trời, mặt trời/mặt trăng, sao, mây, ba lớp đồi.
export default function GardenBackdrop({ time }: GardenBackdropProps) {
  const rootClass = `${styles.backdrop} ${
    time === "night" ? styles.night : styles.day
  }`;

  return (
    <div className={rootClass} aria-hidden="true">
      {/* Hai lớp trời chồng nhau, đổi độ mờ để chuyển ngày/đêm mượt */}
      <div className={styles.skyDay} />
      <div className={styles.skyNight} />

      <div className={styles.stars}>
        {STARS.map((star, i) => (
          <span
            key={i}
            className={styles.star}
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      <div className={styles.sun} />
      <div className={styles.moon} />

      {CLOUDS.map((cloud, i) => (
        <span
          key={i}
          className={styles.cloud}
          style={
            {
              top: `${cloud.top}%`,
              width: cloud.width,
              height: cloud.width * 0.28,
              "--d": cloud.duration,
              animationDelay: `${cloud.delay}s`,
            } as CSSProperties
          }
        />
      ))}

      <div className={styles.hillBack} />
      <div className={styles.hillMid} />
      <div className={styles.ground} />
    </div>
  );
}
