
import type { GardenItem } from "@/types/garden";
import type { FinalLetter, StoryChapter } from "@/types/story";

export type PersonalGarden = {
  id: string;
  name: string;
  introduction: string;
  items: GardenItem[];
  chapters: StoryChapter[];
  letter: FinalLetter;
};

export type PersonalGardenRow = {
  id: string;
  name: string;
  introduction: string | null;
  letter_title: string;
  letter_paragraphs: unknown;
  letter_signature: string;

  garden_items:
    | Array<{
        id: string;
        kind: string;
        color: string;
        x: number;
        depth: number;
        size: number;
        chapter_id: string | null;
        label: string | null;
        title: string | null;
        sort_order: number;
      }>
    | null;

  garden_chapters:
    | Array<{
        chapter_id: string;
        sort_order: number;
        title: string;
        paragraphs: unknown;
      }>
    | null;
};
