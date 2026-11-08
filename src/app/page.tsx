"use client";

import Link from "next/link";
import HomeAuthActions from "@/features/auth/components/HomeAuthActions";
import styles from "./page.module.css";
import { useLanguage } from "@/features/i18n/LanguageProvider";

export default function Home() {
  const { t } = useLanguage();
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>L</span>
          <span><strong>Little Story World</strong><small>YOUR PERSONAL STORY STUDIO</small></span>
        </Link>
        <nav aria-label={t("Điều hướng trang chủ", "Main navigation")}>
          <Link href="/" aria-current="page">{t("Trang chủ", "Home")}</Link>
          <Link href="/guest">{t("Dành cho người đọc", "For readers")}</Link>
          <Link href="/studio">{t("Không gian sáng tác", "Writing studio")}</Link>
        </nav>
      </header>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>WORDS BECOME MEMORIES</p>
          <h1>{t("Một điều muốn viết.", "Something worth writing.")} <em>{t("Một cuốn sách để giữ.", "A story worth keeping.")}</em></h1>
          <p className={styles.description}>{t("Mỗi người đều có thể viết câu chuyện của riêng mình. Hãy bắt đầu bằng một thông điệp, một bức thư hoặc cuốn sách nhiều chương; lưu bản nháp và gửi Admin duyệt trước khi chia sẻ với người đọc.", "Everyone can write their own story. Start with a message, a letter, or a multi-chapter book; save a private draft and submit it for Admin review before sharing it with readers.")}</p>
          <div className={styles.primaryActions}>
            <Link href="/studio" className={styles.createButton}>{t("Bắt đầu viết câu chuyện", "Start writing your story")} <span>↗</span></Link>
            <Link href="/guest" className={styles.readerButton}>{t("Tôi có một lời mời", "I have an invitation")}</Link>
          </div>
          <HomeAuthActions actionsClassName={styles.memberActions} loginClassName={styles.memberLogin} giftClassName={styles.memberGift} messageClassName={styles.authMessage}/>
          <p className={styles.heroFootnote}>{t("Bản nháp riêng tư · Admin kiểm duyệt trước khi xuất bản · Tác phẩm được chia sẻ bằng liên kết an toàn", "Private drafts · Admin review before publication · Stories shared through secure links")}</p>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.photoFrame}><div className={styles.photoLabel}>A STORY, MADE FOR ONE</div></div>
          <div className={styles.photoCaption}><span>01</span><p>{t("Mỗi trang giữ lại một điều bạn không muốn quên.", "Every page keeps something you do not want to forget.")}</p></div>
        </div>
      </section>
      <section className={styles.formats} aria-labelledby="formats-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>CHOOSE YOUR FORM</p>
          <h2>{t("Ba cách để kể điều muốn nói.", "Three ways to tell your story.")}</h2>
          <p>{t("Không cần biết thiết kế. Chọn dạng tác phẩm và tập trung vào câu chữ.", "No design skills needed. Choose a format and focus on your words.")}</p>
        </div>
        <div className={styles.formatGrid}>
          <Link href="/studio" className={styles.formatCard}><span className={styles.formatIcon}>✎</span><small>01 · {t("NGẮN GỌN", "SHORT & SWEET")}</small><strong>{t("Thông điệp", "Message")}</strong><p>{t("Một trang viết cho một lời nhắn thật lòng, một lời cảm ơn hoặc một khoảnh khắc muốn lưu giữ.", "One page for a heartfelt note, a thank-you, or a moment worth remembering.")}</p><span className={styles.cardAction}>{t("Viết thông điệp", "Write a message")} ↗</span></Link>
          <Link href="/studio" className={styles.formatCard}><span className={styles.formatIcon}>✉</span><small>02 · {t("RIÊNG TƯ", "PERSONAL")}</small><strong>{t("Bức thư", "Letter")}</strong><p>{t("Một bức thư có lời mở đầu, những đoạn tâm tình và chữ ký ở cuối trang.", "A letter with an introduction, personal paragraphs, and your signature.")}</p><span className={styles.cardAction}>{t("Viết bức thư", "Write a letter")} ↗</span></Link>
          <Link href="/studio" className={styles.formatCard}><span className={styles.formatIcon}>▤</span><small>03 · {t("NHIỀU CHƯƠNG", "CHAPTER BY CHAPTER")}</small><strong>{t("Cuốn sách", "Book")}</strong><p>{t("Chia câu chuyện thành từng chương, thêm ảnh kỷ niệm và để người nhận lật từng trang.", "Build your story chapter by chapter, add photos, and let readers turn every page.")}</p><span className={styles.cardAction}>{t("Tạo cuốn sách", "Create a book")} ↗</span></Link>
        </div>
      </section>
      <section className={styles.howItWorks}>
        <div className={styles.howPhoto} aria-hidden="true"/>
        <div className={styles.howCopy}>
          <p className={styles.eyebrow}>FROM YOUR DESK TO THEIR HANDS</p>
          <h2>{t("Từ bản thảo riêng tư đến món quà có thể mở ra.", "From a private draft to a gift they can open.")}</h2>
          <ol>
            <li><span>01</span><div><strong>{t("Tự viết câu chuyện của bạn", "Write your own story")}</strong><p>{t("Đăng nhập tài khoản sáng tác và chọn thông điệp, thư hoặc sách nhiều chương.", "Sign in to your writer account and choose a message, letter, or multi-chapter book.")}</p></div></li>
            <li><span>02</span><div><strong>{t("Thêm ảnh và xem trước", "Add photos and preview")}</strong><p>{t("Tải ảnh của bạn lên, lật thử từng trang và chỉnh lại nếu cần.", "Upload your photos, turn through the pages, and make any changes you need.")}</p></div></li>
            <li><span>03</span><div><strong>{t("Gửi Admin kiểm duyệt", "Submit for Admin review")}</strong><p>{t("Admin xem xét nội dung, quyết định xuất bản và quản lý liên kết chia sẻ.", "Admin reviews the content, approves publication, and manages the sharing link.")}</p></div></li>
          </ol>
          <Link href="/studio" className={styles.textLink}>{t("Mở không gian sáng tác", "Open the writing studio")} ↗</Link>
        </div>
      </section>
      <footer className={styles.footer}>
        <Link href="/">Little Story World</Link><span>MADE OF WORDS, PHOTOGRAPHS & MEMORIES</span>
        <a href="https://www.pexels.com/photo/open-book-on-desk-19561464/" target="_blank" rel="noreferrer">{t("Ảnh minh họa: Pexels", "Photo: Pexels")} ↗</a>
      </footer>
    </main>
  );
}
