import type { CSSProperties } from "react";
import type { FlowerProps } from "@/types/flower";
import FlowerFrame from "./FlowerFrame";
import styles from "../styles/LotusFlower.module.css";

// Hoa sen có 3 tầng cánh. Mỗi tầng là một "hàng" gồm nhiều cánh xòe theo các góc khác nhau.
// - angles: góc xoay của từng cánh  - length/width: kích thước cánh
// - fade: càng lớn thì đầu cánh càng nhạt
const LOTUS_ROWS = [
  { angles: [-62, -31, 0, 31, 62], length: 88, width: 38, fade: 55 }, // tầng sau
  { angles: [-46, -15, 15, 46], length: 80, width: 38, fade: 40 }, // tầng giữa
  { angles: [-28, 0, 28], length: 70, width: 36, fade: 22 }, // tầng trước
];

export default function LotusFlower({ size = 1, color }: FlowerProps) {
  return (
    <FlowerFrame
      size={size}
      color={color}
      label="Bông hoa sen ba tầng cánh nằm trên lá sen xanh"
    >
      {/* Lá sen nằm dưới cùng */}
      <div className={styles.pad} />

      {/* map ngoài chạy qua từng tầng, map trong chạy qua từng cánh của tầng đó */}
      {LOTUS_ROWS.map((row, rowIndex) =>
        row.angles.map((angle) => (
          <span
            key={`${rowIndex}-${angle}`}
            className={styles.petal}
            style={
              {
                "--r": `${angle}deg`,
                "--h": `${row.length}px`,
                "--w": `${row.width}px`,
                "--k": `${row.fade}%`,
                zIndex: rowIndex + 1,
              } as CSSProperties
            }
          />
        ))
      )}
    </FlowerFrame>
  );
}
