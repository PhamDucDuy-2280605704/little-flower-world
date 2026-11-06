"use client";

// "use client" ở dòng đầu báo cho Next.js: component này chạy trên trình duyệt,
// vì nó cần "state" (nhớ lựa chọn của người dùng) và phản ứng khi bấm chuột.

import { useState } from "react";
import type { FlowerKind } from "@/types/flower";
import Flower from "./Flower";
import {
  colorSwatches,
  flowerCatalog,
  getFlowerInfo,
} from "../data/flowerCatalog";
import styles from "../styles/FlowerShowcase.module.css";

// Tủ hoa: chọn loài hoa, đổi màu và kích cỡ.
export default function FlowerShowcase() {
  // useState tạo ra một "ô nhớ": [giá trị hiện tại, hàm để đổi giá trị].
  // Mỗi lần gọi hàm đổi, React vẽ lại giao diện với giá trị mới.
  const [kind, setKind] = useState<FlowerKind>("daisy");
  const [color, setColor] = useState(getFlowerInfo("daisy").defaultColor);
  const [size, setSize] = useState(1);

  const current = getFlowerInfo(kind);

  // Khi chọn loài hoa khác: đổi loài và trả màu về màu mặc định của loài đó.
  function chooseFlower(next: FlowerKind) {
    setKind(next);
    setColor(getFlowerInfo(next).defaultColor);
  }

  return (
    <section className={styles.showcase} aria-labelledby="showcase-title">
      <div className={styles.header}>
        <h2 id="showcase-title" className={styles.title}>
          Tủ hoa nhỏ
        </h2>
        <p className={styles.subtitle}>
          Chọn một loài hoa, rồi thử đổi màu và kích cỡ nhé.
        </p>
      </div>

      {/* Hàng thẻ chọn loài hoa */}
      <div className={styles.cards}>
        {flowerCatalog.map((info) => (
          <button
            key={info.kind}
            type="button"
            className={
              info.kind === kind
                ? `${styles.card} ${styles.cardActive}`
                : styles.card
            }
            aria-pressed={info.kind === kind}
            onClick={() => chooseFlower(info.kind)}
          >
            {/* Hình nhỏ chỉ để trang trí nên ẩn khỏi trình đọc màn hình */}
            <div className={styles.mini} aria-hidden="true">
              <Flower kind={info.kind} size={0.3} color={info.defaultColor} />
            </div>
            <span className={styles.cardName}>{info.name}</span>
          </button>
        ))}
      </div>

      <div className={styles.workbench}>
        {/* Sân khấu: hoa đang chọn */}
        <div className={styles.stage}>
          <Flower kind={kind} size={size} color={color} />
        </div>

        {/* Bảng điều khiển */}
        <div className={styles.controls}>
          <div>
            <h3 className={styles.flowerName}>{current.name}</h3>
            <p className={styles.flowerDescription}>{current.description}</p>
          </div>

          <fieldset className={styles.field}>
            <legend className={styles.label}>Màu hoa</legend>
            <div className={styles.swatches}>
              {colorSwatches.map((swatch) => (
                <button
                  key={swatch.value}
                  type="button"
                  className={
                    swatch.value === color
                      ? `${styles.swatch} ${styles.swatchActive}`
                      : styles.swatch
                  }
                  style={{ backgroundColor: swatch.value }}
                  aria-label={swatch.name}
                  aria-pressed={swatch.value === color}
                  onClick={() => setColor(swatch.value)}
                />
              ))}
            </div>
          </fieldset>

          <div className={styles.field}>
            <label htmlFor="flower-size" className={styles.label}>
              Kích cỡ: {Math.round(size * 100)}%
            </label>
            <input
              id="flower-size"
              type="range"
              min={0.6}
              max={1.2}
              step={0.05}
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
              className={styles.slider}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
