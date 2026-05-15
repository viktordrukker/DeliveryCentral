-- F-7.2 rollback — re-apply the 'AU' default.
ALTER TABLE "public_holidays"
  ALTER COLUMN "countryCode" SET DEFAULT 'AU';
