-- Remove the former creator chapter limit; writers may build stories of any length.
drop trigger if exists enforce_creator_chapter_limit on public.garden_chapters;
drop function if exists public.enforce_creator_chapter_limit();
