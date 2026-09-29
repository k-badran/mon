-- The site's chrome is drawn around /images/brand/logo.png (the mark exported
-- from Figma, padded to the nav bar's 86x47 box), but the brand.logo setting
-- was seeded with the tighter /images/logo.svg and nothing read it. Now that
-- the header, footer and sign-in pages render the setting, move rows still on
-- the old seeded value so the logo keeps the size the design draws. A value an
-- admin changed is left alone.
UPDATE "site_settings" SET "value" = '/images/brand/logo.png' WHERE "key" = 'brand.logo' AND "value" = '/images/logo.svg';
