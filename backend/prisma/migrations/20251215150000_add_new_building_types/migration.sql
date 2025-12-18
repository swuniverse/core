-- Add new building types for Star Wars Unlimited
-- Migration: Add Shipyard, Research Lab, Defense Grid, Refinery, and Hangar

INSERT INTO "BuildingType" (
  name, 
  description, 
  category, 
  "buildCostCredits", 
  "buildCostMetal", 
  "buildCostCrystal", 
  "buildTime", 
  "energyCost", 
  "energyProduction", 
  "metalProduction", 
  "crystalProduction", 
  "creditProduction", 
  "storageBonus"
) VALUES
-- Shipyard: Builds ships and fleets
(
  'Shipyard',
  'Constructs starships and fighters for your fleet. Required for building any vessels.',
  'PRODUCTION',
  800,      -- buildCostCredits
  400,      -- buildCostMetal
  200,      -- buildCostCrystal
  20,       -- buildTime (20 minutes)
  25,       -- energyCost
  0,        -- energyProduction
  0,        -- metalProduction
  0,        -- crystalProduction
  0,        -- creditProduction
  0         -- storageBonus
),
-- Research Lab: Researches technologies
(
  'Research Lab',
  'Develops new technologies to unlock advanced buildings, ships, and upgrades.',
  'RESEARCH',
  1000,     -- buildCostCredits
  300,      -- buildCostMetal
  500,      -- buildCostCrystal
  25,       -- buildTime (25 minutes)
  20,       -- energyCost
  0,        -- energyProduction
  0,        -- metalProduction
  0,        -- crystalProduction
  0,        -- creditProduction
  0         -- storageBonus
),
-- Defense Grid: Protects the planet
(
  'Defense Grid',
  'Provides planetary defense against enemy fleets. Increases defensive capabilities.',
  'DEFENSE',
  600,      -- buildCostCredits
  500,      -- buildCostMetal
  100,      -- buildCostCrystal
  15,       -- buildTime (15 minutes)
  30,       -- energyCost
  0,        -- energyProduction
  0,        -- metalProduction
  0,        -- crystalProduction
  0,        -- creditProduction
  0         -- storageBonus
),
-- Refinery: Improves resource production
(
  'Refinery',
  'Processes raw materials more efficiently, boosting metal and crystal production.',
  'PRODUCTION',
  700,      -- buildCostCredits
  200,      -- buildCostMetal
  300,      -- buildCostCrystal
  18,       -- buildTime (18 minutes)
  15,       -- energyCost
  0,        -- energyProduction
  15,       -- metalProduction (bonus)
  10,       -- crystalProduction (bonus)
  0,        -- creditProduction
  0         -- storageBonus
),
-- Hangar: Increases fleet capacity
(
  'Hangar',
  'Houses your starships and increases the maximum fleet capacity of this planet.',
  'STORAGE',
  500,      -- buildCostCredits
  300,      -- buildCostMetal
  100,      -- buildCostCrystal
  12,       -- buildTime (12 minutes)
  10,       -- energyCost
  0,        -- energyProduction
  0,        -- metalProduction
  0,        -- crystalProduction
  0,        -- creditProduction
  0         -- storageBonus (will be used for fleet capacity later)
);
