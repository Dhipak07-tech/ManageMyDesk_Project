# Connect IT - Firebase to MySQL Migration Guide

## Overview

This guide documents the complete migration from Firebase Firestore to MySQL while preserving all existing functionality, UI, and features.

## What Was Changed

### New Files Created

1. **`mysql-schema.sql`** - Complete MySQL database schema with all tables, indexes, and foreign keys
2. **`lib/mysql.ts`** - MySQL client for Node.js backend
3. **`server-mysql.ts`** - New Node.js server using MySQL instead of Firebase
4. **`php-backend/mysql-client.php`** - MySQL client and models for PHP backend
5. **`php-backend/index-mysql.php`** - New PHP backend router using MySQL
6. **`migrate-firebase-to-mysql.js`** - Data migration script from Firebase to MySQL
7. **`.env.example`** - Template for environment variables
8. **`MIGRATION_GUIDE.md`** - This documentation file

### Files to Replace (After Migration)

| Original File | Replacement File | Action |
|--------------|-------------------|--------|
| `server.ts` | `server-mysql.ts` | Rename replacement to `server.ts` |
| `php-backend/index.php` | `php-backend/index-mysql.php` | Rename replacement to `index.php` |

### Files to Keep (Not Modified)

- All frontend React components in `src/pages/` (unchanged - API responses remain identical)
- All frontend contexts in `src/contexts/` (API calls unchanged)
- Frontend authentication flow (localStorage-based, no Firebase required)
- Timesheet module (already uses MySQL)
- UI components in `components/`

## Prerequisites

### 1. MySQL Server Installation

Ensure MySQL is installed and running:

```bash
# Ubuntu/Debian
sudo apt-get install mysql-server

# macOS with Homebrew
brew install mysql
brew services start mysql

# Windows
# Download and install MySQL Installer from mysql.com
```

### 2. Create Database

```bash
# Log into MySQL
mysql -u root -p

# Create database
CREATE DATABASE connectit_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user (optional but recommended)
CREATE USER 'connectit_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON connectit_db.* TO 'connectit_user'@'localhost';
FLUSH PRIVILEGES;

EXIT;
```

### 3. Apply Database Schema

```bash
cd "c:\Users\HP\Downloads\final sql\demo"
mysql -u root -p connectit_db < mysql-schema.sql
```

## Step-by-Step Migration Process

### Step 1: Install Dependencies

```bash
cd "c:\Users\HP\Downloads\final sql\demo"

# Install MySQL2 driver for Node.js
npm install mysql2

# Install types for MySQL2
npm install --save-dev @types/mysql2
```

### Step 2: Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your MySQL credentials
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=connectit_db

# Keep Firebase config for migration only
FIREBASE_PROJECT_ID=your_firebase_project_id
```

### Step 3: Migrate Data from Firebase to MySQL

**DRY RUN (Preview changes without writing):**
```bash
node migrate-firebase-to-mysql.js --dry-run
```

**LIVE MIGRATION (Actually migrate data):**
```bash
node migrate-firebase-to-mysql.js
```

**Migrate specific collection only:**
```bash
node migrate-firebase-to-mysql.js --collection=users
node migrate-firebase-to-mysql.js --collection=tickets
```

### Step 4: Replace Backend Files

**For Node.js Backend:**
```bash
# Backup original
cp server.ts server-firebase-backup.ts

# Replace with MySQL version
cp server-mysql.ts server.ts
```

**For PHP Backend:**
```bash
# Backup original
cp php-backend/index.php php-backend/index-firestore-backup.php

# Replace with MySQL version
cp php-backend/index-mysql.php php-backend/index.php
```

### Step 5: Test the Migration

**Start the Node.js backend:**
```bash
npm run dev
```

**Test database connection:**
```bash
curl http://localhost:3000/api/db-test
```

**Test health endpoint:**
```bash
curl http://localhost:3000/api/health
```

**Test tickets API:**
```bash
curl http://localhost:3000/api/tickets/all
```

### Step 6: Start PHP Backend (if using PHP)

```bash
npm run dev:php
# or
php -S localhost:8000 php-backend/index.php
```

### Step 7: Verify Frontend Functionality

1. Open http://localhost:3000 in browser
2. Test login with existing credentials
3. Create a test ticket
4. Verify ticket appears in list
5. Test ticket updates
6. Test dashboard loads correctly
7. Verify all reports work

## Rollback Plan (If Issues Occur)

If you encounter issues, quickly rollback:

```bash
# Restore original Node.js server
cp server-firebase-backup.ts server.ts

# Restore original PHP backend
cp php-backend/index-firestore-backup.php php-backend/index.php

