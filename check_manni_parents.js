const fs = require('fs');
const rawData = fs.readFileSync('src/components/FamilyChart/data.json', 'utf8');
const data = JSON.parse(rawData);
const members = data.members;

const manniId = 'c8fbca8b-4c37-4133-92a2-5d378b47f1c0';
const manni = members.find(m => m.id === manniId);

console.log(`Manni Devi Parents: ${manni.parents.length}`);
manni.parents.forEach(p => console.log(` - ${p.name} (${p.id})`));

// Check for other Manni nodes
const otherMannis = members.filter(m => m.name.toLowerCase().includes('manni') && m.id !== manniId);
console.log(`Other Manni nodes: ${otherMannis.length}`);
otherMannis.forEach(m => console.log(` - ${m.name} (${m.id}) Parents: ${m.parents.length}, Children: ${m.children.length}`));
