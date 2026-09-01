import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';


// Add some validation
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const savePushToken = async (userId: string, token: string) => {
  try {
    console.log('Saving push token for user:', userId);
    
    // First try to delete any existing tokens for this user
    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId);

    // Then insert the new token
    const { data, error } = await supabase
      .from('push_tokens')
      .insert([
        {
          user_id: userId,
          token: token,
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error saving push token:', error);
      throw error;
    }
    
    console.log('Push token saved successfully');
    return data;
  } catch (error) {
    console.error('Error saving push token:', error);
    throw error;
  }
};

export const sendPushNotification = async (
  userIds: string[],
  title: string,
  body: string,
  data?: any
) => {
  try {
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', userIds);

    if (error) throw error;

    // Call your push notification service (e.g., Expo's push service)
    const messages = tokens.map(({ token }) => ({
      to: token,
      sound: 'notificationSound.wav',
      title,
      body,
      data,
    }));

    // Send to Expo's push service
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}; 