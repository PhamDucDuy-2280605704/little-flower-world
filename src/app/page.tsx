import Link from "next/link";
import HomeAuthActions from "@/features/auth/components/HomeAuthActions";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>L</span>
          <span><strong>Little Story World</strong><small>YOUR PERSONAL STORY STUDIO</small></span>
        </Link>
        <nav aria-label="Điều hướng trang chủ">
          <Link href="/" aria-current="page">Trang chủ</Link>
          <Link href="/guest">Dành cho người đọc</Link>
          <Link href="/studio">Không gian sáng tác</Link>
        </nav>
        <Link href="/admin/login" className={styles.adminLink}>Quản trị ↗</Link>
      </header>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>WORDS BECOME MEMORIES</p>
          <h1>Một điều muốn viết. <em>Một cuốn sách để giữ.</em></h1>
          <p className={styles.description}>Mỗi người đều có thể viết câu chuyện của riêng mình. Hãy bắt đầu bằng một thông điệp, một bức thư hoặc cuốn sách nhiều chương; lưu bản nháp và gửi Admin duyệt trước khi chia sẻ với người đọc.</p>
          <div className={styles.primaryActions}>
            <Link href="/studio" className={styles.createButton}>Bắt đầu viết câu chuyện <span>↗</span></Link>
            <Link href="/guest" className={styles.readerButton}>Tôi có một lời mời</Link>
          </div>
          <HomeAuthActions actionsClassName={styles.memberActions} loginClassName={styles.memberLogin} giftClassName={styles.memberGift} messageClassName={styles.authMessage}/>
          <p className={styles.heroFootnote}>Bản nháp riêng tư · Admin kiểm duyệt trước khi xuất bản · Tác phẩm được chia sẻ bằng liên kết an toàn</p>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.photoFrame}><div className={styles.photoLabel}>A STORY, MADE FOR ONE</div></div>
          <div className={styles.photoCaption}><span>01</span><p>Mỗi trang giữ lại một điều anh không muốn quên.</p></div>
        </div>
      </section>
      <section className={styles.formats} aria-labelledby="formats-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>CHOOSE YOUR FORM</p>
          <h2>Ba cách để kể điều muốn nói.</h2>
          <p>Không cần biết thiết kế. Chọn dạng tác phẩm và tập trung vào câu chữ.</p>
        </div>
        <div className={styles.formatGrid}>
          <Link href="/studio" className={styles.formatCard}><span className={styles.formatIcon}>✎</span><small>01 · NGẮN GỌN</small><strong>Thông điệp</strong><p>Một trang viết cho một lời nhắn thật lòng, một lời cảm ơn hoặc một khoảnh khắc muốn lưu giữ.</p><span className={styles.cardAction}>Viết thông điệp ↗</span></Link>
          <Link href="/studio" className={styles.formatCard}><span className={styles.formatIcon}>✉</span><small>02 · RIÊNG TƯ</small><strong>Bức thư</strong><p>Một bức thư có lời mở đầu, những đoạn tâm tình và chữ ký ở cuối trang.</p><span className={styles.cardAction}>Viết bức thư ↗</span></Link>
          <Link href="/studio" className={styles.formatCard}><span className={styles.formatIcon}>▤</span><small>03 · NHIỀU CHƯƠNG</small><strong>Cuốn sách</strong><p>Chia câu chuyện thành từng chương, thêm ảnh kỷ niệm và để người nhận lật từng trang.</p><span className={styles.cardAction}>Tạo cuốn sách ↗</span></Link>
        </div>
      </section>
      <section className={styles.howItWorks}>
        <div className={styles.howPhoto} aria-hidden="true"/>
        <div className={styles.howCopy}>
          <p className={styles.eyebrow}>FROM YOUR DESK TO THEIR HANDS</p>
          <h2>Từ bản thảo riêng tư đến món quà có thể mở ra.</h2>
          <ol>
            <li><span>01</span><div><strong>Tự viết câu chuyện của bạn</strong><p>Đăng nhập tài khoản sáng tác và chọn thông điệp, thư hoặc sách nhiều chương.</p></div></li>
            <li><span>02</span><div><strong>Thêm ảnh và xem trước</strong><p>Tải ảnh của anh lên, lật thử từng trang và chỉnh lại nếu cần.</p></div></li>
            <li><span>03</span><div><strong>Gửi Admin kiểm duyệt</strong><p>Admin xem xét nội dung, quyết định xuất bản và quản lý liên kết chia sẻ.</p></div></li>
          </ol>
          <Link href="/studio" className={styles.textLink}>Mở không gian sáng tác ↗</Link>
        </div>
      </section>
      <footer className={styles.footer}>
        <Link href="/">Little Story World</Link><span>MADE OF WORDS, PHOTOGRAPHS & MEMORIES</span>
        <a href="https://www.pexels.com/photo/open-book-on-desk-19561464/" target="_blank" rel="noreferrer">Ảnh minh họa: Pexels ↗</a>
      </footer>
    </main>
  );
}
