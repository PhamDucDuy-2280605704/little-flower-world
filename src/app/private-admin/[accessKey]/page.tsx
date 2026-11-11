import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AdminLoginForm from "@/features/admin/components/AdminLoginForm";
import styles from "@/app/admin/login/page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private access · Little Story World",
  description: "Private sign-in.",
  robots: { index: false, follow: false },
};

type PrivatePortalPageProps = {
  params: Promise<{ accessKey: string }>;
};

export default async function PrivateAdminPortalPage({ params }: PrivatePortalPageProps) {
  const { accessKey } = await params;
  const expectedAccessKey = process.env.ADMIN_PORTAL_ACCESS_KEY;

  if (!expectedAccessKey || accessKey !== expectedAccessKey) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.illustration} aria-hidden="true">
          <p className={styles.artCaption}>WORDS BECOME MEMORIES</p>
        </div>
        <div className={styles.formSide}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>L</span>
            <span><strong>Little Story World</strong><small>PRIVATE ADMIN ACCESS</small></span>
          </div>
          <AdminLoginForm accessKey={accessKey} />
          <p className={styles.footer}>Cổng riêng · Chỉ người được cấp địa chỉ và tài khoản Admin mới có thể tiếp tục</p>
          <Link className={styles.backLink} href="/">Về trang chủ</Link>
        </div>
      </section>
    </main>
  );
}
