import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedShipTypes() {
  console.log('Seeding ship types...');

  const shipTypes = [
    // ========== LEICHTE JÄGER (FIGHTER) ==========
    {
      name: 'TIE-Jäger',
      description: 'Standard-Raumjäger des Imperiums. Schnell und wendig, aber ohne Schilde.',
      shipClass: 'FIGHTER',
      buildCost: 500,
      buildCostDurastahl: 100,
      buildCostKristallinesSilizium: 50,
      buildTime: 5, // minutes
      crewRequired: 1,
      cargoCapacity: 0,
      fuelCapacity: 100,
      speed: 120,
      attack: 15,
      defense: 5,
      requiredResearch: 'Leichte Jäger',
    },
    {
      name: 'X-Wing',
      description: 'Vielseitiger Jäger der Rebellen mit Schilden und Hyperantrieb.',
      shipClass: 'FIGHTER',
      buildCost: 700,
      buildCostDurastahl: 120,
      buildCostKristallinesSilizium: 80,
      buildCostEnergiemodule: 10,
      buildTime: 6,
      crewRequired: 1,
      cargoCapacity: 20,
      fuelCapacity: 150,
      speed: 100,
      attack: 18,
      defense: 12,
      requiredResearch: 'Leichte Jäger',
    },
    {
      name: 'TIE-Interceptor',
      description: 'Verbesserte TIE-Variante mit höherer Geschwindigkeit und Feuerkraft.',
      shipClass: 'FIGHTER',
      buildCost: 800,
      buildCostDurastahl: 150,
      buildCostKristallinesSilizium: 70,
      buildCostEnergiemodule: 5,
      buildTime: 7,
      crewRequired: 1,
      cargoCapacity: 0,
      fuelCapacity: 120,
      speed: 150,
      attack: 22,
      defense: 7,
      requiredResearch: 'Schwere Jäger',
    },
    {
      name: 'A-Wing',
      description: 'Schnellster Jäger der Rebellen-Allianz.',
      shipClass: 'FIGHTER',
      buildCost: 900,
      buildCostDurastahl: 140,
      buildCostKristallinesSilizium: 90,
      buildCostEnergiemodule: 15,
      buildTime: 7,
      crewRequired: 1,
      cargoCapacity: 15,
      fuelCapacity: 140,
      speed: 160,
      attack: 20,
      defense: 10,
      requiredResearch: 'Schwere Jäger',
    },

    // ========== BOMBER ==========
    {
      name: 'TIE-Bomber',
      description: 'Schwerer Bomber des Imperiums für Angriffe auf Großschiffe.',
      shipClass: 'BOMBER',
      buildCost: 1200,
      buildCostDurastahl: 200,
      buildCostKristallinesSilizium: 100,
      buildCostTibannaGas: 20,
      buildTime: 10,
      crewRequired: 1,
      cargoCapacity: 50,
      fuelCapacity: 130,
      speed: 70,
      attack: 35,
      defense: 8,
      requiredResearch: 'Bomber-Technologie',
    },
    {
      name: 'Y-Wing',
      description: 'Robuster Bomber mit Ionenkanonen und Torpedos.',
      shipClass: 'BOMBER',
      buildCost: 1400,
      buildCostDurastahl: 220,
      buildCostKristallinesSilizium: 120,
      buildCostTibannaGas: 30,
      buildCostEnergiemodule: 10,
      buildTime: 12,
      crewRequired: 2,
      cargoCapacity: 80,
      fuelCapacity: 180,
      speed: 65,
      attack: 40,
      defense: 15,
      requiredResearch: 'Bomber-Technologie',
    },
    {
      name: 'B-Wing',
      description: 'Schwerer Angriffsjäger mit massiver Feuerkraft.',
      shipClass: 'BOMBER',
      buildCost: 2000,
      buildCostDurastahl: 300,
      buildCostKristallinesSilizium: 180,
      buildCostTibannaGas: 50,
      buildCostEnergiemodule: 25,
      buildTime: 15,
      crewRequired: 1,
      cargoCapacity: 60,
      fuelCapacity: 200,
      speed: 75,
      attack: 50,
      defense: 20,
      requiredResearch: 'Schwere Jäger',
    },

    // ========== KORVETTEN ==========
    {
      name: 'Korvette',
      description: 'Kleines Patrouillenschiff für Systemverteidigung.',
      shipClass: 'CORVETTE',
      buildCost: 5000,
      buildCostDurastahl: 800,
      buildCostKristallinesSilizium: 400,
      buildCostTibannaGas: 100,
      buildCostEnergiemodule: 50,
      buildTime: 30,
      crewRequired: 30,
      cargoCapacity: 500,
      fuelCapacity: 1000,
      speed: 60,
      attack: 80,
      defense: 60,
      requiredResearch: 'Korvetten-Konstruktion',
    },
    {
      name: 'CR90-Korvette',
      description: 'Blockadebrecher der Rebellen - schnell und wendig.',
      shipClass: 'CORVETTE',
      buildCost: 6000,
      buildCostDurastahl: 900,
      buildCostKristallinesSilizium: 500,
      buildCostTibannaGas: 120,
      buildCostEnergiemodule: 70,
      buildTime: 35,
      crewRequired: 50,
      cargoCapacity: 800,
      fuelCapacity: 1200,
      speed: 80,
      attack: 75,
      defense: 70,
      requiredResearch: 'Korvetten-Konstruktion',
    },

    // ========== FREGATTEN ==========
    {
      name: 'Fregatte',
      description: 'Mittleres Kampfschiff mit ausgewogener Bewaffnung.',
      shipClass: 'FRIGATE',
      buildCost: 15000,
      buildCostDurastahl: 2000,
      buildCostKristallinesSilizium: 1000,
      buildCostTibannaGas: 300,
      buildCostEnergiemodule: 200,
      buildTime: 60,
      crewRequired: 200,
      cargoCapacity: 2000,
      fuelCapacity: 3000,
      speed: 45,
      attack: 150,
      defense: 120,
      requiredResearch: 'Fregatten-Technologie',
    },
    {
      name: 'Nebulon-B Fregatte',
      description: 'Rebellenfregatte mit medizinischen Einrichtungen.',
      shipClass: 'FRIGATE',
      buildCost: 18000,
      buildCostDurastahl: 2200,
      buildCostKristallinesSilizium: 1200,
      buildCostTibannaGas: 350,
      buildCostEnergiemodule: 250,
      buildCostBacta: 100,
      buildTime: 70,
      crewRequired: 250,
      cargoCapacity: 2500,
      fuelCapacity: 3500,
      speed: 50,
      attack: 140,
      defense: 140,
      requiredResearch: 'Fregatten-Technologie',
    },

    // ========== KREUZER ==========
    {
      name: 'Imperialer Sternzerstörer',
      description: 'Flaggschiff des Imperiums - massive Feuerkraft und Truppen.',
      shipClass: 'CAPITAL',
      buildCost: 100000,
      buildCostDurastahl: 15000,
      buildCostKristallinesSilizium: 8000,
      buildCostTibannaGas: 2000,
      buildCostEnergiemodule: 1500,
      buildCostBeskar: 500,
      buildTime: 240, // 4 hours
      crewRequired: 37000,
      cargoCapacity: 50000,
      fuelCapacity: 30000,
      speed: 30,
      attack: 800,
      defense: 600,
      requiredResearch: 'Sternzerstörer-Konstruktion',
    },
    {
      name: 'Mon Calamari Kreuzer',
      description: 'Organischer Kreuzer der Rebellen mit starken Schilden.',
      shipClass: 'CAPITAL',
      buildCost: 120000,
      buildCostDurastahl: 12000,
      buildCostKristallinesSilizium: 10000,
      buildCostTibannaGas: 2500,
      buildCostEnergiemodule: 2000,
      buildCostBacta: 300,
      buildCostKyberKristalle: 100,
      buildTime: 300, // 5 hours
      crewRequired: 5000,
      cargoCapacity: 40000,
      fuelCapacity: 35000,
      speed: 35,
      attack: 700,
      defense: 800,
      requiredResearch: 'Mon Calamari Schiffsbau',
    },

    // ========== TRANSPORT/SUPPORT ==========
    {
      name: 'GR-75 Transporter',
      description: 'Mittlerer Frachttransporter für Ressourcen und Truppen.',
      shipClass: 'TRANSPORT',
      buildCost: 3000,
      buildCostDurastahl: 500,
      buildCostKristallinesSilizium: 200,
      buildTime: 20,
      crewRequired: 10,
      cargoCapacity: 5000,
      fuelCapacity: 2000,
      speed: 40,
      attack: 5,
      defense: 30,
      requiredResearch: 'Leichte Jäger', // Basic ship tech
    },
  ];

  // Create or update all ship types
  for (const ship of shipTypes) {
    const { requiredResearch, ...shipData } = ship;
    
    // Find research if specified
    let researchId = null;
    if (requiredResearch) {
      const research = await prisma.researchType.findUnique({
        where: { name: requiredResearch },
      });
      if (research) {
        researchId = research.id;
      }
    }

    const existing = await prisma.shipType.findUnique({
      where: { name: ship.name },
    });

    const finalData = {
      ...shipData,
      requiredResearch: researchId,
      buildCostDurastahl: ship.buildCostDurastahl || 0,
      buildCostKristallinesSilizium: ship.buildCostKristallinesSilizium || 0,
      buildCostTibannaGas: ship.buildCostTibannaGas || 0,
      buildCostEnergiemodule: ship.buildCostEnergiemodule || 0,
      buildCostKyberKristalle: ship.buildCostKyberKristalle || 0,
      buildCostBacta: ship.buildCostBacta || 0,
      buildCostBeskar: ship.buildCostBeskar || 0,
    };

    if (existing) {
      await prisma.shipType.update({
        where: { name: ship.name },
        data: finalData,
      });
      console.log(`✓ Updated ${ship.name} (${ship.shipClass})`);
    } else {
      await prisma.shipType.create({
        data: finalData,
      });
      console.log(`✓ Created ${ship.name} (${ship.shipClass})`);
    }
  }

  console.log('Done seeding ship types!');
}

seedShipTypes()
  .catch((error) => {
    console.error('Error:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
