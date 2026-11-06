import type { CSSProperties } from "react";
import type { FlowerProps } from "@/types/flower";
import FlowerFrame from "./FlowerFrame";
import styles from "../styles/LavenderFlower.module.css";

// Oải hương gồm 3 cụm nụ (spike). Mỗi cụm có một góc nghiêng và số hàng nụ riêng.
const SPIKES = [
  { tilt: -17, rows: 7 },
  { tilt: 17, rows: 7 },
  { tilt: 0, rows: 9 }, // cụm giữa cao nhất, vẽ sau cùng để nằm phía trước
];

export default function LavenderFlower({ size = 1, color }: FlowerProps) {
  return (
    <FlowerFrame
      size={size}
      color={color}
      label="Cụm hoa oải hương màu tím trên thân xanh"
    >
      {SPIKES.map((spike, spikeIndex) => (
        <div
          key={spikeIndex}
          className={styles.spike}
          style={
            { "--rows": spike.rows, "--tilt": `${spike.tilt}deg` } as CSSProperties
          }
        >
          {/* Mỗi hàng có hai nụ (trái, phải). i = 0 là hàng ngọn trên cùng. */}
          {Array.from({ length: spike.rows }, (_, i) => (
            <div
              key={i}
              className={styles.row}
              style={{ "--i": i } as CSSProperties}
            >
              <span className={styles.budLeft} />
              <span className={styles.budRight} />
            </div>
          ))}
        </div>
      ))}
    </FlowerFrame>
  );
}
