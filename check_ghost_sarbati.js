const fs = require('fs');
const rawData = fs.readFileSync('src/components/FamilyChart/data.json', 'utf8');
const data = JSON.parse(rawData);
const members = data.members;

const ghostSarbatiId = '2508ba1a-5e36-46bc-8083-941eee5c6348';
const realSarbatiId = 'bf267435-f18f-488c-83fd-de492d9285bc';

const ghostNode = members.find(m => m.id === ghostSarbatiId);
const realNode = members.find(m => m.id === realSarbatiId);

console.log(`Ghost Sarbati (${ghostSarbatiId}) Exists? ${!!ghostNode}`);
if (ghostNode) {
    console.log(`Ghost details: Name=${ghostNode.name}, Parents=${ghostNode.parents.length}`);
}

console.log(`Real Sarbati (${realSarbatiId}) Exists? ${!!realNode}`);

// List children of Kiru again to check their exact parent IDs
const kiru = members.find(m => m.name.toLowerCase().includes('kiru ram'));
if (kiru) {
    const children = members.filter(m => m.parents.some(p => p.id === kiru.id));
    children.forEach(c => {
        console.log(`Child ${c.name} parents:`);
        c.parents.forEach(p => console.log(` - ${p.name} (${p.id})`));
    });
}
