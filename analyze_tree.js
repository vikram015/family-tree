const fs = require('fs');

// Read the data
const rawData = fs.readFileSync('src/components/FamilyChart/data.json', 'utf8');
const data = JSON.parse(rawData);

const members = data.members;
const memberMap = new Map();

// Index members by ID
members.forEach(m => {
    memberMap.set(m.id, m);
});

console.log(`Loaded ${members.length} members.`);

const errors = [];
const warnings = [];

// Helper to get name
const getName = (id) => {
    const m = memberMap.get(id);
    return m ? `${m.name} (${m.id})` : `UNKNOWN_ID:${id}`;
};

// Analysis
members.forEach(member => {
    // Check Bidirectional Links: Parent -> Child
    if (member.children) {
        member.children.forEach(childRef => {
            const childId = childRef.id;
            const child = memberMap.get(childId);
            
            if (!child) {
                errors.push(`Missing Child Node: ${member.name} claims child ${childRef.name} (${childId}) which does not exist in members list.`);
            } else {
                // Check if child lists this member as parent
                const childParentIds = child.parents.map(p => p.id);
                if (!childParentIds.includes(member.id)) {
                    warnings.push(`Asymmetric Link (Parent->Child): ${member.name} lists ${child.name} as child, but ${child.name} does not list ${member.name} as parent.`);
                }
            }
        });
    }

    // Check Bidirectional Links: Child -> Parent
    if (member.parents) {
        member.parents.forEach(parentRef => {
            const parentId = parentRef.id;
            const parent = memberMap.get(parentId);

            if (!parent) {
                errors.push(`Missing Parent Node: ${member.name} claims parent ${parentRef.name} (${parentId}) which does not exist in members list.`);
            } else {
                 // Check if parent lists this member as child
                 const parentChildIds = (parent.children || []).map(c => c.id);
                 if (!parentChildIds.includes(member.id)) {
                     warnings.push(`Asymmetric Link (Child->Parent): ${member.name} lists ${parent.name} as parent, but ${parent.name} does not list ${member.name} as child.`);
                 }
            }
        });
    }
    
    // Check Parent Count
    if (member.parents && member.parents.length > 2) {
        const parentNames = member.parents.map(p => p.name).join(', ');
        errors.push(`Too Many Parents: ${member.name} has ${member.parents.length} parents: ${parentNames}`);
    }

    // Check Duplicate Parents
    if (member.parents && member.parents.length > 0) {
        const pIds = member.parents.map(p => p.id);
        const uniquePIds = new Set(pIds);
        if (uniquePIds.size !== pIds.length) {
             errors.push(`Duplicate Parents: ${member.name} lists the same parent multiple times.`);
        }
    }
});

// Specific Check for Balraj and Indro Devi
const balraj = members.find(m => m.name.toLowerCase().includes('balraj'));
const indro = members.find(m => m.name.toLowerCase().includes('indro devi'));
const bimala = members.find(m => m.name.toLowerCase().includes('bimala')); // Often involved in mixing

console.log('\n--- Specific Node Analysis ---');
if (balraj) {
    console.log(`Found Balraj: ${balraj.name} (${balraj.id})`);
    console.log(`  Parents: ${balraj.parents.map(p => `${p.name} (${p.id})`).join(', ')}`);
    console.log(`  Children: ${balraj.children.map(c => `${c.name} (${c.id})`).join(', ')}`);
} else {
    console.log("Balraj not found");
}

if (indro) {
    console.log(`Found Indro Devi: ${indro.name} (${indro.id})`);
    console.log(`  Parents: ${indro.parents.map(p => `${p.name} (${p.id})`).join(', ')}`);
    console.log(`  Children: ${indro.children.map(c => `${c.name} (${c.id})`).join(', ')}`);
    
    // Check if Indro lists Balraj as child?
    if (balraj) {
        const referencesBalraj = indro.children.find(c => c.id === balraj.id);
        if (referencesBalraj) console.log("  -> Indro lists Balraj as a child.");
        else console.log("  -> Indro DOES NOT list Balraj as a child.");
        
        const referencesIndro = balraj.parents.find(p => p.id === indro.id);
        if (referencesIndro) console.log("  -> Balraj lists Indro as a parent.");
        else console.log("  -> Balraj DOES NOT list Indro as a parent.");
    }
} else {
    console.log("Indro Devi not found");
}

if (bimala) {
     console.log(`Found Bimala: ${bimala.name} (${bimala.id})`);
     console.log(`  Children: ${bimala.children.map(c => `${c.name} (${c.id})`).join(', ')}`);
}

console.log('\n--- Analysis Results ---');
console.log(`Errors Found: ${errors.length}`);
console.log(`Warnings Found: ${warnings.length}`);

if (errors.length > 0) {
    console.log('\n--- Errors ---');
    errors.slice(0, 20).forEach(e => console.log(e));
}

if (warnings.length > 0) {
    console.log('\n--- Warnings (First 20) ---');
    warnings.slice(0, 20).forEach(w => console.log(w));
}
