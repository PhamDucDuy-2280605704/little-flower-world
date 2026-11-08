
import Link from "next/link";
import Flower from "@/features/flowers/components/Flower";
import FlowerShowcase from "@/features/flowers/components/FlowerShowcase";
import HomeAuthActions from "@/features/auth/components/HomeAuthActions";
import styles from "./page.module.css";

// Trang chủ của Little Flower World.
export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.siteHeader}>
        <Link href="/" className={styles.siteBrand}><span>✿</span><strong>Little Flower World</strong></Link>
        <nav aria-label="Điều hướng trang chủ">
          <Link href="/" aria-current="page">Trang chủ</Link>
          <Link href="/guest">Dành cho khách</Link>
          <Link href="/login">Thành viên</Link>
        </nav>
      </header>
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

          {/* Nút đăng nhập / đăng xuất theo tài khoản */}
          <HomeAuthActions
            actionsClassName={styles.actions}
            loginClassName={styles.loginLink}
            giftClassName={styles.giftLink}
            messageClassName={styles.note}
          />
        </div>

        {/* Khu vực hiển thị bông hoa */}
        <div className={styles.flowerArea}>
          <Flower kind="daisy" />
        </div>
      </section>

      <section className={styles.portalSection} aria-labelledby="portal-heading">
        <div className={styles.portalHeading}>
          <p className={styles.eyebrow}>CHỌN ĐÚNG KHÔNG GIAN</p>
          <h2 id="portal-heading">Bạn muốn bắt đầu từ đâu?</h2>
          <p>Mỗi khu vực có chức năng riêng, để trải nghiệm của khách và công việc quản trị luôn tách biệt.</p>
        </div>
        <div className={styles.portalGrid}>
          <Link href="/guest" className={styles.portalCard}>
            <span className={styles.portalIcon}>✧</span><span className={styles.portalText}><strong>Khu vực khách</strong><small>Mở lời mời, khám phá khu vườn được chia sẻ và gửi lời nhắn. Không cần tài khoản.</small></span><span className={styles.portalArrow}>↗</span>
          </Link>
          <Link href="/gift" className={styles.portalCard}>
            <span className={styles.portalIcon}>❀</span><span className={styles.portalText}><strong>Khu vực thành viên</strong><small>Đăng nhập để mở khu vườn cá nhân và món quà dành riêng cho tài khoản.</small></span><span className={styles.portalArrow}>↗</span>
          </Link>
          <Link href="/admin/login" className={styles.portalCard}>
            <span className={styles.portalIcon}>⌘</span><span className={styles.portalText}><strong>Khu vực quản trị</strong><small>Quản lý khu vườn, album, nội dung, bố cục và chia sẻ.</small></span><span className={styles.portalArrow}>↗</span>
          </Link>
        </div>
      </section>

      {/* Tủ hoa: chọn loài, đổi màu, đổi kích cỡ */}
      <FlowerShowcase />
    </main>
  );
}
