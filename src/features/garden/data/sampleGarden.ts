import type { FlowerKind } from "@/types/flower";
import type { GardenItem } from "@/types/garden";
import { sampleChapters } from "@/features/stories/data/sampleStory";
import { getFlowerInfo } from "@/features/flowers/data/flowerCatalog";

// NỘI DUNG MẪU cho khu vườn. Sau này dữ liệu này đến từ database (bảng garden_items).

// 1) Vị trí của các bông hoa mở ra chương truyện.
// Màu và loài hoa lấy từ chính chương truyện, không viết lại hai lần.
const chapterPlacements = [
  { chapterId: "chapter-1", x: 24, depth: 0.1, size: 0.62 },
  { chapterId: "chapter-2", x: 41, depth: 0.04, size: 0.64 },
  { chapterId: "chapter-3", x: 59, depth: 0.08, size: 0.64 },
  { chapterId: "chapter-4", x: 77, depth: 0.12, size: 0.62 },
];

const chapterItems: GardenItem[] = chapterPlacements.map((placement) => {
  const index = sampleChapters.findIndex((c) => c.id === placement.chapterId);
  const chapter = sampleChapters[index];
  // Nếu mã chương ghi sai thì báo lỗi rõ ràng.
  if (!chapter) {
    throw new Error(`Không có chương: ${placement.chapterId}`);
  }
  return {
    id: chapter.id,
    kind: chapter.flowerKind,
    color: chapter.flowerColor,
    x: placement.x,
    depth: placement.depth,
    size: placement.size,
    chapterId: chapter.id,
    label: `Chương ${index + 1}`,
    title: chapter.title,
  };
});

// 2) Các bông hoa trang trí. Không ghi màu thì dùng màu mặc định của loài hoa.
const decorPlacements: {
  id: string;
  kind: FlowerKind;
  x: number;
  depth: number;
  size: number;
}[] = [
  { id: "decor-lavender-1", kind: "lavender", x: 9, depth: 0.25, size: 0.58 },
  { id: "decor-cherry-1", kind: "cherry", x: 32, depth: 0.55, size: 0.5 },
  { id: "decor-dandelion-1", kind: "dandelion", x: 50, depth: 0.35, size: 0.52 },
  { id: "decor-lotus-1", kind: "lotus", x: 68, depth: 0.6, size: 0.5 },
  { id: "decor-dandelion-2", kind: "dandelion", x: 91, depth: 0.3, size: 0.52 },
  { id: "decor-daisy-1", kind: "daisy", x: 16, depth: 0.8, size: 0.4 },
  { id: "decor-lavender-2", kind: "lavender", x: 47, depth: 0.9, size: 0.4 },
  { id: "decor-tulip-1", kind: "tulip", x: 85, depth: 0.85, size: 0.4 },
];

const decorItems: GardenItem[] = decorPlacements.map((placement) => ({
  ...placement,
  color: getFlowerInfo(placement.kind).defaultColor,
}));

// Gộp hai nhóm thành danh sách đầy đủ của khu vườn.
export const sampleGarden: GardenItem[] = [...chapterItems, ...decorItems];
