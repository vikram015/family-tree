const fs = require('fs');
const rawData = fs.readFileSync('src/components/FamilyChart/data.json', 'utf8');
const data = JSON.parse(rawData);
const members = data.members;

// Helper to find member by fuzzy name
const findMember = (nameChunk) => members.find(m => m.name.toLowerCase().includes(nameChunk.toLowerCase()));

const kiru = findMember('Kiru');
const sarbati = findMember('Sarbati');
const manni = undefined; // User said 'manni devi', I'll search for 'manni'
// Let's actually look for all members matching 'manni' to be safe
const manniCandidates = members.filter(m => m.name.toLowerCase().includes('manni'));

console.log('--- Identifications ---');
if (kiru) console.log(`Kiru Ram: ${kiru.name} (${kiru.id})`);
else console.log('Kiru Ram not found');

if (sarbati) console.log(`Sarbati Devi: ${sarbati.name} (${sarbati.id})`);
else console.log('Sarbati Devi not found');

console.log(`Manni Devi Candidates: ${manniCandidates.length}`);
manniCandidates.forEach(m => console.log(` - ${m.name} (${m.id})`));

const selectedManni = manniCandidates[0]; // Assuming the first one is relevant if multiple, or will be undefined.

const analyzeNode = (node, tag) => {
    if (!node) return;
    console.log(`\n--- Analysis: ${tag} (${node.name}) ---`);
    
    // Parents
    console.log(`Parents:`);
    node.parents.forEach(p => console.log(` - ${p.name} (${p.id})`));
    
    // Children (stated in this node)
    console.log(`Children (as listed in ${node.name}'s node):`);
    node.children.forEach(c => console.log(` - ${c.name} (${c.id})`));

    // Children (reverse lookup)
    const reverseChildren = members.filter(m => m.parents.some(p => p.id === node.id));
    console.log(`Children (who claim ${node.name} as parent):`);
    // Check consistency
    reverseChildren.forEach(child => {
        const otherParents = child.parents.filter(p => p.id !== node.id);
        const spouseStr = otherParents.map(p => `${p.name}`).join(', ');
        const isListedInParent = node.children.some(c => c.id === child.id);
        
        console.log(` - ${child.name} [Spouse: ${spouseStr || 'None'}] ${isListedInParent ? '' : '(WARNING: Not listed in parent!)'}`);
    });
};

if (kiru) analyzeNode(kiru, 'Kiru');
if (sarbati) analyzeNode(sarbati, 'Sarbati');
if (selectedManni) analyzeNode(selectedManni, 'Manni');

// Check for cross-linking (Spousal relationships via children)
if (kiru && (sarbati || selectedManni)) {
    console.log('\n--- Spousal Analysis (via shared children) ---');
    const childrenOfKiru = members.filter(m => m.parents.some(p => p.id === kiru.id));
    
    const spouses = new Set();
    childrenOfKiru.forEach(c => {
        c.parents.forEach(p => {
             if (p.id !== kiru.id) spouses.add(`${p.name} (${p.id})`);
        });
    });
    
    console.log(`Kiru Ram's implied spouses (from children):`);
    spouses.forEach(s => console.log(` - ${s}`));
}
