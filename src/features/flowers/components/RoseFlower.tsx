import type { CSSProperties } from "react";
import type { FlowerProps } from "@/types/flower";
import FlowerFrame from "./FlowerFrame";
import styles from "../styles/RoseFlower.module.css";

// Hoa hồng gồm nhiều lớp chồng lên nhau: lớp ngoài to và sáng,
// càng vào trong càng nhỏ, đậm và xoay lệch đi một chút.
const ROSE_LAYERS = [
  { size: 132, rotate: 0, light: 45 },
  { size: 106, rotate: 28, light: 55 },
  { size: 82, rotate: -22, light: 68 },
  { size: 58, rotate: 40, light: 82 },
  { size: 36, rotate: -30, light: 100 },
];

export default function RoseFlower({ size = 1, color }: FlowerProps) {
  return (
    <FlowerFrame
      size={size}
      color={color}
      label="Bông hoa hồng nhiều lớp cánh và lá xanh"
    >
      {/* Mỗi phần tử của mảng ROSE_LAYERS sẽ thành một lớp cánh */}
      {ROSE_LAYERS.map((layer, index) => (
        <span
          key={index}
          className={styles.layer}
          style={
            {
              "--s": `${layer.size}px`,
              "--r": `${layer.rotate}deg`,
              "--k": `${layer.light}%`,
              zIndex: index + 1,
            } as CSSProperties
          }
        />
      ))}
    </FlowerFrame>
  );
}
