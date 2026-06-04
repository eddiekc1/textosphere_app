import Constants from 'expo-constants';
import { Platform } from 'react-native';

type NotificationsModule = {
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: (permissions?: {
    ios?: {
      allowAlert?: boolean;
      allowBadge?: boolean;
      allowSound?: boolean;
    };
  }) => Promise<unknown>;
  setBadgeCountAsync: (badgeCount: number) => Promise<boolean>;
};

let notificationsModulePromise: Promise<NotificationsModule> | null = null;

export async function setNativeBadgeCount(count: number): Promise<void> {
  if (Platform.OS === 'web' || Constants.appOwnership === 'expo') {
    return;
  }

  try {
    const notifications = await loadNotificationsModule();

    if (Platform.OS === 'ios') {
      const permissions = await notifications.getPermissionsAsync();
      if (permissions.status !== 'granted') {
        await notifications.requestPermissionsAsync({
          ios: {
            allowAlert: false,
            allowBadge: true,
            allowSound: false,
          },
        });
      }
    }

    await notifications.setBadgeCountAsync(count);
  } catch {
    // Badge support depends on the build type, platform, and Android launcher.
  }
}

function loadNotificationsModule(): Promise<NotificationsModule> {
  notificationsModulePromise ??= import('expo-notifications') as Promise<NotificationsModule>;
  return notificationsModulePromise;
}
