# Village-Based System Setup Guide

## Overview

The application now supports multiple villages. Each village has its own:

- Family trees (Families page)
- Business listings (Business page)
- Heritage information (Heritage page)

## Firebase Collections Required

### 1. `villages` Collection

Stores list of all villages.

**Document Structure:**

```json
{
  "name": "Village Name"
}
```

**Example Documents:**

```
Document ID: gangwa
{
  "name": "Gangwa"
}

Document ID: kulait
{
  "name": "Kulait"
}
```

### 2. `tree` Collection (Updated)

Add `villageId` field to associate each family tree with a village.

**Updated Structure:**

```json
{
  "treeName": "Family Tree Name",
  "villageId": "gangwa"
}
```

**Example:**

```
Document ID: abc123
{
  "treeName": "Panchal Family",
  "villageId": "gangwa"
}
```

### 3. `businesses` Collection

Stores business listings for each village.

**Document Structure:**

```json
{
  "name": "Business Name",
  "category": "retail|agriculture|it|education|healthcare|engineering",
  "description": "Brief description",
  "owner": "Owner Name",
  "contact": "Phone or email (optional)",
  "villageId": "gangwa"
}
```

**Example Documents:**

```
Document ID: business1
{
  "name": "Panchal General Store",
  "category": "retail",
  "description": "Family-owned grocery store",
  "owner": "Ram Panchal",
  "contact": "+91-XXXXXXXXXX",
  "villageId": "gangwa"
}

Document ID: business2
{
  "name": "Tech Solutions",
  "category": "it",
  "description": "Software development services",
  "owner": "Amit Kumar",
  "contact": "amit@example.com",
  "villageId": "gangwa"
}
```

### 4. `heritage` Collection

Stores heritage information for each village.

**Document Structure:** (Document ID can be any unique ID)

```json
{
  "villageId": "gangwa",
  "villageOrigin": "Full story of village origin and history (multi-line text)",
  "foundedYear": "1815",
  "founders": "Hundaram and Indaram",
  "genealogy": {
    "originalName": "गुंगा आला गाम",
    "evolution": ["गंगुआ", "गंगुवा", "गंगवा"]
  },
  "monuments": [
    "Janti Ka Paad (जॉन्टी का पेड़)",
    "Panchpir Ki Samadhi",
    "Historic Masjid",
    "Ancient Well"
  ],
  "culturalPractices": [
    "Annual village fair in winter",
    "Traditional farming practices",
    "Folk music celebrations"
  ]
}
```

**Example for Gangwa:**

```
Document ID: (any unique ID, e.g., heritage_gangwa_1)
{
  "villageId": "gangwa",
  "villageOrigin": "गाँव के बुजुर्गों ने बताया कि गंगवा कि उत्पत्ति पंघाल गोत्र के चाचा हुन्दाराम (जो गुंगा था) और भतीजा इन्दाराम के द्वारा विक्रमी सवंत 1815 में हुई। गाँव के बुजुर्ग मुखराम पंचाल (80 वर्ष) ने बताया कि ये चाचा व भतीजा कुलायत से 12 कि. मी. दक्षिण दिशा में भैलू ढ़ादलवाल से यहाँ एक ऊंट गाड़ी एक छोटे से जॉन्टी के पैड़ के नीचे खड़ी की तथा अपनी गाय को भी यहाँ विश्राम करवाया।",
  "foundedYear": "1815",
  "founders": "Hundaram and Indaram",
  "genealogy": {
    "originalName": "गुंगा आला गाम",
    "evolution": ["गंगुआ", "गंगुवा", "गंगवा"]
  },
  "monuments": [
    "Janti Ka Paad (जॉन्टी का पेड़)",
    "Panchpir Ki Samadhi",
    "Historic Masjid",
    "Ancient Well"
  ],
  "culturalPractices": [
    "Traditional farming methods passed down through generations",
    "Village festivals celebrating harvest seasons",
    "Community gatherings at the village square"
  ]
}
```

## Setup Steps

### Step 1: Create Villages Collection

1. Go to Firebase Console → Firestore Database
2. Click "Start collection"
3. Collection ID: `villages`
4. Add documents for each village:
   - Document ID: `gangwa` (or any unique ID)
   - Field: `name` (string) = "Gangwa"

### Step 2: Update Existing Tree Documents

1. Go to the `tree` collection
2. Edit each document and add field:
   - Field: `villageId` (string) = "gangwa" (or appropriate village ID)

### Step 3: Create Heritage Collection

1. Create collection: `heritage`
2. Click "Add document" and create a new document
3. Add the following fields from the JSON data:
   - Field: `villageId` (string) = "gangwa" (must match the village ID)
   - Field: `villageOrigin` (string) = paste the full heritage text
   - Field: `foundedYear` (string) = "1815 (विक्रमी संवत)"
   - Field: `founders` (string) = "चाचा हुन्दाराम (जो गुंगा था) और भतीजा इन्दाराम"
   - Field: `genealogy` (map) with:
     - `originalName` (string)
     - `evolution` (array of strings)
   - Field: `monuments` (array) - Add each monument as an array item
   - Field: `culturalPractices` (array) - Add each practice as an array item

**Important:** The `villageId` field MUST match the village ID from the villages collection.

### Step 4: Create Businesses Collection (Optional)

1. Create collection: `businesses`
2. Add business documents with `villageId` field
3. Each business must have a `villageId` field that matches a village ID

## How It Works

### User Experience

1. User selects a village from the dropdown in the header
2. Selection is saved in localStorage and persists across sessions
3. All pages (Families, Business, Heritage) automatically filter by selected village

### Data Filtering

- **Families Page**: Shows only family trees where `tree.villageId == selectedVillage`
- **Business Page**: Shows only businesses where `business.villageId == selectedVillage`
- **Heritage Page**: Loads heritage document with ID matching `selectedVillage`

### Adding New Villages

1. Add new document to `villages` collection
2. (Optional) Add heritage document with same ID
3. (Optional) Add family trees with the new `villageId`
4. (Optional) Add businesses with the new `villageId`

## Notes

- Village selector appears in header (desktop and mobile)
- If no village is selected, pages show a message prompting selection
- Heritage page displays dynamic content based on village data
- Business page shows actual count of businesses per category
- Empty states are handled gracefully with informative messages
