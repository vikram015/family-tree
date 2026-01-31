# Database Tables Structure

This directory contains individual SQL files for each database table. Each file is self-contained and includes:

1. **Table Definition** - CREATE TABLE statement
2. **Indexes** - Performance optimization indexes specific to the table
3. **Row Level Security (RLS)** - ALTER TABLE and RLS policies for the table
4. **Policies** - Security policies for SELECT, INSERT, UPDATE, DELETE operations

## Files and Order of Execution

Execute these files in the following order to maintain referential integrity:

| Order | File                              | Table                    | Dependencies         |
| ----- | --------------------------------- | ------------------------ | -------------------- |
| 1     | `01_caste.sql`                    | caste                    | None                 |
| 2     | `02_sub_caste.sql`                | sub_caste                | caste                |
| 3     | `03_state.sql`                    | state                    | None                 |
| 4     | `04_district.sql`                 | district                 | state                |
| 5     | `05_village.sql`                  | village                  | district             |
| 6     | `06_tree.sql`                     | tree                     | village              |
| 7     | `07_people.sql`                   | people                   | tree                 |
| 8     | `08_people_field.sql`             | people_field             | None                 |
| 9     | `09_people_additional_detail.sql` | people_additional_detail | people, people_field |
| 10    | `10_people_relations.sql`         | people_relations         | people               |
| 11    | `11_business_categories.sql`      | business_categories      | None                 |
| 12    | `12_business.sql`                 | business                 | people               |
| 13    | `13_professions.sql`              | professions              | None                 |
| 14    | `14_people_professions.sql`       | people_professions       | people, professions  |
| 15    | `15_users.sql`                    | users                    | people               |

## Table Relationships

```
caste
  └── sub_caste

state
  └── district
      └── village
          └── tree
              └── people
                  ├── people_additional_detail (+ people_field)
                  ├── people_relations (self-referencing)
                  ├── business
                  ├── users
                  └── people_professions (+ professions)
```

## How to Deploy

### Option 1: Run all files at once

If your Supabase environment supports batch execution, copy all file contents in order into the SQL editor.

### Option 2: Run files individually

Execute each file in the order listed above in the Supabase SQL Editor.

### Option 3: Use SQL script runner

Create a master script that includes all these files and execute it.

## Key Design Decisions

- **Soft Deletes**: Tables use `is_deleted` BOOLEAN flag instead of hard deletes
- **Timestamps**: All tables track `created_at`, `modified_at`, and `created_by`, `modified_by`
- **Indexes**: Each table has indexes on commonly searched columns (lowercase names, foreign keys)
- **RLS Policies**: Most tables use public access (true) for MVP; can be restricted to authenticated users later
- **Constraints**: Check constraints validate enum-like values (gender, relation_type, etc.)
- **Uniqueness**: UNIQUE constraints prevent duplicates (e.g., profession names, people_professions combination)

## Modifying Tables

When modifying table structures:

1. Update the corresponding file (e.g., `07_people.sql` for people table)
2. Include any new indexes in the same file
3. Update any related RLS policies if needed
4. Keep related tables (parent/child relationships) in consistent order
