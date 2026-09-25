INSERT INTO "Reminder" ("id", "distributionId", "kind", "scheduledFor", "channel")
SELECT
  'cl15' || substr(md5(d.id || d.dueDate::text), 1, 22),
  d.id,
  'DAYS_15',
  d."dueDate" - INTERVAL '15 days',
  'LOG'
FROM "Distribution" d
WHERE NOT EXISTS (
  SELECT 1
  FROM "Reminder" r
  WHERE r."distributionId" = d.id AND r.kind = 'DAYS_15'
);