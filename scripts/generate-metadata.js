// Helper: writes 10 character JSON files into ../metadata/game-characters/
const fs = require("fs");
const path = require("path");

const CHARACTERS = [
  { id: 1,  name: "Pyro Knight",      color: "Crimson",    speed: 55, strength: 90, rarity: "Legendary" },
  { id: 2,  name: "Frost Mage",       color: "Cyan",       speed: 70, strength: 60, rarity: "Epic" },
  { id: 3,  name: "Shadow Rogue",     color: "Black",      speed: 95, strength: 50, rarity: "Epic" },
  { id: 4,  name: "Storm Archer",     color: "Indigo",     speed: 80, strength: 65, rarity: "Rare" },
  { id: 5,  name: "Earth Guardian",   color: "Forest",     speed: 40, strength: 95, rarity: "Legendary" },
  { id: 6,  name: "Solar Priestess",  color: "Gold",       speed: 60, strength: 55, rarity: "Epic" },
  { id: 7,  name: "Void Reaper",      color: "Violet",     speed: 75, strength: 85, rarity: "Legendary" },
  { id: 8,  name: "Iron Berserker",   color: "Steel",      speed: 50, strength: 88, rarity: "Rare" },
  { id: 9,  name: "Wind Dancer",      color: "Sky",        speed: 99, strength: 45, rarity: "Rare" },
  { id: 10, name: "Crystal Sage",     color: "Aquamarine", speed: 65, strength: 70, rarity: "Common" },
];

const outDir = path.join(__dirname, "..", "metadata", "game-characters");
fs.mkdirSync(outDir, { recursive: true });

for (const c of CHARACTERS) {
  const meta = {
    name: c.name,
    description: `A ${c.rarity.toLowerCase()} game character from the Genesis Heroes collection.`,
    image: `ipfs://REPLACE_CID/${c.id}.png`,
    attributes: [
      { trait_type: "Color",    value: c.color },
      { trait_type: "Speed",    value: c.speed },
      { trait_type: "Strength", value: c.strength },
      { trait_type: "Rarity",   value: c.rarity },
    ],
  };
  fs.writeFileSync(
    path.join(outDir, `${c.id}.json`),
    JSON.stringify(meta, null, 2)
  );
  console.log(`wrote ${c.id}.json`);
}
