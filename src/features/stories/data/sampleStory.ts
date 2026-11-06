import type { FinalLetter, StoryChapter } from "@/types/story";

// NỘI DUNG MẪU để thử giao diện.
// Khi làm phần Admin + Supabase, cậu sẽ tự viết nội dung riêng cho từng người nhận.

export const sampleChapters: StoryChapter[] = [
  {
    id: "chapter-1",
    flowerKind: "daisy",
    flowerColor: "#ffb3cb",
    title: "Bông cúc đầu tiên",
    paragraphs: [
      "Mọi khu vườn đều bắt đầu từ một hạt giống rất nhỏ. Hạt giống này được gieo vào một ngày bình thường, không có gì đặc biệt, ngoài việc có một người đã nghĩ đến bạn.",
      "Bông cúc là bông hoa đầu tiên nở ra. Nó không rực rỡ nhất, nhưng luôn là bông hoa quay về phía nắng sớm nhất.",
    ],
  },
  {
    id: "chapter-2",
    flowerKind: "tulip",
    flowerColor: "#ff7a8a",
    title: "Ba cánh tulip",
    paragraphs: [
      "Tulip khép cánh lại như đang giữ một điều nhỏ xíu. Có những điều chưa kịp nói thành lời, nên được cất vào đây trước.",
      "Mỗi cánh hoa là một lời nhắn: một lời cảm ơn, một lời xin lỗi, và một lời chúc.",
    ],
  },
  {
    id: "chapter-3",
    flowerKind: "sunflower",
    flowerColor: "#ffc928",
    title: "Hướng dương và ngày nắng",
    paragraphs: [
      "Hướng dương luôn xoay mặt về phía ánh sáng. Vào những ngày trời xám, nó vẫn nhớ đường quay về phía mặt trời.",
      "Nếu có ngày nào bạn thấy mệt, hãy nhớ rằng luôn có một góc vườn đang sáng, dù chỉ một chút.",
    ],
  },
  {
    id: "chapter-4",
    flowerKind: "rose",
    flowerColor: "#e0436a",
    title: "Hoa hồng nhiều lớp",
    paragraphs: [
      "Hoa hồng có rất nhiều lớp cánh. Phải kiên nhẫn đi từng lớp mới thấy được phần ở giữa.",
      "Bạn đã đi qua bốn bông hoa của khu vườn. Còn lại một điều cuối cùng, được cất ở nơi sâu nhất.",
    ],
  },
];

export const sampleLetter: FinalLetter = {
  title: "Lá thư gửi bạn",
  paragraphs: [
    "Cảm ơn bạn đã đi hết khu vườn nhỏ này.",
    "Đây chỉ là thư mẫu để thử giao diện. Khi hoàn thiện, nơi này sẽ là lời nhắn thật dành riêng cho bạn.",
    "Chúc bạn luôn có những ngày bình yên và nhiều nắng.",
  ],
  signature: "Người tặng hoa",
};
