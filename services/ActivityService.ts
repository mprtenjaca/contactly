import { supabase } from './AuthService';
import { getCurrentUser } from './AuthService';
import { ActivityType } from '../components/ActivityModal';
import { cancelScheduledNotificationsForActivity, scheduleNotificationsForActivity } from './NotificationService';
import { saveActivity } from './DatabaseService';

export interface Activity {
  id: string;
  type: ActivityType;
  date: Date;
  notes?: string;
  contactId: string;
  contactName: string;
}

export const deleteActivity = async (activityId: string, userId: string) => {
  try {
    // Cancel any scheduled notifications first
    await cancelScheduledNotificationsForActivity(activityId);

    const { error } = await supabase
      .from('activities')
      .delete()
      .match({ id: activityId, user_id: userId });

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting activity:', error);
    throw error;
  }
};

export const handleSaveActivity = async (
  type: ActivityType,
  date: Date,
  notes: string | undefined,
  contactId: string,
  contactName: string,
  previousActivity?: Activity
) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('No authenticated user');

    let activityToSave: Activity;

    if (previousActivity) {
      // Updating existing activity
      activityToSave = {
        id: previousActivity.id,
        type,
        date,
        notes,
        contactId,
        contactName
      };

      // Check if date has changed
      const previousDate = new Date(previousActivity.date);
      if (previousDate.getTime() !== date.getTime()) {
        // Cancel existing notifications
        await cancelScheduledNotificationsForActivity(previousActivity.id);
        
        // Schedule new notifications only if the new date is in the future
        if (date > new Date()) {
          await scheduleNotificationsForActivity(activityToSave);
        }
      }
    } else {
      // Creating new activity
      activityToSave = {
        id: `activity_${Date.now()}`,
        type,
        date,
        notes,
        contactId,
        contactName
      };

      // Schedule notifications only for future activities
      if (date > new Date()) {
        await scheduleNotificationsForActivity(activityToSave);
      }
    }

    // Save activity to database
    await saveActivity(activityToSave, user.id);
    return activityToSave.id;

  } catch (error) {
    console.error('Error handling activity save:', error);
    throw error;
  }
}; 