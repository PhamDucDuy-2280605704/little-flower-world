import type { CSSProperties } from "react";
import type { FlowerProps } from "@/types/flower";
import FlowerFrame from "./FlowerFrame";
import styles from "../styles/SunflowerFlower.module.css";

// Số cánh mỗi vòng. Đổi số này để hoa nhiều hoặc ít cánh hơn
// (nhớ đổi cả con số 22.5 trong CSS: 360 chia số cánh).
const PETALS_PER_RING = 16;

// Hướng dương: vòng cánh phía sau + vòng cánh phía trước + nhụy nâu.
export default function SunflowerFlower({ size = 1, color }: FlowerProps) {
  // Tạo danh sách chỉ số 0..15 một lần, dùng cho cả hai vòng cánh.
  const indexes = Array.from({ length: PETALS_PER_RING }, (_, i) => i);

  return (
    <FlowerFrame
      size={size}
      color={color}
      label="Bông hướng dương với cánh vàng và nhụy nâu"
    >
      {/* Vòng sau: xoay lệch nửa bước để lấp khe hở giữa các cánh trước */}
      {indexes.map((i) => (
        <span
          key={`back-${i}`}
          className={`${styles.petal} ${styles.petalBack}`}
          style={{ "--i": i } as CSSProperties}
        />
      ))}

      {/* Vòng trước */}
      {indexes.map((i) => (
        <span
          key={`front-${i}`}
          className={`${styles.petal} ${styles.petalFront}`}
          style={{ "--i": i } as CSSProperties}
        />
      ))}

      {/* Nhụy nâu có hạt */}
      <div className={styles.disc} />
    </FlowerFrame>
  );
}
