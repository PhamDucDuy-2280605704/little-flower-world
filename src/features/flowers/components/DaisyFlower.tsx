
import styles from "../styles/DaisyFlower.module.css";

// Component DaisyFlower chịu trách nhiệm tạo hình một bông hoa.
// Sau này chúng ta có thể tái sử dụng component này ở nhiều trang.

export default function DaisyFlower() {
  return (
    // Container chính bao bọc toàn bộ bông hoa.
    // role="img" giúp trình đọc màn hình nhận biết đây là hình ảnh.
    <div
      className={styles.flower}
      role="img"
      aria-label="Bông hoa cúc trắng với nhụy vàng và lá xanh"
    >
      {/* Phần thân hoa */}
      <div className={styles.stem} />

      {/* Hai chiếc lá nằm trên thân */}
      <div className={styles.leftLeaf} />
      <div className={styles.rightLeaf} />

      {/* Phần đầu hoa */}
      <div className={styles.flowerHead}>
        {/* Tạo 8 cánh hoa riêng biệt */}
        <span className={`${styles.petal} ${styles.petal1}`} />
        <span className={`${styles.petal} ${styles.petal2}`} />
        <span className={`${styles.petal} ${styles.petal3}`} />
        <span className={`${styles.petal} ${styles.petal4}`} />
        <span className={`${styles.petal} ${styles.petal5}`} />
        <span className={`${styles.petal} ${styles.petal6}`} />
        <span className={`${styles.petal} ${styles.petal7}`} />
        <span className={`${styles.petal} ${styles.petal8}`} />

        {/* Nhụy hoa màu vàng nằm giữa các cánh */}
        <div className={styles.center} />
      </div>
    </div>
  );
}
