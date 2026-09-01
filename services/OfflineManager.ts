import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './AuthService';

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
  private isSyncing = false;
  private loaded: Promise<void>;

  private constructor() {
    this.setupNetworkListener();
    // Held so callers that queue work in the first tick do not have their
    // entry overwritten when the stored queue finishes loading.
    this.loaded = this.loadPendingSyncs();
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
    await this.loaded;
    // A connectivity flap can fire this while a previous run is mid-flight; two
    // runs over the same queue snapshot would re-apply the same changes and let
    // the slower one write back a stale queue, resurrecting synced items.
    if (this.isSyncing || !this.isOnline || this.pendingSyncs.length === 0) return;

    this.isSyncing = true;
    try {
      for (const sync of [...this.pendingSyncs]) {
        try {
          switch (sync.type) {
            case 'UPDATE_PROFILE': {
              // supabase-js resolves with { error } rather than throwing, so the
              // result must be inspected or a failed sync is silently dropped.
              const { error } = await supabase
                .from('profiles')
                .update({
                  first_name: sync.data.firstName,
                  last_name: sync.data.lastName,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', sync.data.userId);
              if (error) throw error;
              break;
            }
            // Add other sync types here
          }

          // Drop the item only once the write actually succeeded.
          this.pendingSyncs = this.pendingSyncs.filter(s => s.id !== sync.id);
          await this.savePendingSyncs();
        } catch (error) {
          // Leave it queued so the next sync retries it.
          console.error('Error syncing change:', error);
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  getIsOnline() {
    return this.isOnline;
  }
}

export const offlineManager = OfflineManager.getInstance(); 