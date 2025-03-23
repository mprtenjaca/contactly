import * as SQLite from 'expo-sqlite';
import { ActivityType } from '../components/ActivityModal';
import { cancelScheduledNotificationsForActivity } from './NotificationService';


interface SQLTransaction {
  execAsync: (
    sqlStatement: string,
    args?: any[]
  ) => Promise<any>;
}

interface SQLResultSet {
  insertId: number;
  rowsAffected: number;
  rows: {
    length: number;
    item: (index: number) => any;
    _array: any[];
  };
}

interface SQLError {
  code: number;
  message: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  date: Date;
  notes?: string;
  contactId: string;
  contactName: string;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumbers?: Array<{ number: string; }>;
  category?: string;
  notes?: string;
  email?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

// const database = useSQLiteContext();

let db: SQLite.SQLiteDatabase | null = null;

const DB_NAME = 'contactly.db';

const getDb = async () => {
  if (!db) {
    console.log('Opening database connection...');
    db = await SQLite.openDatabaseAsync(DB_NAME);
    console.log('Database connection opened:', db);
  }
  return db;
};

export const initDatabase = async () => {
  try {
    console.log('Initializing database...');
    const database = await getDb();

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT,
        first_name TEXT,
        last_name TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create tables without dropping existing ones
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT,
        user_id TEXT NOT NULL,
        name TEXT,
        phoneNumber TEXT,
        category TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        email TEXT DEFAULT '',
        PRIMARY KEY (id, user_id)
      );
    `);

    // Add email column if it doesn't exist (safe migration)
    // try {
    //   await database.execAsync("ALTER TABLE contacts ADD COLUMN email TEXT DEFAULT '';");
    // } catch (error) {
    //   // Column might already exist, which will cause an error
    //   // We can safely ignore this error
    //   console.log('Email column might already exist:', error);
    // }

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT DEFAULT '',
        contactId TEXT NOT NULL,
        contactName TEXT NOT NULL,
        FOREIGN KEY (contactId, user_id) REFERENCES contacts (id, user_id)
      );
    `);

    // Categories table with default categories
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        userId TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (id)
      );
    `);

    // Add default categories if they don't exist
    const defaultCategories = [
      { name: 'Family', color: '#FF6B6B' },
      { name: 'Work', color: '#4ECDC4' },
      { name: 'Friends', color: '#45B7D1' },
      { name: 'Clients', color: '#96CEB4' }
    ];

    // Insert default categories for each user
    const users = await database.getAllAsync('SELECT id FROM users');
    if (users && Array.isArray(users)) {
      for (const user of users) {
        const now = Date.now();
        for (const category of defaultCategories) {
          const categoryId = `cat_default_${category.name.toLowerCase()}`;
          await database.runAsync(`
            INSERT OR IGNORE INTO categories (id, name, color, userId, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [categoryId, category.name, category.color, user.id, now, now]);
        }
      }
    }

    console.log('Tables created successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

export const saveContact = async (contact: Contact, userId: string) => {
  try {
    const database = await getDb();
    await initDatabase();
    // Use runAsync instead of withTransactionAsync for single operations
    await database.runAsync(
      `INSERT OR REPLACE INTO contacts 
       (id, user_id, name, phoneNumber, category, notes, email) 
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        contact.id,
        userId,
        contact.name || '',
        contact.phoneNumbers?.[0]?.number || '',
        contact.category || '',
        contact.notes || '',
        contact.email || ''
      ]
    );

    console.log('Contact saved successfully:', contact.name);
  } catch (error) {
    console.error('Error saving contact:', error);
    throw error;
  }
};

export const getContact = async (id: string, userId: string): Promise<Contact | null> => {
  try {
    const database = await getDb();
    
    // First check if email column exists
    const tableInfo = await database.getAllAsync("PRAGMA table_info(contacts);");
    const hasEmailColumn = tableInfo.some((col: any) => col.name === 'email');
    
    const result = await database.getFirstAsync(
      `SELECT id, name, phoneNumber, category, notes${hasEmailColumn ? ', email' : ', "" as email'}
       FROM contacts WHERE id = ? AND user_id = ? LIMIT 1;`,
      [id, userId]
    );
    
    if (result) {
      console.log('Retrieved contact:', result);
      return {
        id: result.id,
        name: result.name,
        phoneNumbers: result.phoneNumber ? [{ number: result.phoneNumber }] : [],
        category: result.category || '',
        notes: result.notes || '',
        email: result.email || ''
      };
    }
    console.log('No contact found with id:', id);
    return null;
  } catch (error) {
    console.error('Error getting contact:', error);
    throw error;
  }
};

export const saveActivity = async (activity: Activity, userId: string) => {
  const database = await getDb();
  
  // Check if activity already exists
  const existingActivity = await database.getFirstAsync(
    'SELECT id FROM activities WHERE id = ? AND user_id = ?',
    [activity.id, userId]
  );

  if (existingActivity) {
    // Update existing activity
    await database.runAsync(
      `UPDATE activities 
       SET type = ?, date = ?, notes = ?, contactId = ?, contactName = ?
       WHERE id = ? AND user_id = ?;`,
      [
        activity.type,
        activity.date.toISOString(),
        activity.notes || '',
        activity.contactId,
        activity.contactName,
        activity.id,
        userId
      ]
    );
  } else {
    // Insert new activity
    await database.runAsync(
      `INSERT INTO activities 
       (id, user_id, type, date, notes, contactId, contactName) 
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        activity.id,
        userId,
        activity.type,
        activity.date.toISOString(),
        activity.notes || '',
        activity.contactId,
        activity.contactName
      ]
    );
  }
};

