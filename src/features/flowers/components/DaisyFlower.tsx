import type { CSSProperties } from "react";
import type { FlowerProps } from "@/types/flower";
import FlowerFrame from "./FlowerFrame";
import styles from "../styles/DaisyFlower.module.css";

// Hoa cúc: 8 cánh + nhụy vàng.
// Thay vì viết tay 8 thẻ <span>, ta dùng Array.from để tạo ra chúng.
export default function DaisyFlower({ size = 1, color }: FlowerProps) {
  return (
    <FlowerFrame
      size={size}
      color={color}
      label="Bông hoa cúc với nhụy vàng và lá xanh"
    >
      {/* Tạo 8 cánh: i chạy từ 0 đến 7.
          Biến CSS --i cho CSS biết đây là cánh thứ mấy để xoay cho đúng. */}
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          className={styles.petal}
          style={{ "--i": i } as CSSProperties}
        />
      ))}

      {/* Nhụy hoa */}
      <div className={styles.center} />
    </FlowerFrame>
  );
}
