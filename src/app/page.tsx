import Link from "next/link";
import Flower from "@/features/flowers/components/Flower";
import FlowerShowcase from "@/features/flowers/components/FlowerShowcase";
import styles from "./page.module.css";

// Trang chủ của Little Flower World.
export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        {/* Phần giới thiệu website */}
        <div className={styles.copy}>
          <p className={styles.eyebrow}>A tiny world made with care</p>

          <h1 className={styles.title}>
            Little Flower
            <span>World</span>
          </h1>

          <p className={styles.description}>
            Một khu vườn nhỏ chứa đựng những bông hoa, những câu chuyện và
            những điều dễ thương được tạo ra dành riêng cho bạn.
          </p>

          <p className={styles.note}>
            🌷 Mỗi bông hoa đều có một câu chuyện riêng. Bên dưới là tủ hoa
            nhỏ để bạn làm quen với từng loài.
          </p>

          {/* Các nút dẫn sang trang khác */}
          <div className={styles.actions}>
            {/* Đường dẫn /login */}
            <Link href="/login" className={styles.loginLink}>
              Đăng nhập để mở quà
            </Link>
            {/* Đường dẫn /gift: xem thử hành trình mở quà */}
            <Link href="/gift" className={styles.giftLink}>
              Xem thử hộp quà
            </Link>
          </div>
        </div>

        {/* Khu vực hiển thị bông hoa */}
        <div className={styles.flowerArea}>
          <Flower kind="daisy" />
        </div>
      </section>

      {/* Tủ hoa: chọn loài, đổi màu, đổi kích cỡ */}
      <FlowerShowcase />
    </main>
  );
}
