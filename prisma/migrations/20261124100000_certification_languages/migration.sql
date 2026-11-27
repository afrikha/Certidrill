-- The languages of the official exam (blueprint certification.languages), set by the seed.
ALTER TABLE "certification" ADD COLUMN "languages" TEXT[] DEFAULT ARRAY['en', 'fr']::TEXT[];
