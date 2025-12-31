import { Gender, RelType, type Node } from 'relatives-tree/lib/types';
import { db } from '../firebase';
import { addDoc, collection, deleteField, writeBatch, getDocs, serverTimestamp } from 'firebase/firestore';

export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 80;

/**
 * Create a default tree document (with optional name) and assign its id
 * to all documents in the `people` collection as `treeId`.
 * Returns the new tree id.
 */
export const update = async (name?: string): Promise<string> => {
  try {
    const treeCol = collection(db, 'tree');
    const treeDocRef = await addDoc(treeCol, {
      treeName: name ?? 'Gedar 1',
      createdAt: serverTimestamp(),
    });

    const newTreeId = treeDocRef.id;

    // Read all people documents
    const peopleCol = collection(db, 'people');
    const peopleSnap = await getDocs(peopleCol);

    if (peopleSnap.empty) return newTreeId;

    // Firestore write batches are limited to 500 operations per batch.
    let batch = writeBatch(db);
    let ops = 0;
    const BATCH_SIZE = 500;

    for (const docSnap of peopleSnap.docs) {
      // Use set with merge to avoid failure if a document was removed concurrently
      batch.set(docSnap.ref, { treeId: newTreeId }, { merge: true });
      ops++;
      if (ops >= BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
      }
    }
    if (ops > 0) {
      await batch.commit();
    }

    return newTreeId;
  } catch (err) {
    console.error('Failed to create tree and assign treeId to people:', err);
    throw err;
  }
};

export const URL_LABEL = 'URL (Gist, Paste.bin, ...)';
