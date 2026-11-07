-- TEMPLATE: create one fully personalized garden for one Auth user.
-- Run in Supabase Dashboard > SQL Editor as project owner.
-- 1) Replace the placeholder UUID below with the user's ID from Authentication > Users.
-- 2) Rewrite the garden name, introduction, chapter text, flower choices/positions and letter.
-- 3) Run this script once for that user. A user can have only one garden.

do $$
declare
  target_user_id uuid := '00000000-0000-0000-0000-000000000000';
  new_garden_id uuid;
  chapter_1_id text;
  chapter_2_id text;
  chapter_3_id text;
  chapter_4_id text;
begin
  if target_user_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Replace target_user_id with the real Auth user UUID before running this template.';
  end if;

  insert into public.gardens (
    owner_id,
    name,
    introduction,
    letter_title,
    letter_paragraphs,
    letter_signature
  )
  values (
    target_user_id,
    'Khu vườn dành riêng cho bạn',
    'Mỗi bông hoa ở đây đều được chọn để dành tặng riêng cho bạn.',
    'Một lá thư dành riêng cho bạn',
    jsonb_build_array(
      'Đây là đoạn đầu tiên của lá thư. Hãy thay bằng lời nhắn của riêng bạn.',
      'Đây là đoạn tiếp theo. Bạn có thể thêm hoặc bớt các đoạn văn.'
    ),
    'Người tặng hoa'
  )
  returning id into new_garden_id;

  -- Give each chapter a garden-specific ID so old shared-demo progress is not reused.
  chapter_1_id := new_garden_id::text || '-chapter-1';
  chapter_2_id := new_garden_id::text || '-chapter-2';
  chapter_3_id := new_garden_id::text || '-chapter-3';
  chapter_4_id := new_garden_id::text || '-chapter-4';

  insert into public.garden_chapters (
    garden_id, chapter_id, sort_order, title, paragraphs
  )
  values
    (
      new_garden_id, chapter_1_id, 1, 'Tên chương thứ nhất',
      jsonb_build_array('Nội dung đoạn thứ nhất.', 'Nội dung đoạn thứ hai.')
    ),
    (
      new_garden_id, chapter_2_id, 2, 'Tên chương thứ hai',
      jsonb_build_array('Nội dung câu chuyện riêng của chương hai.')
    ),
    (
      new_garden_id, chapter_3_id, 3, 'Tên chương thứ ba',
      jsonb_build_array('Nội dung câu chuyện riêng của chương ba.')
    ),
    (
      new_garden_id, chapter_4_id, 4, 'Tên chương thứ tư',
      jsonb_build_array('Nội dung câu chuyện riêng của chương bốn.')
    );

  -- Mỗi dòng có chapter_id sẽ tạo một bông hoa mở chương tương ứng.
  insert into public.garden_items (
    garden_id, kind, color, x, depth, size,
    chapter_id, label, title, sort_order
  )
  values
    (new_garden_id, 'daisy', '#ffb3cb', 24, 0.10, 0.62, chapter_1_id, 'Chương 1', 'Tên chương thứ nhất', 1),
    (new_garden_id, 'tulip', '#ff7a8a', 41, 0.04, 0.64, chapter_2_id, 'Chương 2', 'Tên chương thứ hai', 2),
    (new_garden_id, 'sunflower', '#ffc928', 59, 0.08, 0.64, chapter_3_id, 'Chương 3', 'Tên chương thứ ba', 3),
    (new_garden_id, 'rose', '#e0436a', 77, 0.12, 0.62, chapter_4_id, 'Chương 4', 'Tên chương thứ tư', 4);

  -- Các bông hoa trang trí không mở chương: để chapter_id là NULL.
  insert into public.garden_items (
    garden_id, kind, color, x, depth, size, sort_order
  )
  values
    (new_garden_id, 'lavender', '#a78bfa', 9, 0.25, 0.58, 5),
    (new_garden_id, 'cherry', '#ffb3cb', 32, 0.55, 0.50, 6),
    (new_garden_id, 'dandelion', '#fff4a8', 50, 0.35, 0.52, 7),
    (new_garden_id, 'lotus', '#f5a6d3', 68, 0.60, 0.50, 8),
    (new_garden_id, 'daisy', '#fff1a8', 16, 0.80, 0.40, 9),
    (new_garden_id, 'tulip', '#ff9eaa', 85, 0.85, 0.40, 10);
end $$;
