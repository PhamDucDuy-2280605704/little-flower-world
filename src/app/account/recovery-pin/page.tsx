import type { Metadata } from "next";
import Link from "next/link";
import RecoveryPinSetupForm from "@/features/auth/components/RecoveryPinSetupForm";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import styles from "@/app/login/page.module.css";

export const metadata: Metadata = {
  title: "Thiết lập PIN khôi phục · Little Story World",
  description: "Thiết lập mã PIN khôi phục 6 chữ số cho tài khoản Little Story World.",
  robots: { index: false, follow: false },
};

export default function RecoveryPinPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.stage}><span className={styles.stageCaption}>KEEP YOUR STORY SAFE</span></div>
        <div className={styles.formSide}>
          <RecoveryPinSetupForm />
          <Link href="/" className={styles.backLink}>Về trang chủ</Link>
        </div>
      </section>
    </main>
  );
}
