import type { FlowerKind } from "@/types/flower";

// Một chương câu chuyện. Mỗi chương gắn với một bông hoa trong vườn.
// Sau này, dữ liệu kiểu này sẽ đến từ bảng "story_chapters" trong database.
export type StoryChapter = {
  id: string; // mã định danh duy nhất, dùng để nhớ chương nào đã đọc
  flowerKind: FlowerKind; // loài hoa mở ra chương này
  flowerColor: string; // màu của bông hoa
  title: string;
  paragraphs: string[]; // mỗi phần tử là một đoạn văn
};

// Bức thư cuối cùng, hé lộ sau khi đọc hết các chương.
export type FinalLetter = {
  title: string;
  paragraphs: string[];
  signature: string;
};
