# SQL Functions Directory

This directory contains SQL scripts for setting up the Supabase database for the React Family Tree application.

## Directory Structure

```
sql/functions/
├── README.md (this file)
├── schema.sql (deprecated - use tables/ instead)
├── search_people_by_village.sql (Database function for searching people)
├── add_person_to_tree.sql
├── update_person_in_tree.sql
├── delete_person_from_tree.sql
├── get_complete_tree_by_id.sql
└── tables/
    ├── README.md
    ├── 01_caste.sql
    ├── 02_sub_caste.sql
    ├── 03_state.sql
    ├── 04_district.sql
    ├── 05_village.sql
    ├── 06_tree.sql
    ├── 07_people.sql
    ├── 08_people_field.sql
    ├── 09_people_additional_detail.sql
    ├── 10_people_relations.sql
    ├── 11_business_categories.sql
    ├── 12_business.sql
    ├── 13_professions.sql
    ├── 14_people_professions.sql
    └── 15_users.sql
```

## Deployment Instructions

### Step 1: Create Tables

Execute all files in the `tables/` directory in order (01-15):

1. Open Supabase SQL Editor
2. Execute tables in order from `01_caste.sql` to `15_users.sql`
3. This will create all tables, indexes, and RLS policies

See [tables/README.md](tables/README.md) for detailed information about table structure and dependencies.

### Step 2: Create Database Functions

Execute the following function files:

1. `search_people_by_village.sql` - Search people by name with parent hierarchy
2. `add_person_to_tree.sql` - Add new person to family tree
3. `update_person_in_tree.sql` - Update person details
4. `delete_person_from_tree.sql` - Delete person from tree
5. `get_complete_tree_by_id.sql` - Get complete tree with all relationships

## Important Notes

- **Order Matters**: Execute table files in the numbered order to maintain referential integrity
- **RLS Enabled**: Row Level Security is enabled on all tables with public access policies for MVP
- **Soft Deletes**: Data is not permanently deleted; `is_deleted` flag is used instead
- **Indexes**: Performance indexes are included for commonly searched columns
- **Constraints**: Check constraints validate enum values and relationships

## Maintenance

### Adding a New Table

1. Create a new file in `tables/` directory with appropriate number
2. Include table definition, indexes, RLS enable, and policies
3. Update [tables/README.md](tables/README.md) with execution order
4. Add foreign key reference if needed to other tables

### Modifying Existing Tables

1. Edit the corresponding file in `tables/` directory
2. Keep indexes and RLS policies in the same file
3. Update [tables/README.md](tables/README.md) if dependencies change

### Rollback

To rollback changes, drop tables in reverse order (15 to 01) from the Supabase SQL Editor:

```sql
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS people_professions CASCADE;
DROP TABLE IF EXISTS professions CASCADE;
-- ... continue in reverse order
```

## Legacy Files

- `schema.sql` - **Deprecated**: Use individual table files from `tables/` directory instead

## Support

For issues or questions about the database schema, refer to:

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- Project README.md