export const getActivitiesForContact = async (contactId: string, userId: string): Promise<Activity[]> => {
  const database = await getDb();
  const result = await database.getAllAsync(
    'SELECT * FROM activities WHERE contactId = ? AND user_id = ? ORDER BY date DESC;',
    [contactId, userId]
  );
  
  if (result && Array.isArray(result)) {
    return result.map((activity: any) => ({
      ...activity,
      date: new Date(activity.date)
    }));
  }
  return [];
};

export const getFutureActivities = async (userId: string): Promise<Activity[]> => {
  const database = await getDb();
  const now = new Date().toISOString();
  
  const result = await database.getAllAsync(
    'SELECT * FROM activities WHERE date > ? AND user_id = ? ORDER BY date ASC;',
    [now, userId]
  );
  
  if (result && Array.isArray(result)) {
    return result.map((activity: any) => ({
      ...activity,
      date: new Date(activity.date)
    }));
  }
  return [];
};

export const getPastActivities = async (userId: string): Promise<Activity[]> => {
  const database = await getDb();
  const now = new Date().toISOString();
  
  const result = await database.getAllAsync(
    'SELECT * FROM activities WHERE date <= ? AND user_id = ? ORDER BY date DESC;',
    [now, userId]
  );
  
  if (result && Array.isArray(result)) {
    return result.map((activity: any) => ({
      ...activity,
      date: new Date(activity.date)
    }));
  }
  return [];
};

