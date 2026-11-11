import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminRecoveryPinSetupForm from "@/features/admin/components/AdminRecoveryPinSetupForm";
import styles from "@/app/admin/login/page.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin recovery PIN · Little Story World", robots: { index: false, follow: false } };

export default async function AdminRecoveryPinPage({ params }: { params: Promise<{ accessKey: string }> }) {
  const { accessKey } = await params;
  const expectedAccessKey = process.env.ADMIN_PORTAL_ACCESS_KEY;
  if (!expectedAccessKey || accessKey !== expectedAccessKey) notFound();
  return <main className={styles.page}><section className={styles.shell}>
    <div className={styles.illustration} aria-hidden="true"><p className={styles.artCaption}>SECURE YOUR STORY WORLD</p></div>
    <div className={styles.formSide}><div className={styles.brand}><span className={styles.brandMark}>L</span><span><strong>Little Story World</strong><small>ADMIN SECURITY SETUP</small></span></div>
      <AdminRecoveryPinSetupForm />
    </div>
  </section></main>;
}
