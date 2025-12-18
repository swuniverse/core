-- Add layer concept to planet fields for STU-style layout
-- Layout: 2 rows ORBIT, 6 rows SURFACE, 2 rows UNDERGROUND (total 10 rows, 10 columns)

-- Add fieldLayer column to PlanetField
ALTER TABLE "PlanetField" ADD COLUMN "fieldLayer" TEXT;

-- Set layer based on y coordinate for existing fields
UPDATE "PlanetField" SET "fieldLayer" = 
  CASE 
    WHEN y <= 1 THEN 'ORBIT'
    WHEN y <= 7 THEN 'SURFACE'
    ELSE 'UNDERGROUND'
  END;

-- Make fieldLayer required
ALTER TABLE "PlanetField" ALTER COLUMN "fieldLayer" SET NOT NULL;

-- Update fieldType logic:
-- ORBIT: Only SPACE type
-- SURFACE: LAND, WATER, MOUNTAIN (existing logic)
-- UNDERGROUND: ROCK, CRYSTAL, METAL (for underground resources)

UPDATE "PlanetField" SET "fieldType" = 'SPACE' WHERE "fieldLayer" = 'ORBIT';
UPDATE "PlanetField" SET "fieldType" = 'ROCK' WHERE "fieldLayer" = 'UNDERGROUND' AND "fieldType" NOT IN ('ROCK', 'CRYSTAL', 'METAL');
