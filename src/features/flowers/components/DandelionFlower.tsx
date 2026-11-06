import type { CSSProperties } from "react";
import type { FlowerProps } from "@/types/flower";
import FlowerFrame from "./FlowerFrame";
import styles from "../styles/DandelionFlower.module.css";

// Số hạt (có "dù" bông) quanh quả cầu.
const SEED_COUNT = 28;

// Bồ công anh: props "blown" cho biết hạt đã bị thổi bay chưa.
// Component này KHÔNG tự nhớ trạng thái; nơi dùng nó (khu vườn) quyết định khi nào thổi.
export default function DandelionFlower({
  size = 1,
  color,
  blown = false,
}: FlowerProps) {
  return (
    <FlowerFrame
      size={size}
      color={color}
      label="Bông bồ công anh với quả cầu bông trắng"
    >
      {/* Có "blown" thì thêm class .blown để CSS cho các hạt bay đi */}
      <div className={blown ? `${styles.puff} ${styles.blown}` : styles.puff}>
        {Array.from({ length: SEED_COUNT }, (_, i) => (
          <span
            key={i}
            className={styles.seed}
            style={{ "--i": i } as CSSProperties}
          />
        ))}
      </div>

      {/* Đế hoa ở giữa, hạt bay đi vẫn còn lại */}
      <div className={styles.core} />
    </FlowerFrame>
  );
}
