
import type { FlowerKind } from "@/types/flower";
import type { GardenItem } from "@/types/garden";
import type {
  PersonalGarden,
  PersonalGardenRow,
} from "@/types/personalGarden";

const FLOWER_KINDS: FlowerKind[] = [
  "daisy",
  "tulip",
  "sunflower",
  "rose",
  "lavender",
  "cherry",
  "lotus",
  "dandelion",
];

function isFlowerKind(value: string): value is FlowerKind {
  return FLOWER_KINDS.includes(value as FlowerKind);
}

function readParagraphs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (paragraph): paragraph is string =>
      typeof paragraph === "string"
  );
}

export function mapPersonalGarden(
  row: PersonalGardenRow
): PersonalGarden {
  const items: GardenItem[] = [...(row.garden_items ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((item) => isFlowerKind(item.kind))
    .map((item) => ({
      id: item.id,
      kind: item.kind as FlowerKind,
      color: item.color,
      x: item.x,
      depth: item.depth,
      size: item.size,
      chapterId: item.chapter_id ?? undefined,
      label: item.label ?? undefined,
      title: item.title ?? undefined,
    }));

  const chapterFlowers = new Map<string, GardenItem>(
    items
      .filter((item) => item.chapterId)
      .map(
        (item): [string, GardenItem] => [
          item.chapterId as string,
          item,
        ]
      )
  );

  const chapters = [...(row.garden_chapters ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((chapter) => {
      const flower = chapterFlowers.get(chapter.chapter_id);

      return {
        id: chapter.chapter_id,
        title: chapter.title,
        paragraphs: readParagraphs(chapter.paragraphs),
        flowerKind: flower?.kind ?? "daisy",
        flowerColor: flower?.color ?? "#ffb3cb",
      };
    });

  return {
    id: row.id,
    name: row.name,
    introduction: row.introduction ?? "",
    items,
    chapters,
    experienceSettings: row.experience_settings ?? {},
    letter: {
      title: row.letter_title,
      paragraphs: readParagraphs(row.letter_paragraphs),
      signature: row.letter_signature,
    },
  };
}
