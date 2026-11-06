import type { CSSProperties } from "react";
import type { FlowerProps } from "@/types/flower";
import FlowerFrame from "./FlowerFrame";
import styles from "../styles/CherryFlower.module.css";

// Hoa anh đào: 5 cánh, mỗi cánh xoay 72 độ (360 chia 5) + nhụy.
export default function CherryFlower({ size = 1, color }: FlowerProps) {
  return (
    <FlowerFrame
      size={size}
      color={color}
      label="Bông hoa anh đào năm cánh màu hồng nhạt"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={styles.petal}
          style={{ "--i": i } as CSSProperties}
        />
      ))}
      <div className={styles.center} />
    </FlowerFrame>
  );
}