export const updateContactCategory = async (contactId: string, category: string, userId: string) => {
  try {
    const database = await getDb();
    await database.runAsync(
      'UPDATE contacts SET category = ? WHERE id = ? AND user_id = ?;',
      [category, contactId, userId]
    );
    console.log('Category updated successfully:', category);
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const updateContactNotes = async (contactId: string, notes: string, userId: string) => {
  try {
    const database = await getDb();
    await database.runAsync(
      'UPDATE contacts SET notes = ? WHERE id = ? AND user_id = ?;',
      [notes, contactId, userId]
    );
    console.log('Notes updated successfully');
  } catch (error) {
    console.error('Error updating notes:', error);
    throw error;
  }
};

export const getAllContacts = async (userId: string): Promise<Contact[]> => {
  try {
    const database = await getDb();
    console.log('Getting all contacts for user:', userId);
    
    // First check if email column exists
    const tableInfo = await database.getAllAsync("PRAGMA table_info(contacts);");
    const hasEmailColumn = tableInfo.some((col: any) => col.name === 'email');
    
    const result = await database.getAllAsync(`
      SELECT 
        id,
        name,
        phoneNumber,
        category,
        notes${hasEmailColumn ? ', email' : ', "" as email'}
      FROM contacts 
      WHERE user_id = ?
      ORDER BY name;
    `, [userId]);

    if (result && Array.isArray(result) && result.length > 0) {
      const contacts = result;
      console.log('Found contacts:', contacts.length);
      return contacts.map((contact: any) => ({
        id: contact.id,
        name: contact.name,
        phoneNumbers: contact.phoneNumber ? [{ number: contact.phoneNumber }] : [],
        category: contact.category || '',
        notes: contact.notes || '',
        email: contact.email || ''
      }));
    }
    
    console.log('No contacts found for user');
    return [];
  } catch (error) {
    console.error('Error getting contacts:', error);
    throw error;
  }
};

export const getContactsByCategory = async (category: string, userId: string): Promise<Contact[]> => {
  const database = await getDb();
  const result = await database.getAllAsync(
    'SELECT * FROM contacts WHERE category = ? AND user_id = ? ORDER BY name;',
    [category, userId]
  );
  if (result && Array.isArray(result) && result.length > 0) {
    const rows = result;
    return rows.map((contact: any) => ({
      id: contact.id,
      name: contact.name,
      phoneNumbers: contact.phoneNumber ? [{ number: contact.phoneNumber }] : [],
      category: contact.category,
      notes: contact.notes,
    }));
  }
  return [];
};

export const importContacts = async (deviceContacts: Contact[], userId: string) => {
  try {
    const database = await getDb();
    console.log('Starting contact import for user:', userId);

    let successCount = 0;
    let errorCount = 0;

    for (const contact of deviceContacts) {
      try {
        if (!contact.id) continue;

        await database.runAsync(
          `INSERT OR REPLACE INTO contacts 
          (id, user_id, name, phoneNumber, category, notes, email) 
          VALUES 
          (?, ?, ?, ?, ?, ?, ?);`,
          [
            contact.id,
            userId,
            contact.name || '',
            contact.phoneNumbers?.[0]?.number || '',
            contact.category || '',
            contact.notes || '',
            contact.email || ''
          ]
        );

        successCount++;
      } catch (err) {
        errorCount++;
        console.error('Import error for contact:', {
          id: contact.id,
          name: contact.name,
          error: err
        });
      }
    }

    console.log(`Import completed. Success: ${successCount}, Errors: ${errorCount}`);

    const countResult = await database.getFirstAsync(
      'SELECT COUNT(*) as count FROM contacts WHERE user_id = ?;',
      [userId]
    );
    console.log('Total contacts for user:', countResult);

  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
};

// Add a function to check if tables exist
export const checkTables = async () => {
  try {
    const database = await getDb();
    const result = await database.getFirstAsync(
      `SELECT name FROM sqlite_master 
       WHERE type='table' AND (name='contacts' OR name='activities');`
    );
    return !!result;
  } catch (error) {
    console.error('Error checking tables:', error);
    return false;
  }
};

export const deleteActivity = async (activityId: string, userId: string) => {
  try {
    const database = await getDb();
    
    // First cancel any scheduled notifications
    await cancelScheduledNotificationsForActivity(activityId);
    
    // Then delete the activity
    await database.runAsync(
      'DELETE FROM activities WHERE id = ? AND user_id = ?;',
      [activityId, userId]
    );
    
    console.log('Activity and its notifications deleted successfully:', activityId);
  } catch (error) {
    console.error('Error deleting activity:', error);
    throw error;
  }
};

export const saveUserToLocal = async (user: User) => {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO users (id, email, first_name, last_name)
     VALUES (?, ?, ?, ?);`,
    [user.id, user.email, user.firstName, user.lastName]
  );

  // Check if user already has categories
  const existingCategories = await database.getAllAsync(
    'SELECT id FROM categories WHERE userId = ?',
    [user.id]
  );

  // Only create default categories if user has none
  if (!existingCategories || existingCategories.length === 0) {
    const defaultCategories = [
      { name: 'Family', color: '#FF6B6B' },
      { name: 'Work', color: '#4ECDC4' },
      { name: 'Friends', color: '#45B7D1' },
      { name: 'Clients', color: '#96CEB4' }
    ];

    const now = Date.now();
    for (const category of defaultCategories) {
      const categoryId = `cat_default_${category.name.toLowerCase()}`;
      await database.runAsync(`
        INSERT OR IGNORE INTO categories (id, name, color, userId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [categoryId, category.name, category.color, user.id, now, now]);
    }
  }
};

export const getLocalUser = async (userId: string): Promise<User | null> => {
  const database = await getDb();
  const result = await database.getFirstAsync(
    'SELECT * FROM users WHERE id = ?;',
    [userId]
  );
  
  if (result) {
    return {
      id: result.id,
      email: result.email,
      firstName: result.first_name,
      lastName: result.last_name,
    };
  }
  return null;
};

// Add these new functions for category management
export const createCategory = async (
  name: string,
  color: string,
  userId: string
) => {
  const db = await getDb();
  const now = Date.now();
  
  // Generate a timestamp-based ID similar to other parts of the app
  const id = `cat_${now}_${Math.random().toString(36).substr(2, 9)}`;

  await db.runAsync(
    `INSERT INTO categories (id, name, color, userId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, color, userId, now, now]
  );

  return { id, name, color };
};

export const getAllCategories = async (userId: string) => {
  const db = await getDb();

  const result = await db.getAllAsync(
    'SELECT id, name, color FROM categories WHERE userId = ? ORDER BY createdAt DESC',
    [userId]
  );

  if (result && Array.isArray(result)) {
    return result.map((category: any) => ({
      id: category.id,
      name: category.name,
      color: category.color
    }));
  }
  return [];
};

export const deleteCategory = async (categoryId: string, userId: string) => {
  const db = await getDb();
  
  // First update any contacts that use this category to have no category
  await db.runAsync(
    'UPDATE contacts SET category = "" WHERE category = ? AND user_id = ?',
    [categoryId, userId]
  );

  // Then delete the category
  await db.runAsync(
    'DELETE FROM categories WHERE id = ? AND userId = ?',
    [categoryId, userId]
  );
};

export const updateContact = async (contact: {
  id: string;
  name: string;
  phoneNumbers: Array<{ number: string }>;
  email?: string;
  notes?: string;
  category?: string;
  userId: string;
}) => {
  try {
    const db = await getDb();
    const { id, name, phoneNumbers, email, notes, category, userId } = contact;

    await db.runAsync(
      `UPDATE contacts 
       SET name = ?, phoneNumber = ?, email = ?, notes = ?, category = ? 
       WHERE id = ? AND user_id = ?`,
      [name, JSON.stringify(phoneNumbers), email || null, notes || null, category || null, id, userId]
    );

    return { ...contact };
  } catch (error) {
    console.error('Error updating contact:', error);
    throw error;
  }
};

export const deleteContact = async (contactId: string, userId: string) => {
  try {
    const database = await getDb();
    
    // First get all activities for this contact
    const activities: Activity[] = await database.getAllAsync(
      'SELECT id FROM activities WHERE contactId = ? AND user_id = ?;',
      [contactId, userId]
    );
    
    // Cancel notifications for each activity
    for (const activity of activities) {
      console.log('Cancelling notifications for activity:', activity.id);
      await cancelScheduledNotificationsForActivity(activity.id);
    }
    
    // Then delete all activities associated with this contact
    await database.runAsync(
      'DELETE FROM activities WHERE contactId = ? AND user_id = ?;',
      [contactId, userId]
    );
    
    // Finally delete the contact
    await database.runAsync(
      'DELETE FROM contacts WHERE id = ? AND user_id = ?;',
      [contactId, userId]
    );
    
  } catch (error) {
    console.error('Error deleting contact:', error);
    throw error;
  }
};