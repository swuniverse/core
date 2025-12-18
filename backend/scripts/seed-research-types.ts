import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedResearchTypes() {
  console.log('Seeding research types...');

  const researchTypes = [
    // ========== LEVEL 0 - Production-based (Resource accumulation over ticks) ==========
    {
      name: 'Energieeffizienz',
      description: 'Verbesserte Energiesysteme ermöglichen den Bau von Fusionsreaktoren.',
      category: 'ENERGY',
      researchLevel: 0,
      researchPointCost: 0, // Keine FP - produktionsbasiert
      requiredLabCount: 0,
      requiredEnergyPerTick: 50, // Benötigt 50 Energie/Tick Produktion
      requiredEnergyTotal: 150, // 150 Total = 3 Ticks bei 50/Tick
      unlocksBuilding: 'Fusionsreaktor',
    },
    {
      name: 'Fortgeschrittener Bergbau',
      description: 'Automatisierte Bergbautechnologie für höhere Durastahl-Ausbeute.',
      category: 'ECONOMICS',
      researchLevel: 0,
      researchPointCost: 0, // Keine FP - produktionsbasiert
      requiredLabCount: 0,
      requiredDurastahlPerTick: 30, // Benötigt 30 Durastahl/Tick Produktion
      requiredDurastahlTotal: 60, // 60 Total = 2 Ticks bei 30/Tick
      unlocksBuilding: 'Automatisierte Mine',
    },
    {
      name: 'Kristallverarbeitung',
      description: 'Synthetische Kristallproduktion für fortgeschrittene Technologie.',
      category: 'SCIENCE',
      researchLevel: 0,
      researchPointCost: 0, // Keine FP - produktionsbasiert
      requiredLabCount: 0,
      requiredKristallinesSiliziumPerTick: 20, // Benötigt 20 Kristall/Tick Produktion
      requiredKristallinesSiliziumTotal: 60, // 60 Total = 3 Ticks bei 20/Tick
      unlocksBuilding: 'Kristallsyntheseanlage',
    },

    // ========== LEVEL 1 - Basic Research (100-300 FP) ==========
    // MILITARY
    {
      name: 'Leichte Jäger',
      description: 'Ermöglicht den Bau von TIE-Jägern und X-Wing-Jägern.',
      category: 'MILITARY',
      researchLevel: 1,
      researchPointCost: 150,
      requiredLabCount: 1,
      unlocksShip: 'TIE-Jäger',
    },
    {
      name: 'Bomber-Technologie',
      description: 'Freischaltung von TIE-Bombern und Y-Wing-Bombern für schwere Angriffe.',
      category: 'MILITARY',
      researchLevel: 1,
      researchPointCost: 180,
      requiredLabCount: 1,
      unlocksShip: 'Y-Wing',
    },
    {
      name: 'Waffensysteme I',
      description: 'Grundlegende Verteidigungssysteme für planetare Abwehr.',
      category: 'MILITARY',
      researchLevel: 1,
      researchPointCost: 200,
      requiredLabCount: 1,
      unlocksBuilding: 'Plasmaturm',
    },
    {
      name: 'Turbolaser',
      description: 'Schwere Laserwaffentechnologie für Planeten- und Schiffsverteidigung.',
      category: 'MILITARY',
      researchLevel: 1,
      researchPointCost: 250,
      requiredLabCount: 1,
      bonusType: 'DEFENSE_BONUS',
      bonusValue: 15, // +15% defense
    },

    // ECONOMICS
    {
      name: 'Handelsnetzwerk',
      description: 'Verbesserte Handelsrouten generieren mehr Credits.',
      category: 'ECONOMICS',
      researchLevel: 1,
      researchPointCost: 100,
      requiredLabCount: 1,
      bonusType: 'TRADE_BONUS',
      bonusValue: 20, // +20% trade hub income
    },
    {
      name: 'Bergbauoptimierung',
      description: 'Effizientere Abbaumethoden erhöhen die Ressourcenausbeute.',
      category: 'ECONOMICS',
      researchLevel: 1,
      researchPointCost: 120,
      requiredLabCount: 1,
      bonusType: 'MINING_BONUS',
      bonusValue: 10, // +10% mining production
    },
    {
      name: 'Steuerverwaltung',
      description: 'Verbesserte Verwaltung generiert zusätzliche Credits aus Planeten.',
      category: 'ECONOMICS',
      researchLevel: 1,
      researchPointCost: 140,
      requiredLabCount: 1,
      bonusType: 'CREDIT_BONUS',
      bonusValue: 15, // +15% credit production
    },

    // ENERGY
    {
      name: 'Erweiterte Energiesysteme',
      description: 'Schaltet verbesserte Energiegebäude frei.',
      category: 'ENERGY',
      researchLevel: 1,
      researchPointCost: 120,
      requiredLabCount: 1,
      unlocksBuilding: 'Erweiterte Solarzellen',
    },
    {
      name: 'Energieeffizienz I',
      description: 'Reduziert den Energieverbrauch aller Gebäude um 10%.',
      category: 'ENERGY',
      researchLevel: 1,
      researchPointCost: 160,
      requiredLabCount: 1,
      bonusType: 'ENERGY_EFFICIENCY',
      bonusValue: 10,
    },

    // SCIENCE
    {
      name: 'Computerforschung I',
      description: 'Verbesserte Datenverarbeitung erhöht die Forschungsgeschwindigkeit.',
      category: 'SCIENCE',
      researchLevel: 1,
      researchPointCost: 200,
      requiredLabCount: 1,
      bonusType: 'RESEARCH_BONUS',
      bonusValue: 10, // +10% FP generation
    },

    // ========== LEVEL 2 - Advanced Research (500-1000 FP) ==========
    // MILITARY
    {
      name: 'Schwere Jäger',
      description: 'Fortgeschrittene Jägertechnologie: A-Wing und TIE-Interceptor.',
      category: 'MILITARY',
      researchLevel: 2,
      researchPointCost: 600,
      requiredLabCount: 2,
      unlocksShip: 'A-Wing',
    },
    {
      name: 'Korvetten-Konstruktion',
      description: 'Kleinere Großkampfschiffe für Patrouillen und schnelle Angriffe.',
      category: 'MILITARY',
      researchLevel: 2,
      researchPointCost: 800,
      requiredLabCount: 2,
      unlocksShip: 'Korvette',
    },
    {
      name: 'Fregatten-Technologie',
      description: 'Mittlere Kampfschiffe mit ausgewogener Bewaffnung.',
      category: 'MILITARY',
      researchLevel: 2,
      researchPointCost: 1000,
      requiredLabCount: 2,
      unlocksShip: 'Fregatte',
    },
    {
      name: 'Schildtechnologie',
      description: 'Energieschilde für planetare und Schiffsverteidigung.',
      category: 'MILITARY',
      researchLevel: 2,
      researchPointCost: 700,
      requiredLabCount: 2,
      unlocksBuilding: 'Planetarer Schild',
    },
    {
      name: 'Ionenwaffen',
      description: 'Ionenkanonen deaktivieren feindliche Schiffssysteme ohne Zerstörung.',
      category: 'MILITARY',
      researchLevel: 2,
      researchPointCost: 650,
      requiredLabCount: 2,
      bonusType: 'SPECIAL_WEAPON',
      bonusValue: 1, // Unlocks ion weapons
    },

    // ECONOMICS
    {
      name: 'Hyperraum-Handelsrouten',
      description: 'Schnellere Handelsschiffe erhöhen die Einnahmen drastisch.',
      category: 'ECONOMICS',
      researchLevel: 2,
      researchPointCost: 500,
      requiredLabCount: 2,
      bonusType: 'TRADE_BONUS',
      bonusValue: 35, // +35% trade income (total with Level 1)
    },
    {
      name: 'Fortgeschrittene Raffination',
      description: 'Verbesserte Ressourcenverarbeitung für höhere Ausbeuten.',
      category: 'ECONOMICS',
      researchLevel: 2,
      researchPointCost: 600,
      requiredLabCount: 2,
      bonusType: 'REFINING_BONUS',
      bonusValue: 20, // +20% resource refining
    },
    {
      name: 'Automatisierte Produktion',
      description: 'Roboter und Droiden steigern die Produktionseffizienz.',
      category: 'ECONOMICS',
      researchLevel: 2,
      researchPointCost: 750,
      requiredLabCount: 2,
      bonusType: 'PRODUCTION_BONUS',
      bonusValue: 15, // +15% all production
    },

    // ENERGY
    {
      name: 'Fusionsreaktor-Technologie',
      description: 'Hochleistungs-Energieproduktion durch Fusionsreaktoren.',
      category: 'ENERGY',
      researchLevel: 2,
      researchPointCost: 700,
      requiredLabCount: 2,
      unlocksBuilding: 'Fusionsreaktor',
    },
    {
      name: 'Energieeffizienz II',
      description: 'Weitere Reduktion des Energieverbrauchs um 15%.',
      category: 'ENERGY',
      researchLevel: 2,
      researchPointCost: 550,
      requiredLabCount: 2,
      bonusType: 'ENERGY_EFFICIENCY',
      bonusValue: 15,
    },

    // SCIENCE
    {
      name: 'Computerforschung II',
      description: 'Supercomputer verdoppeln die Forschungsgeschwindigkeit.',
      category: 'SCIENCE',
      researchLevel: 2,
      researchPointCost: 800,
      requiredLabCount: 2,
      bonusType: 'RESEARCH_BONUS',
      bonusValue: 25, // +25% FP generation
    },
    {
      name: 'Kyber-Kristall-Forschung',
      description: 'Verständnis der Kyber-Kristalle ermöglicht fortgeschrittene Waffen.',
      category: 'SCIENCE',
      researchLevel: 2,
      researchPointCost: 900,
      requiredLabCount: 2,
      bonusType: 'KYBER_RESEARCH',
      bonusValue: 1, // Unlocks kyber-based weapons
    },

    // ========== LEVEL 3 - Master Research (2000-5000 FP) ==========
    // MILITARY
    {
      name: 'Sternzerstörer-Konstruktion',
      description: 'Ermöglicht den Bau von Imperialen Sternzerstörern.',
      category: 'MILITARY',
      researchLevel: 3,
      researchPointCost: 3000,
      requiredLabCount: 5,
      unlocksShip: 'Imperialer Sternzerstörer',
    },
    {
      name: 'Mon Calamari Schiffsbau',
      description: 'Organische Schiffskonstruktion der Rebellen für massive Kreuzer.',
      category: 'MILITARY',
      researchLevel: 3,
      researchPointCost: 3500,
      requiredLabCount: 5,
      unlocksShip: 'Mon Calamari Kreuzer',
    },
    {
      name: 'Superlaser-Technologie',
      description: 'Ultimative Waffentechnologie - Planetenzerstörende Waffen.',
      category: 'MILITARY',
      researchLevel: 3,
      researchPointCost: 10000,
      requiredLabCount: 10,
      unlocksBuilding: 'Superlaser-Plattform',
    },
    {
      name: 'Todesstern-Prototyp',
      description: 'Blaupausen für die ultimative Waffe des Imperiums.',
      category: 'MILITARY',
      researchLevel: 3,
      researchPointCost: 50000,
      requiredLabCount: 20,
      bonusType: 'SUPERWEAPON',
      bonusValue: 1,
    },

    // ECONOMICS
    {
      name: 'Galaktisches Handelsnetz',
      description: 'Galaxisweites Handelsnetzwerk mit allen Sektoren.',
      category: 'ECONOMICS',
      researchLevel: 3,
      researchPointCost: 2500,
      requiredLabCount: 5,
      bonusType: 'TRADE_BONUS',
      bonusValue: 60, // +60% trade income
    },
    {
      name: 'Synthetische Ressourcen',
      description: 'Künstliche Herstellung seltener Ressourcen.',
      category: 'ECONOMICS',
      researchLevel: 3,
      researchPointCost: 4000,
      requiredLabCount: 7,
      bonusType: 'SYNTHETIC_PRODUCTION',
      bonusValue: 1, // Enables synthetic rare resource production
    },

    // ENERGY
    {
      name: 'Hyperreaktor',
      description: 'Hyperraum-Energiegewinnung für massive Energiemengen.',
      category: 'ENERGY',
      researchLevel: 3,
      researchPointCost: 3500,
      requiredLabCount: 6,
      unlocksBuilding: 'Hyperreaktor',
    },
    {
      name: 'Nullpunkt-Energie',
      description: 'Theoretische Physik ermöglicht unbegrenzte Energieversorgung.',
      category: 'ENERGY',
      researchLevel: 3,
      researchPointCost: 8000,
      requiredLabCount: 10,
      bonusType: 'ZERO_POINT_ENERGY',
      bonusValue: 1,
    },

    // SCIENCE
    {
      name: 'Planetare Terraformung',
      description: 'Verändert Planetentypen und erschließt neue Ressourcen.',
      category: 'SCIENCE',
      researchLevel: 3,
      researchPointCost: 5000,
      requiredLabCount: 7,
      bonusType: 'TERRAFORMING',
      bonusValue: 1,
    },
    {
      name: 'Klontechnologie',
      description: 'Klonproduktion für beschleunigte Bevölkerungswachstum.',
      category: 'SCIENCE',
      researchLevel: 3,
      researchPointCost: 6000,
      requiredLabCount: 8,
      bonusType: 'CLONE_PRODUCTION',
      bonusValue: 1,
    },
    {
      name: 'Macht-Forschung',
      description: 'Verständnis der Macht ermöglicht einzigartige Technologien.',
      category: 'SCIENCE',
      researchLevel: 3,
      researchPointCost: 15000,
      requiredLabCount: 15,
      bonusType: 'FORCE_RESEARCH',
      bonusValue: 1,
    },
  ];

  // Create or update all research types
  for (const research of researchTypes) {
    const existing = await prisma.researchType.findUnique({
      where: { name: research.name },
    });

    if (existing) {
      await prisma.researchType.update({
        where: { name: research.name },
        data: research,
      });
      console.log(`✓ Updated ${research.name} (Level ${research.researchLevel}, Cost: ${research.researchPointCost} FP)`);
    } else {
      await prisma.researchType.create({
        data: research,
      });
      console.log(`✓ Created ${research.name} (Level ${research.researchLevel})`);
    }
  }

  // Set prerequisites (after all are created)
  const prerequisites = [
    // Military chain
    { from: 'Leichte Jäger', to: 'Schwere Jäger' },
    { from: 'Schwere Jäger', to: 'Korvetten-Konstruktion' },
    { from: 'Korvetten-Konstruktion', to: 'Fregatten-Technologie' },
    { from: 'Fregatten-Technologie', to: 'Sternzerstörer-Konstruktion' },
    { from: 'Fregatten-Technologie', to: 'Mon Calamari Schiffsbau' },
    { from: 'Turbolaser', to: 'Ionenwaffen' },
    { from: 'Waffensysteme I', to: 'Schildtechnologie' },
    { from: 'Sternzerstörer-Konstruktion', to: 'Superlaser-Technologie' },
    { from: 'Superlaser-Technologie', to: 'Todesstern-Prototyp' },
    
    // Economics chain
    { from: 'Handelsnetzwerk', to: 'Hyperraum-Handelsrouten' },
    { from: 'Hyperraum-Handelsrouten', to: 'Galaktisches Handelsnetz' },
    { from: 'Bergbauoptimierung', to: 'Fortgeschrittene Raffination' },
    { from: 'Fortgeschrittene Raffination', to: 'Synthetische Ressourcen' },
    
    // Energy chain
    { from: 'Erweiterte Energiesysteme', to: 'Fusionsreaktor-Technologie' },
    { from: 'Fusionsreaktor-Technologie', to: 'Hyperreaktor' },
    { from: 'Hyperreaktor', to: 'Nullpunkt-Energie' },
    { from: 'Energieeffizienz I', to: 'Energieeffizienz II' },
    
    // Science chain
    { from: 'Computerforschung I', to: 'Computerforschung II' },
    { from: 'Computerforschung II', to: 'Kyber-Kristall-Forschung' },
    { from: 'Kyber-Kristall-Forschung', to: 'Macht-Forschung' },
  ];

  for (const { from, to } of prerequisites) {
    const fromResearch = await prisma.researchType.findUnique({ where: { name: from } });
    const toResearch = await prisma.researchType.findUnique({ where: { name: to } });

    if (fromResearch && toResearch) {
      await prisma.researchType.update({
        where: { id: toResearch.id },
        data: { prerequisiteId: fromResearch.id },
      });
      console.log(`✓ Set ${from} as prerequisite for ${to}`);
    }
  }

  console.log('Done!');
}

seedResearchTypes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
