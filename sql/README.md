# SQL Functions and Schema

This directory contains individual SQL function files and the schema definition for better maintainability and organization.

## Structure

```
sql/
└── functions/
    ├── schema.sql                       # Table definitions and RLS policies
    ├── add_person_to_tree.sql           # Add a new person with relationships
    ├── update_person_in_tree.sql        # Update person details and fields
    ├── delete_person_from_tree.sql      # Delete person and cleanup relationships
    ├── get_complete_tree_by_id.sql      # Fetch complete tree with all relationships
    └── README.md                        # This file
```

## Setup Order

When deploying to Supabase, run files in this order:

1. **schema.sql** - Creates all tables and RLS policies
2. **add_person_to_tree.sql** - Creates add function
3. **update_person_in_tree.sql** - Creates update function
4. **delete_person_from_tree.sql** - Creates delete function
5. **get_complete_tree_by_id.sql** - Creates query function

## Files

### schema.sql

- **Purpose**: Defines all database tables and row-level security (RLS) policies
- **Contains**:
  - Table definitions (caste, state, district, village, tree, people, people_field, people_relations, business, users, etc.)
  - Indexes for performance
  - RLS policies for public access

### add_person_to_tree(p_tree_id, p_name, p_gender, p_dob, p_relation_type, p_related_person_id, p_additional_fields)

- **Purpose**: Adds a new person to a family tree with optional parent/spouse relationships
- **Returns**: JSON with success status, new person ID, and field count
- **Note**: Only creates bidirectional relationships for spouses; parent relationships are directional

### update_person_in_tree(p_person_id, p_name, p_gender, p_dob, p_additional_fields)

- **Purpose**: Updates person's core properties and custom field values
- **Returns**: JSON with success status and updated person details
- **Note**: Replaces all additional fields; old fields are deleted before inserting new ones

### delete_person_from_tree(p_person_id)

- **Purpose**: Deletes a person and all their relationships and additional details
- **Returns**: JSON with success status and deleted person info
- **Cleanup**: Automatically removes all people_relations and people_additional_detail records

### get_complete_tree_by_id(p_tree_id)

- **Purpose**: Fetches the complete family tree with all members and relationships
- **Returns**: JSON with tree info, members array with relationships, and statistics
- **Relationships Included**:
  - Parents (directional)
  - Children (calculated from parent relationships)
  - Spouses (bidirectional)
  - Siblings (calculated from common parents)

## How to Deploy

When deploying to Supabase, run files in order:

```sql
-- 1. Create tables and RLS policies
\i sql/functions/schema.sql

-- 2. Create functions (run each file in the sql/functions/ directory)
\i sql/functions/add_person_to_tree.sql
\i sql/functions/update_person_in_tree.sql
\i sql/functions/delete_person_from_tree.sql
\i sql/functions/get_complete_tree_by_id.sql
```

Or execute them individually in the Supabase SQL Editor.

## Notes

- All functions handle errors gracefully and return JSON error responses
- Transactions are implicit per function
- Parent relationships are directional; children are calculated from parent relationships
- Spouse relationships are bidirectional
- Additional fields require pre-existing entries in the `people_field` table
- The old `setup_supabase_schema.sql` file in the root directory is now deprecated; use `sql/functions/schema.sql` instead
