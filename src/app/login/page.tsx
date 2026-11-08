import type { Metadata } from "next";
import Link from "next/link";
import Flower from "@/features/flowers/components/Flower";
import LoginForm from "@/features/auth/components/LoginForm";
import styles from "./page.module.css";

// Tiêu đề riêng cho tab trình duyệt của trang đăng nhập.
export const metadata: Metadata = {
  title: "Đăng nhập · Little Story World",
};

// Trang đăng nhập – địa chỉ: /login
// File này chỉ dựng bố cục; phần form nằm trong features/auth.
export default function LoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        {/* Bên trái: bông hoa trang trí (ẩn trên điện thoại) */}
        <div className={styles.stage}>
          <Flower kind="rose" size={0.95} />
        </div>

        {/* Bên phải: form đăng nhập */}
        <div className={styles.formSide}>
          <LoginForm />

          <Link href="/" className={styles.backLink}>
            Về trang chủ
          </Link>
        </div>
      </section>
    </main>
  );
}
