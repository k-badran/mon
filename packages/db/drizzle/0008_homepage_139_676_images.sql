-- The approved homepage is now frame 139:676 (the 86:4671 design), so 0007's
-- move back to 3:4 is undone for its one changed value: the hero returns to
-- the m.on truck. The sections 0007 dropped come back through the seed, which
-- inserts missing rows. The review avatars belonged to 3:4's reviews section,
-- which the approved homepage does not have, so their blocks go. As in 0007,
-- only the exact seeded values are touched.
UPDATE "content_blocks" SET "value" = '/images/home/hero-truck.jpg', "updated_at" = now()
WHERE "section" = 'home' AND "slot" = 'hero.image' AND "value" = '/images/home/hero-right.jpg';
--> statement-breakpoint
DELETE FROM "content_blocks"
WHERE "section" = 'home' AND "kind" = 'image'
  AND "slot" IN ('reviews.1.avatar', 'reviews.2.avatar', 'reviews.3.avatar');
