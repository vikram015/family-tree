# Supabase Schema Design

## Overview

This document defines the PostgreSQL schema needed for the family tree application in Supabase.

## Tables

### 1. `villages` - Village/Heritage Group Information

```sql
CREATE TABLE villages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  state VARCHAR(255),
  country VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### 2. `tree` - Family Tree Roots

```sql
CREATE TABLE tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  villageId UUID REFERENCES villages(id) ON DELETE SET NULL,
  villageName VARCHAR(255),
  createdBy VARCHAR(255),
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);
```

### 3. `people` - Individual Family Members

```sql
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_lowercase VARCHAR(255),
  gender VARCHAR(10), -- 'male' or 'female'
  dob DATE,
  dod DATE,
  place VARCHAR(255),
  notes TEXT,
  photo TEXT, -- URL to photo

  -- Foreign keys
  treeId UUID NOT NULL REFERENCES tree(id) ON DELETE CASCADE,
  villageId UUID REFERENCES villages(id) ON DELETE SET NULL,

  -- Relationships stored as JSONB arrays
  -- Each relationship: { id: UUID, type: string }
  parents JSONB DEFAULT '[]'::jsonb,
  children JSONB DEFAULT '[]'::jsonb,
  spouses JSONB DEFAULT '[]'::jsonb,
  siblings JSONB DEFAULT '[]'::jsonb,

  -- Hierarchy for faster queries (array of { name, id })
  hierarchy JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  -- Indexes for common queries
  CONSTRAINT valid_gender CHECK (gender IN ('male', 'female', 'other'))
);

CREATE INDEX idx_people_treeId ON people(treeId);
CREATE INDEX idx_people_villageId ON people(villageId);
CREATE INDEX idx_people_name_lowercase ON people(name_lowercase);
CREATE INDEX idx_people_tree_village ON people(treeId, villageId);
CREATE INDEX idx_people_tree_lowercase ON people(treeId, name_lowercase);
```

### 4. `businesses` - Business Listings

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_lowercase VARCHAR(255),
  category VARCHAR(255),
  description TEXT,

  -- Owner reference
  ownerId UUID REFERENCES people(id) ON DELETE SET NULL,

  -- Location
  treeId UUID NOT NULL REFERENCES tree(id) ON DELETE CASCADE,
  villageId UUID REFERENCES villages(id) ON DELETE SET NULL,

  -- Contact info
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_businesses_villageId ON businesses(villageId);
CREATE INDEX idx_businesses_ownerId ON businesses(ownerId);
CREATE INDEX idx_businesses_name_lowercase ON businesses(name_lowercase);
CREATE INDEX idx_businesses_village_lowercase ON businesses(villageId, name_lowercase);
```

### 5. `business_categories` - Business Categories

```sql
CREATE TABLE business_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

### 6. `users` - Application Users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50), -- 'admin', 'moderator', 'user'
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

## Indexes for Performance

```sql
-- Fast name searches
CREATE INDEX idx_people_search ON people USING GIN(to_tsvector('english', name));
CREATE INDEX idx_businesses_search ON businesses USING GIN(to_tsvector('english', name));

-- Hierarchy queries
CREATE INDEX idx_people_hierarchy ON people USING GIN(hierarchy);

-- Foreign key lookups
CREATE INDEX idx_people_parent_ids ON people USING GIN(parents);
CREATE INDEX idx_people_children_ids ON people USING GIN(children);
```

## RLS (Row Level Security) Policies

```sql
-- Enable RLS on sensitive tables
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow public read access to people (trees are public)
CREATE POLICY "people_read_policy" ON people
  FOR SELECT USING (true);

-- Allow authenticated users to create people
CREATE POLICY "people_create_policy" ON people
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update people they created (if you track creator)
CREATE POLICY "people_update_policy" ON people
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Similar policies for businesses
CREATE POLICY "businesses_read_policy" ON businesses
  FOR SELECT USING (true);

CREATE POLICY "businesses_create_policy" ON businesses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

## Migration Strategy

### Phase 1: Schema Creation

1. Create all tables in Supabase PostgreSQL
2. Create indexes for performance
3. Set up RLS policies

### Phase 2: Data Migration

1. Export all documents from Firebase Firestore
2. Transform Firebase documents to match Supabase schema
3. Handle JSONB array conversions for relationships
4. Import into Supabase
5. Verify data integrity

### Phase 3: Application Migration

1. Update React components to use SupabaseService instead of Firebase
2. Test all CRUD operations
3. Test relationship cascades
4. Test search functionality
5. Deploy to production

## Key Differences from Firebase

| Aspect        | Firebase                        | Supabase                                 |
| ------------- | ------------------------------- | ---------------------------------------- |
| Relationships | Embedded/Denormalized           | JSONB (flexible) + referential integrity |
| Transactions  | Real-time listeners             | Row-level security + REST API            |
| Search        | Basic text matching             | Full-text search with GIN indexes        |
| Scalability   | Document-based                  | Relational database scaling              |
| Updates       | Cascading via application logic | Can use triggers + recursive CTEs        |
| History       | Manual versioning               | Can add audit tables with triggers       |

## Performance Considerations

1. **JSONB Arrays**: Relationships stored as JSONB arrays allow flexible schema while maintaining some queryability
2. **Indexes**: GIN indexes on JSONB columns and full-text search indexes enable fast queries
3. **Composite Indexes**: Created on (treeId, villageId) for efficient village-scoped queries
4. **Lazy Loading**: Relationships are included in the person object, allowing client-side traversal

## Future Enhancements

1. **Add audit table** for tracking changes
2. **Add relationship types** table to normalize relation types
3. **Add photos table** with S3 integration
4. **Add chat/messaging** for community features
5. **Add analytics** for viewing patterns
