import NetInfo from '@react-native-community/netinfo';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

interface PendingSync {
  id: string;
  type: 'UPDATE_PROFILE' | 'UPDATE_ACTIVITY';
  data: any;
  timestamp: number;
}

class OfflineManager {
  private static instance: OfflineManager;
  private isOnline: boolean = true;
  private pendingSyncs: PendingSync[] = [];
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  private constructor() {
    this.setupNetworkListener();
    this.loadPendingSyncs();
  }

  static getInstance() {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  private async setupNetworkListener() {
    const netInfo = await NetInfo.fetch();
    this.isOnline = netInfo.isConnected ?? false;

    NetInfo.addEventListener(state => {
      const newIsOnline = state.isConnected ?? false;
      if (this.isOnline !== newIsOnline) {
        this.isOnline = newIsOnline;
        this.notifyListeners();
        if (this.isOnline) {
          this.syncPendingChanges();
        }
      }
    });
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  addConnectivityListener(listener: (isOnline: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async loadPendingSyncs() {
    try {
      const syncsString = await AsyncStorage.getItem('pendingSyncs');
      if (syncsString) {
        this.pendingSyncs = JSON.parse(syncsString);
      }
    } catch (error) {
      console.error('Error loading pending syncs:', error);
    }
  }

  private async savePendingSyncs() {
    try {
      await AsyncStorage.setItem('pendingSyncs', JSON.stringify(this.pendingSyncs));
    } catch (error) {
      console.error('Error saving pending syncs:', error);
    }
  }

  async addPendingSync(type: PendingSync['type'], data: any) {
    const sync: PendingSync = {
      id: `sync_${Date.now()}`,
      type,
      data,
      timestamp: Date.now(),
    };
    this.pendingSyncs.push(sync);
    await this.savePendingSyncs();
  }

  async syncPendingChanges() {
    if (!this.isOnline || this.pendingSyncs.length === 0) return;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    for (const sync of [...this.pendingSyncs]) {
      try {
        switch (sync.type) {
          case 'UPDATE_PROFILE':
            await supabase
              .from('profiles')
              .update({
                first_name: sync.data.firstName,
                last_name: sync.data.lastName,
                updated_at: new Date().toISOString(),
              })
              .eq('id', sync.data.userId);
            break;
          // Add other sync types here
        }

        // Remove synced item
        this.pendingSyncs = this.pendingSyncs.filter(s => s.id !== sync.id);
        await this.savePendingSyncs();
      } catch (error) {
        console.error('Error syncing change:', error);
      }
    }
  }

  getIsOnline() {
    return this.isOnline;
  }
}

export const offlineManager = OfflineManager.getInstance(); 