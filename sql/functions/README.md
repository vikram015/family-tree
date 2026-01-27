# SQL Functions and Procedures

This directory contains individual SQL function files for better maintainability and organization.

## Structure

```
sql/
└── functions/
    ├── add_person_to_tree.sql           # Add a new person with relationships
    ├── update_person_in_tree.sql        # Update person details and fields
    ├── delete_person_from_tree.sql      # Delete person and cleanup relationships
    └── get_complete_tree_by_id.sql      # Fetch complete tree with all relationships
```

## Functions

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

## How to Use

When deploying to Supabase, run these functions in order:

```sql
-- Create functions (run each file in the sql/functions/ directory)
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
