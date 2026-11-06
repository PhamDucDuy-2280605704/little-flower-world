import type { CSSProperties, ReactNode } from "react";
import styles from "../styles/FlowerBase.module.css";

// Kích thước gốc của một bông hoa (đơn vị: pixel).
const FLOWER_WIDTH = 240;
const FLOWER_HEIGHT = 340;

// Props của FlowerFrame. "children" là phần đầu hoa do từng loài hoa truyền vào.
type FlowerFrameProps = {
  size?: number;
  color?: string;
  label: string; // mô tả hình cho người dùng trình đọc màn hình
  children: ReactNode;
};

// FlowerFrame = khung chung: thân + lá + đung đưa + phóng to/thu nhỏ.
export default function FlowerFrame({
  size = 1,
  color,
  label,
  children,
}: FlowerFrameProps) {
  // Nếu có truyền màu, ta gửi nó cho CSS qua biến "--flower-color".
  // CSS của từng loài hoa sẽ đọc biến này bằng var(--flower-color).
  const flowerStyle = color
    ? ({ "--flower-color": color } as CSSProperties)
    : undefined;

  return (
    <div
      className={styles.frame}
      style={{ width: FLOWER_WIDTH * size, height: FLOWER_HEIGHT * size }}
    >
      <div className={styles.scaler} style={{ transform: `scale(${size})` }}>
        <div
          className={styles.flower}
          style={flowerStyle}
          role="img"
          aria-label={label}
        >
          <div className={styles.stem} />
          <div className={styles.leftLeaf} />
          <div className={styles.rightLeaf} />
          <div className={styles.head}>{children}</div>
        </div>
      </div>
    </div>
  );
}
