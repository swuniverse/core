import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedBuildingTypes() {
  console.log('Seeding building types...');

  // Delete old building types
  await prisma.buildingType.deleteMany({});

  const buildingTypes = [
    // ===== BASIS-GEBÄUDE =====
    {
      name: 'Kommandozentrale',
      description: 'Das Herz deiner Kolonie. Generiert Credits und ermöglicht Bevölkerungswachstum.',
      category: 'INFRASTRUCTURE',
      buildCostCredits: 0,
      buildCostDurastahl: 0,
      buildCostKristallinesSilizium: 0,
      buildTime: 0, // Sofortbau für Startgebäude
      energyCostPerTick: 0, // Keine Betriebskosten
      energyCostToBuild: 0, // Kein Bau-Energieverbrauch für Startgebäude
      energyProduction: 20, // Basis-Energieproduktion
      creditProduction: 100,
      storageBonus: 500,
    },
    {
      name: 'Solarkraftwerk',
      description: 'Erzeugt Energie für deine Gebäude und Produktion.',
      category: 'RESOURCE',
      buildCostCredits: 300,
      buildCostDurastahl: 100,
      buildCostKristallinesSilizium: 0,
      buildTime: 5,
      energyCostToBuild: 50,
      energyCostPerTick: 0,
      energyCostToBuild: 100,
      energyProduction: 50,
    },
    {
      name: 'Durastahl-Mine',
      description: 'Fördert Durastahl für Schiffs- und Gebäudekonstruktion.',
      category: 'RESOURCE',
      buildCostCredits: 400,
      buildCostDurastahl: 50,
      buildCostKristallinesSilizium: 0,
      buildTime: 10,
      energyCostToBuild: 100,
      energyCostPerTick: 10,
      energyCostToBuild: 150,
      durastahlProduction: 30,
    },
    {
      name: 'Kristallraffinerie',
      description: 'Gewinnt Kristallines Silizium für fortgeschrittene Technologie.',
      category: 'RESOURCE',
      buildCostCredits: 500,
      buildCostDurastahl: 150,
      buildCostKristallinesSilizium: 0,
      buildTime: 15,
      energyCostToBuild: 150,
      energyCostPerTick: 15,
      kristallinesSiliziumProduction: 20,
    },
    {
      name: 'Lagerhaus',
      description: 'Erhöht die Lagerkapazität für Ressourcen.',
      category: 'INFRASTRUCTURE',
      buildCostCredits: 300,
      buildCostDurastahl: 100,
      buildCostKristallinesSilizium: 0,
      buildTime: 5,
      energyCostToBuild: 50,
      energyCostPerTick: 5,
      storageBonus: 500,
    },
    {
      name: 'Handelszentrum',
      description: 'Ermöglicht Handel mit anderen Spielern und generiert zusätzliche Credits.',
      category: 'PRODUCTION',
      buildCostCredits: 600,
      buildCostDurastahl: 200,
      buildCostKristallinesSilizium: 50,
      buildTime: 15,
      energyCostToBuild: 150,
      energyCostPerTick: 10,
      creditProduction: 50,
    },

    // ===== FORTGESCHRITTENE BASIS-GEBÄUDE =====
    {
      name: 'Orbitales Raumdock',
      description: 'Orbitale Werft fuer den Bau von Raumschiffen. Ermoeglicht den Zugriff auf den modularen Blueprint-Editor.',
      category: 'ORBITAL',
      buildCostCredits: 800,
      buildCostDurastahl: 400,
      buildCostKristallinesSilizium: 200,
      buildTime: 20,
      energyCostToBuild: 200,
      energyCostPerTick: 25,
    },
    {
      name: 'Forschungslabor',
      description: 'Entwickelt neue Technologien für fortgeschrittene Gebäude, Schiffe und Upgrades.',
      category: 'RESEARCH',
      buildCostCredits: 1000,
      buildCostDurastahl: 300,
      buildCostKristallinesSilizium: 500,
      buildTime: 25,
      energyCostToBuild: 250,
      energyCostPerTick: 20,
    },
    {
      name: 'Verteidigungsgitter',
      description: 'Bietet planetare Verteidigung gegen feindliche Flotten.',
      category: 'DEFENSE',
      buildCostCredits: 600,
      buildCostDurastahl: 500,
      buildCostKristallinesSilizium: 100,
      buildTime: 15,
      energyCostToBuild: 150,
      energyCostPerTick: 30,
    },
    {
      name: 'Verarbeitungsanlage',
      description: 'Verarbeitet Rohstoffe effizienter und steigert Durastahl- und Kristallproduktion.',
      category: 'PRODUCTION',
      buildCostCredits: 700,
      buildCostDurastahl: 200,
      buildCostKristallinesSilizium: 150,
      buildTime: 18,
      energyCostToBuild: 180,
      energyCostPerTick: 15,
      durastahlProduction: 15,
      kristallinesSiliziumProduction: 10,
    },
    {
      name: 'Hangar',
      description: 'Beherbergt deine Raumschiffe und erhöht die maximale Flottenkapazität.',
      category: 'INFRASTRUCTURE',
      buildCostCredits: 500,
      buildCostDurastahl: 300,
      buildCostKristallinesSilizium: 100,
      buildTime: 12,
      energyCostToBuild: 120,
      energyCostPerTick: 10,
    },

    // ===== NEUE RESSOURCEN-GEBÄUDE =====
    {
      name: 'Tibanna-Raffinerie',
      description: 'Extrahiert wertvolles Tibanna-Gas aus der Atmosphäre von Gasplaneten.',
      category: 'RESOURCE',
      buildCostCredits: 1200,
      buildCostDurastahl: 600,
      buildCostKristallinesSilizium: 300,
      buildTime: 30,
      energyCostToBuild: 300,
      energyCostPerTick: 25,
      tibannaGasProduction: 15,
    },
    {
      name: 'Energiemodulfabrik',
      description: 'Produziert portable Energiemodule für Raumschiffe und Technologie.',
      category: 'PRODUCTION',
      buildCostCredits: 1500,
      buildCostDurastahl: 800,
      buildCostKristallinesSilizium: 400,
      buildCostTibannaGas: 100,
      buildTime: 35,
      energyCostToBuild: 350,
      energyCostPerTick: 40,
      energiemoduleProduction: 10,
    },
    {
      name: 'Kyber-Extraktionsanlage',
      description: 'Extrahiert seltene Kyber-Kristalle für Laser- und Lichtschwerttechnologie.',
      category: 'RESOURCE',
      buildCostCredits: 2500,
      buildCostDurastahl: 1500,
      buildCostKristallinesSilizium: 1000,
      buildCostTibannaGas: 200,
      buildTime: 50,
      energyCostToBuild: 500,
      energyCostPerTick: 60,
      kyberKristalleProduction: 5,
    },
    {
      name: 'Bacta-Labor',
      description: 'Produziert Bacta für medizinische Versorgung und Truppenheilung.',
      category: 'PRODUCTION',
      buildCostCredits: 2000,
      buildCostDurastahl: 1000,
      buildCostKristallinesSilizium: 800,
      buildCostEnergiemodule: 50,
      buildTime: 40,
      energyCostToBuild: 400,
      energyCostPerTick: 35,
      bactaProduction: 8,
    },
    {
      name: 'Beskar-Schmiede',
      description: 'Verarbeitet das legendäre Beskar-Metall für ultimative Rüstungen und Schiffe.',
      category: 'PRODUCTION',
      buildCostCredits: 5000,
      buildCostDurastahl: 3000,
      buildCostKristallinesSilizium: 2000,
      buildCostKyberKristalle: 100,
      buildTime: 90,
      energyCostToBuild: 900,
      energyCostPerTick: 80,
      beskarProduction: 3,
    },

    // ===== ERWEITERTE ENERGIE-GEBÄUDE =====
    {
      name: 'Fusionsreaktor',
      description: 'Hochleistungs-Energieproduktion durch Fusionsreaktor-Technologie.',
      category: 'RESOURCE',
      buildCostCredits: 1000,
      buildCostDurastahl: 500,
      buildCostKristallinesSilizium: 300,
      buildTime: 25,
      energyCostToBuild: 250,
      energyCostPerTick: 0,
      energyProduction: 100,
    },
    {
      name: 'Erweiterte Solarzellen',
      description: 'Verbesserte Solartechnologie für höhere Energieausbeute.',
      category: 'RESOURCE',
      buildCostCredits: 600,
      buildCostDurastahl: 250,
      buildCostKristallinesSilizium: 100,
      buildTime: 15,
      energyCostToBuild: 150,
      energyCostPerTick: 0,
      energyProduction: 75,
    },
    {
      name: 'Hyperreaktor',
      description: 'Ultimative Energieproduktion durch Hyperraum-Technologie.',
      category: 'RESOURCE',
      buildCostCredits: 2500,
      buildCostDurastahl: 1500,
      buildCostKristallinesSilizium: 1000,
      buildCostEnergiemodule: 100,
      buildTime: 45,
      energyCostToBuild: 450,
      energyCostPerTick: 0,
      energyProduction: 200,
    },

    // ===== ERWEITERTE PRODUKTIONS-GEBÄUDE =====
    {
      name: 'Automatisierte Mine',
      description: 'Vollautomatisierte Durastahl-Mine mit erhöhter Ausbeute.',
      category: 'RESOURCE',
      buildCostCredits: 800,
      buildCostDurastahl: 200,
      buildCostKristallinesSilizium: 100,
      buildTime: 20,
      energyCostToBuild: 200,
      energyCostPerTick: 15,
      durastahlProduction: 50,
    },
    {
      name: 'Kristallsyntheseanlage',
      description: 'Synthetische Kristallproduktion für fortgeschrittene Technologie.',
      category: 'RESOURCE',
      buildCostCredits: 900,
      buildCostDurastahl: 300,
      buildCostKristallinesSilizium: 150,
      buildTime: 22,
      energyCostToBuild: 220,
      energyCostPerTick: 20,
      kristallinesSiliziumProduction: 35,
    },
    {
      name: 'Mega-Raffinerie',
      description: 'Gigantische Verarbeitungsanlage für maximale Ressourcenausbeute.',
      category: 'PRODUCTION',
      buildCostCredits: 1800,
      buildCostDurastahl: 800,
      buildCostKristallinesSilizium: 600,
      buildCostTibannaGas: 150,
      buildTime: 35,
      energyCostToBuild: 350,
      energyCostPerTick: 30,
      durastahlProduction: 30,
      kristallinesSiliziumProduction: 20,
    },

    // ===== ERWEITERTE VERTEIDIGUNGS-GEBÄUDE =====
    {
      name: 'Plasmaturm',
      description: 'Fortgeschrittenes Verteidigungssystem mit Plasmawaffenplattformen.',
      category: 'DEFENSE',
      buildCostCredits: 1200,
      buildCostDurastahl: 800,
      buildCostKristallinesSilizium: 400,
      buildCostEnergiemodule: 30,
      buildTime: 30,
      energyCostToBuild: 300,
      energyCostPerTick: 40,
    },
    {
      name: 'Planetarer Schild',
      description: 'Energieschild zum Schutz des gesamten Planeten vor Angriffen.',
      category: 'DEFENSE',
      buildCostCredits: 3000,
      buildCostDurastahl: 2000,
      buildCostKristallinesSilizium: 1500,
      buildCostKyberKristalle: 50,
      buildTime: 60,
      energyCostToBuild: 600,
      energyCostPerTick: 100,
    },
  ];

  for (const building of buildingTypes) {
    await prisma.buildingType.create({
      data: building,
    });
    console.log(`✓ Created ${building.name}`);
  }

  console.log('Done! Created', buildingTypes.length, 'building types.');
}

seedBuildingTypes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