# Restart the server
npm run dev
```

## Post-Migration Cleanup

After confirming everything works:

### Remove Firebase Dependencies (Optional)

```bash
npm uninstall firebase firebase-admin
```

### Clean Up Backup Files

```bash
rm server-firebase-backup.ts
rm php-backend/index-firestore-backup.php
rm php-backend/firestore-client.php
rm php-backend/config.php
```

### Remove Firebase Config Files (Optional)

After successful migration and when no longer needed:

```bash
rm firebase-applet-config.json
rm firebase-blueprint.json
rm firestore.rules
```

## Troubleshooting

### Issue: "Cannot connect to MySQL"

**Solution:**
1. Verify MySQL is running: `sudo systemctl status mysql`
2. Check credentials in `.env`
3. Test connection manually: `mysql -u root -p`
4. Verify database exists: `SHOW DATABASES;`

### Issue: "Table doesn't exist"

**Solution:**
1. Re-run schema: `mysql -u root -p connectit_db < mysql-schema.sql`
2. Check for errors in schema output
3. Verify tables exist: `USE connectit_db; SHOW TABLES;`

### Issue: "Migration script fails"

**Solution:**
1. Ensure Firebase credentials are valid
2. Check GOOGLE_APPLICATION_CREDENTIALS environment variable
3. Run with --dry-run first to preview
4. Check Firebase project ID matches config

### Issue: "API returns 500 errors"

**Solution:**
1. Check server logs for specific error
2. Verify MySQL connection in server.ts
3. Check that all tables exist
4. Verify API endpoint paths match frontend expectations

### Issue: "Frontend not loading"

**Solution:**
1. Ensure Vite dev server is running
2. Check browser console for errors
3. Verify API base URL in frontend
4. Check CORS headers in backend

## API Compatibility Notes

The MySQL backend maintains **100% API compatibility** with the Firebase backend:

- All endpoints remain at same paths
- Request/response formats are identical
- Authentication flow unchanged (localStorage-based)
- Error response format preserved
- Real-time features use polling instead of Firestore listeners

### Changed Behaviors (Internal Only)

1. **Timestamps**: MySQL uses DATETIME instead of Firestore timestamps
2. **IDs**: MySQL uses integer IDs instead of Firestore document IDs
3. **Real-time**: Frontend polling replaces Firestore real-time listeners
4. **Offline**: No automatic offline support (can be added if needed)

## Performance Considerations

### MySQL Optimizations Applied

1. **Indexes**: All frequently queried fields have indexes
2. **Full-text search**: Title and description fields have FULLTEXT indexes
3. **Connection pooling**: 10 connections by default
4. **Prepared statements**: All queries use prepared statements

### Recommended MySQL Tuning

```ini
# my.cnf or my.ini additions for better performance
[mysqld]
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
max_connections = 100
query_cache_size = 16M
```

## Security Considerations

### Changes Made

1. **SQL Injection Prevention**: All queries use prepared statements
2. **Password Hashing**: Simple hash (same as before) - recommend upgrading to bcrypt
3. **Connection Security**: MySQL connections use password authentication

### Recommendations

1. Use MySQL SSL connections for production
2. Restrict MySQL user permissions (GRANT SELECT, INSERT, UPDATE, DELETE only)
3. Store sensitive environment variables securely
4. Consider using connection encryption

## Maintenance

### Regular Tasks

1. **Backup database**: 
   ```bash
   mysqldump -u root -p connectit_db > backup_$(date +%Y%m%d).sql
   ```

2. **Monitor performance**:
   ```sql
   SHOW PROCESSLIST;
   SHOW ENGINE INNODB STATUS;
   ```

3. **Optimize tables**:
   ```sql
   OPTIMIZE TABLE tickets, users, comments;
   ```

## Summary

### What Changed
- Database layer: Firebase Firestore → MySQL
- Backend queries: Firestore API → MySQL SQL
- Connection management: Firebase SDK → MySQL2

### What Stayed the Same
- All frontend code (React components, pages, UI)
- All API endpoint URLs
- All request/response formats
- Authentication flow (localStorage-based)
- Business logic and workflows
- Timesheet module (already MySQL)

### Migration Time Estimate
- Schema creation: 2 minutes
- Data migration: 5-30 minutes (depending on data size)
- Testing: 15-30 minutes
- Total: 30-60 minutes

## Support

If you encounter issues during migration:

1. Check this guide's troubleshooting section
2. Review error logs in console
3. Verify all steps were completed in order
4. Test with `--dry-run` before live migration
5. Keep backup files until migration is confirmed successful

## Verification Checklist

After migration, verify:

- [ ] Database connection test passes
- [ ] All users migrated successfully
- [ ] All tickets migrated successfully
- [ ] Login works with existing credentials
- [ ] Ticket creation works
- [ ] Ticket updates work
- [ ] Comments work
- [ ] Dashboard loads correctly
- [ ] Reports generate correctly
- [ ] Admin panel functions work
- [ ] Timesheet module still works
- [ ] AI features still work (if API key configured)
