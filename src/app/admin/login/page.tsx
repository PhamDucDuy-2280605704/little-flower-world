import type { Metadata } from "next";
import Link from "next/link";
import AdminLoginForm from "@/features/admin/components/AdminLoginForm";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị · Little Story World",
  description: "Cổng đăng nhập riêng dành cho quản trị viên Little Story World.",
};

export default function AdminLoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.illustration} aria-hidden="true">
          <div className={styles.moon} />
          <div className={styles.glow} />
          <div className={styles.flower}>
            <span /><span /><span /><span /><span /><i />
          </div>
          <div className={styles.landscape} />
          <p className={styles.artCaption}>A quiet place to care for every little thing</p>
        </div>
        <div className={styles.formSide}>
          <Link className={styles.brand} href="/">
            <span className={styles.brandMark}>✿</span>
            <span><strong>Little Story World</strong><small>ADMIN PORTAL</small></span>
          </Link>
          <AdminLoginForm />
          <p className={styles.footer}>Khu vực riêng tư · Chỉ dành cho quản trị viên được cấp quyền</p>
        </div>
      </section>
    </main>
  );
}
