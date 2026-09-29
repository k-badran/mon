-- The homepage was briefly built from Figma frame 86:4671 before 3:4 was
-- confirmed as the approved design. A database seeded in that window holds
-- homepage image blocks pointing at files that were deleted with it, so the
-- hero rendered a broken image. Point the hero back at 3:4's photo and drop
-- the blocks for sections 3:4 does not have. Only the exact wrong-version
-- values are touched: a photo an admin chose since is left alone.
UPDATE "content_blocks" SET "value" = '/images/home/hero-right.jpg', "updated_at" = now()
WHERE "section" = 'home' AND "slot" = 'hero.image' AND "value" = '/images/home/hero-truck.jpg';
--> statement-breakpoint
DELETE FROM "content_blocks"
WHERE "section" = 'home' AND "kind" = 'image' AND "slot" IN (
  'hero.taglineImage',
  'values.image',
  'promise.image',
  'experience.team.image',
  'experience.work.image',
  'experience.result.image',
  'services.packing.image',
  'services.assembly.image',
  'services.storage.image'
);
