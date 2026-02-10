const fs = require('fs');
const rawData = fs.readFileSync('src/components/FamilyChart/data.json', 'utf8');
const data = JSON.parse(rawData);
const members = data.members;
const memberMap = new Map(members.map(m => [m.id, m]));

const sandeep = members.find(m => m.name.includes('Sandeep'));
const pooja = members.find(m => m.name.includes('Pooja') && m.parents && m.parents.some(p => p.name.includes('Indro')));

console.log('--- Sandeep ---');
if (sandeep) {
    console.log(`Parents of Sandeep (${sandeep.id}):`);
    sandeep.parents.forEach(p => console.log(` - ${p.name} (${p.id})`));
} else {
    console.log('Sandeep not found');
}

console.log('--- Pooja (child of Indro) ---');
if (pooja) {
    console.log(`Parents of Pooja (${pooja.id}):`);
    pooja.parents.forEach(p => console.log(` - ${p.name} (${p.id})`));
} else {
    console.log('Pooja (child of Indro) not found');
}

// Check if Bhal Singh is linked to Indro as a spouse implicitly via children
const bhal = members.find(m => m.name.includes('Bhal Singh'));
if (bhal) {
    // Does Bhal have any children that also list Indro as parent?
    const commonChildren = members.filter(m => 
        m.parents && 
        m.parents.some(p => p.id === bhal.id) && 
        m.parents.some(p => p.name.includes('Indro'))
    );
    console.log(`\nCommon children of Bhal Singh and Indro Devi: ${commonChildren.length}`);
    commonChildren.forEach(c => console.log(` - ${c.name}`));
}
