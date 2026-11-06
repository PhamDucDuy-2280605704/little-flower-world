"use client";

// Hộp quà. Props "opened" quyết định hộp đang đóng hay đang mở.
// Motion (import từ "motion/react") giúp tạo chuyển động mượt chỉ bằng
// cách mô tả "trạng thái đích" trong thuộc tính animate.

import { motion, useReducedMotion } from "motion/react";
import styles from "../styles/GiftBox.module.css";

type GiftBoxProps = {
  opened: boolean;
};

// Màu cho các cánh hoa bay ra (lần lượt lặp lại)
const PETAL_COLORS = ["#ffb3cb", "#ff7a8a", "#ffd9e6"];
const PETAL_COUNT = 14;

// Cánh hoa bay ra mọi hướng. Vị trí đích được tính bằng lượng giác
// (cos/sin) để các cánh tỏa đều như hình tia nắng.
function Petals() {
  return (
    <>
      {Array.from({ length: PETAL_COUNT }, (_, i) => {
        const angle = (i / PETAL_COUNT) * Math.PI * 2;
        const distance = 150 + (i % 3) * 45;
        return (
          <motion.span
            key={i}
            className={styles.petal}
            style={{ backgroundColor: PETAL_COLORS[i % PETAL_COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * distance,
              // Trừ 90 để các cánh bay lên cao hơn một chút
              y: Math.sin(angle) * distance * 0.7 - 90,
              opacity: 0,
              scale: 1,
              rotate: (i % 2 === 0 ? 1 : -1) * (180 + i * 20),
            }}
            transition={{ duration: 1.8, delay: 0.25 + (i % 5) * 0.06, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

export default function GiftBox({ opened }: GiftBoxProps) {
  // Nếu người dùng bật "giảm chuyển động" trong hệ điều hành thì không cho hộp nhấp nhô.
  const reduceMotion = useReducedMotion();

  return (
    // Cả hộp nhấp nhô nhẹ khi đang chờ được mở
    <motion.div
      className={styles.box}
      animate={opened || reduceMotion ? { y: 0 } : { y: [0, -8, 0] }}
      transition={
        opened || reduceMotion
          ? { duration: 0.2 }
          : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <div className={styles.body}>
        <span className={styles.ribbon} />
      </div>

      {/* Nắp hộp: khi opened = true thì bật lên và nghiêng sang bên */}
      <motion.div
        className={styles.lid}
        animate={
          opened
            ? { y: -80, x: 36, rotate: 24 }
            : { y: 0, x: 0, rotate: 0 }
        }
        transition={{ type: "spring", stiffness: 140, damping: 12 }}
      >
        <span className={styles.ribbon} />
        <span className={styles.bowLeft} />
        <span className={styles.bowRight} />
      </motion.div>

      {/* Ánh sáng và cánh hoa chỉ xuất hiện lúc mở */}
      {opened && (
        <>
          <motion.div
            className={styles.light}
            initial={{ scale: 0, opacity: 0.95 }}
            animate={{ scale: 3.2, opacity: 0 }}
            transition={{ duration: 1.6, delay: 0.3, ease: "easeOut" }}
          />
          <Petals />
        </>
      )}
    </motion.div>
  );
}
