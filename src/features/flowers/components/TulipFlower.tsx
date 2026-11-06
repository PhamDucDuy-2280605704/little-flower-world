import type { FlowerProps } from "@/types/flower";
import FlowerFrame from "./FlowerFrame";
import styles from "../styles/TulipFlower.module.css";

// Hoa tulip: ba cánh (giữa, trái, phải) khép lại thành một chiếc ly.
export default function TulipFlower({ size = 1, color }: FlowerProps) {
  return (
    <FlowerFrame
      size={size}
      color={color}
      label="Bông hoa tulip với ba cánh khép lại và lá xanh"
    >
      <div className={styles.cup}>
        {/* Cánh giữa nằm phía sau */}
        <span className={styles.petalMiddle} />
        {/* Hai cánh hai bên nằm phía trước */}
        <span className={styles.petalLeft} />
        <span className={styles.petalRight} />
      </div>
    </FlowerFrame>
  );
}
