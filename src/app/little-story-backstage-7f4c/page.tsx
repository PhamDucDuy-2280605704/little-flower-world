import type { Metadata } from "next";
import Link from "next/link";
import AdminLoginForm from "@/features/admin/components/AdminLoginForm";
import styles from "@/app/admin/login/page.module.css";

export const metadata: Metadata = {
  title: "Private Admin portal · Little Story World",
  description: "Private administrator sign-in.",
  robots: { index: false, follow: false },
};

export default function PrivateAdminLoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.illustration} aria-hidden="true">
          <p className={styles.artCaption}>WORDS BECOME MEMORIES</p>
        </div>
        <div className={styles.formSide}>
          <Link className={styles.brand} href="/">
            <span className={styles.brandMark}>L</span>
            <span><strong>Little Story World</strong><small>PRIVATE ADMIN PORTAL</small></span>
          </Link>
          <AdminLoginForm />
          <p className={styles.footer}>Khu vực riêng tư · Chỉ dành cho quản trị viên được cấp quyền</p>
        </div>
      </section>
    </main>
  );
}
