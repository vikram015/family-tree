# Custom Fields Setup

## Overview

The application now supports dynamic custom fields that can be added to any node in the family tree. These fields are managed through the `AdditionalDetails` component and are stored in the `customFields` property of each node.

## Firestore Collection: `node_fields`

To enable field name suggestions, create documents in the `node_fields` collection with the following structure:

### Document Structure

```json
{
  "name": "Education"
}
```

### Example Documents

```
node_fields/
  ├── education
  │   └── { "name": "Education" }
  ├── occupation
  │   └── { "name": "Occupation" }
  ├── hometown
  │   └── { "name": "Hometown" }
  ├── phone
  │   └── { "name": "Phone Number" }
  ├── email
  │   └── { "name": "Email Address" }
  ├── religion
  │   └── { "name": "Religion" }
  ├── caste
  │   └── { "name": "Caste" }
  └── gotra
      └── { "name": "Gotra" }
```

## How to Add Field Names to Firestore

### Option 1: Using Firebase Console

1. Go to your Firebase Console
2. Navigate to Firestore Database
3. Create a collection named `node_fields`
4. Add documents with auto-generated IDs
5. Each document should have a single field: `name` (string)

### Option 2: Using Firebase Admin SDK or Cloud Functions

```javascript
const fieldNames = [
  "Education",
  "Occupation",
  "Hometown",
  "Phone Number",
  "Email Address",
  "Religion",
  "Caste",
  "Gotra",
  "Marital Status",
  "Company",
  "Profession",
  "Blood Group",
  "Native Place",
];

// Add each field
fieldNames.forEach(async (name) => {
  await db.collection("node_fields").add({ name });
});
```

## Features

### In AddNode Component (Creating New Nodes)

- Users can add custom fields while creating a new family member
- Field names can be typed freely or selected from Firestore suggestions
- Autocomplete with filtering as you type
- Each field has a name and value

### In NodeDetails Component (Editing Existing Nodes)

- **View Mode**: Displays all custom fields under "Additional Details" section
- **Edit Mode**: Full editing capability with add/remove functionality
- Changes are saved to Firestore and persist across sessions

## Data Storage

Custom fields are stored in the `customFields` property of each node:

```typescript
{
  id: "person123",
  name: "John Doe",
  dob: "1990-01-15",
  gender: "male",
  customFields: {
    "Education": "PhD in Computer Science",
    "Occupation": "Software Engineer",
    "Hometown": "Mumbai"
  }
}
```

## Usage

1. **Adding Fields While Creating**: When adding a new family member, scroll down to "Additional Details" and click the + button
2. **Adding Fields While Editing**: Click the edit icon on any node, scroll to "Additional Details", and click +
3. **Autocomplete**: Start typing the field name - matching suggestions from Firestore will appear
4. **Custom Names**: You can type any field name, not just those in Firestore
5. **Removing Fields**: Click the delete icon next to any field to remove it

## Benefits

- **Flexible**: Each family tree can track different information
- **User-Friendly**: Autocomplete makes data entry consistent
- **Extensible**: Add new field types without code changes
- **Clean**: Empty fields are not saved to the database
