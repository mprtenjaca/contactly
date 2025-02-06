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
        PRIMARY KEY (id, user_id)
      );
    `);

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
       (id, user_id, name, phoneNumber, category, notes) 
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        contact.id,
        userId,
        contact.name || '',
        contact.phoneNumbers?.[0]?.number || '',
        contact.category || '',
        contact.notes || ''
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
    const result = await database.getFirstAsync(
      'SELECT * FROM contacts WHERE id = ? AND user_id = ? LIMIT 1;',
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
    
    const result = await database.getAllAsync(`
      SELECT 
        id,
        name,
        phoneNumber,
        category,
        notes
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
          (id, user_id, name, phoneNumber, category, notes) 
          VALUES 
          (?, ?, ?, ?, ?, ?);`,
          [
            contact.id,
            userId,
            contact.name || '',
            contact.phoneNumbers?.[0]?.number || '',
            contact.category || '',
            contact.notes || ''
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