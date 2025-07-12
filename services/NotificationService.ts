import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getCurrentUser } from './AuthService';
import { savePushToken, sendPushNotification } from './SupabaseService';
import { Activity } from './DatabaseService';

interface ReminderData {
  contactName: string;
  phoneNumber?: string;
  date: Date;
  notes?: string;
  category?: string;
  type?: string;
}

let expoPushToken: string | undefined;


const scheduleNotification = async (
  title: string,
  body: string,
  trigger: Date,
  data: any
) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: data,
        sound: "default",
      },
      trigger: {
        date: trigger,
        channelId: 'reminders',
      },
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};

export const scheduleReminderNotification = async (reminder: ReminderData) => {
  try {
    // Round activity date to nearest minute
    const activityDate = new Date(reminder.date);
    activityDate.setSeconds(0, 0);
    
    const now = new Date();
    now.setSeconds(0, 0);
    
    console.log('Scheduling notifications for:', {
      activityDate: activityDate.toISOString(),
      now: now.toISOString()
    });

    const timeDiffInMinutes = Math.floor((activityDate.getTime() - now.getTime()) / (1000 * 60));
    console.log('Time difference in minutes:', timeDiffInMinutes);

    // Don't schedule any notifications if the activity is less than 1 minute away
    if (timeDiffInMinutes <= 1) {
      console.log('Activity too soon, skipping notifications');
      return;
    }

    // Calculate reminder times only if they're in the future
    const notifications = [];

    // Day before at 9 AM (if more than 24 hours away)
    if (timeDiffInMinutes > 1440) {
      const dayBefore = new Date(activityDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(9, 0, 0, 0);
      
      if (dayBefore > now) {
        notifications.push({
          title: 'Upcoming Activity Tomorrow',
          body: `You have a ${reminder.type} with ${reminder.contactName} tomorrow at ${activityDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          trigger: dayBefore,
          type: 'day-before'
        });
      }
    }

    // 5 minutes before (if more than 5 minutes away)
    if (timeDiffInMinutes > 5) {
      const fiveMinBefore = new Date(activityDate);
      fiveMinBefore.setMinutes(fiveMinBefore.getMinutes() - 5, 0, 0);
      
      if (fiveMinBefore > now) {
        notifications.push({
          title: 'Activity Starting Soon',
          body: `Your ${reminder.type} with ${reminder.contactName} starts in 5 minutes${reminder.notes ? `\n${reminder.notes}` : ''}`,
          trigger: fiveMinBefore,
          type: '5-min'
        });
      }
    }

    // 1 minute before (if more than 1 minute away)
    const oneMinBefore = new Date(activityDate);
    oneMinBefore.setMinutes(oneMinBefore.getMinutes() - 1, 0, 0);
    
    if (oneMinBefore > now) {
      notifications.push({
        title: 'Activity Starting Now',
        body: `Your ${reminder.type} with ${reminder.contactName} is about to start${reminder.notes ? `\n${reminder.notes}` : ''}`,
        trigger: oneMinBefore,
        type: '1-min'
      });
    }

    // Schedule all valid notifications
    for (const notification of notifications) {
      await scheduleNotification(
        notification.title,
        notification.body,
        notification.trigger,
        { ...reminder, reminderType: notification.type }
      );
      console.log(`Scheduled ${notification.type} notification for:`, notification.trigger);
    }

    console.log(`Successfully scheduled ${notifications.length} notifications`);
  } catch (error) {
    console.error('Error scheduling reminders:', error);
  }
};

export const initializeNotifications = async () => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return;
    }

    // Set up notification handlers
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    console.log('Push notifications initialized successfully');
  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
};

export const scheduleActivityNotifications = async (activity: any) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('No user logged in');

    const activityDate = new Date(activity.date);
    const now = new Date();
    
    // Calculate notification times
    const notifications = [];
    
    // Day before at 9 AM
    if (activityDate.getTime() - now.getTime() > 24 * 60 * 60 * 1000) {
      const dayBefore = new Date(activityDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(9, 0, 0, 0);
      notifications.push({
        scheduledTime: dayBefore,
        message: `Tomorrow: ${activity.type} with ${activity.contactName}`,
      });
    }

    // 5 minutes before
    const fiveMinBefore = new Date(activityDate.getTime() - 5 * 60 * 1000);
    if (fiveMinBefore > now) {
      notifications.push({
        scheduledTime: fiveMinBefore,
        message: `In 5 minutes: ${activity.type} with ${activity.contactName}`,
      });
    }

    // 1 minute before
    const oneMinBefore = new Date(activityDate.getTime() - 60 * 1000);
    if (oneMinBefore > now) {
      notifications.push({
        scheduledTime: oneMinBefore,
        message: `Starting soon: ${activity.type} with ${activity.contactName}`,
      });
    }

    // Schedule all notifications
    for (const notification of notifications) {
      await sendPushNotification(
        [user.id],
        'Activity Reminder',
        notification.message,
        { activityId: activity.id }
      );
    }
  } catch (error) {
    console.error('Error scheduling push notifications:', error);
  }
};

// Add notification response handler
export const setupNotificationHandlers = () => {
  const notificationListener = Notifications.addNotificationReceivedListener(
    notification => {
      console.log('Notification received:', notification);
    }
  );

  const responseListener = Notifications.addNotificationResponseReceivedListener(
    response => {
      console.log('Notification response:', response);
      // Handle notification interaction here
      const data = response.notification.request.content.data;
      if (data.type === 'activity') {
        // Navigate to relevant screen
        // router.push(...);
      }
    }
  );

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
};

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

function handleRegistrationError(errorMessage: string) {
  alert(errorMessage);
  throw new Error(errorMessage);
}

export const registerForPushNotificationsAsync = async () => {
  if (!Device.isDevice) {
    handleRegistrationError('Must use physical device for push notifications');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    handleRegistrationError('Permission not granted to get push token for push notification!');
    return;
  }

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) {
    handleRegistrationError('Project ID not found');
  }

  try {
    const pushTokenString = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
    console.log(pushTokenString);
    return pushTokenString;
  } catch (e: unknown) {
    handleRegistrationError(`${e}`);
  }
};

export const scheduleActivityNotification = async ({ 
  title, 
  body, 
  data, 
  trigger 
}: { 
  title: string;
  body: string;
  data?: any;
  trigger: Date;
}) => {
  try {
    const notificationTimes = [
      { minutes: 30, label: '30 minutes' },
      { minutes: 15, label: '15 minutes' },
      { minutes: 0, label: '' }
    ];

    const scheduledIds = [];

    for (const time of notificationTimes) {
      const notificationDate = new Date(trigger);
      notificationDate.setMinutes(notificationDate.getMinutes() - time.minutes);

      // Skip if the notification time is in the past
      if (notificationDate <= new Date()) continue;

      const notificationTitle = time.minutes > 0 
        ? `${title} in ${time.label}`
        : title;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationTitle,
          body: body,
          data: data,
          sound: "default",
        },
        trigger: {
          date: notificationDate,
        },
      });
      
      scheduledIds.push(id);
      console.log(`Scheduled notification for ${time.label || 'activity time'}:`, id);
    }

    return scheduledIds;
  } catch (error) {
    console.error('Error scheduling notifications:', error);
  }
};

export const cancelScheduledNotificationsForActivity = async (activityId: string) => {
  try {
    // Get all scheduled notifications for this activity
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Filter and cancel notifications for this activity
    const activityNotifications = scheduledNotifications.filter(
      notification => notification.content.data?.activityId === activityId
    );
    
    for (const notification of activityNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
    
    console.log(`Cancelled ${activityNotifications.length} notifications for activity:`, activityId);
  } catch (error) {
    console.error('Error cancelling notifications:', error);
    throw error;
  }
};

// Update scheduleNotificationsForActivity to store activityId in notification data
export const scheduleNotificationsForActivity = async (activity: Activity) => {
  try {
    const notificationTimes = [
      { minutes: 0, message: "It's time for your scheduled activity" },
      { minutes: 15, message: "Upcoming activity in 15 minutes" },
      { minutes: 60, message: "Upcoming activity in 1 hour" }
    ];

    const scheduledIds = [];
    
    // Format the title to include formatted activity type labels
    const getActivityTypeLabel = (type: string): string => {
      switch (type.toLowerCase()) {
        case 'call': return 'Phone Call';
        case 'message': return 'Message';
        case 'meeting': return 'Meeting';
        case 'note': return 'Note';
        case 'email': return 'Email';
        case 'whatsapp': return 'WhatsApp';
        default: return type.charAt(0).toUpperCase() + type.slice(1);
      }
    };

    const notificationTitle = `${getActivityTypeLabel(activity.type)} - ${activity.contactName}`;
    
    for (const { minutes, message } of notificationTimes) {
      const notificationTime = new Date(activity.date.getTime() - minutes * 60000);
      if (notificationTime > new Date()) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: notificationTitle,
            body: message,
            data: { 
              contactId: activity.contactId,
              activityId: activity.id
            },
          },
          trigger: {
            date: notificationTime,
            channelId: 'reminders',
          },
        });
        scheduledIds.push(id);
      }
    }

    // In development, log the scheduled notifications
    if (__DEV__) {
      console.log(`Scheduled ${scheduledIds.length} notifications for activity:`, activity.id);
    }

    return scheduledIds;
  } catch (error) {
    console.error('Error scheduling notifications:', error);
    throw error;
  }
}; 