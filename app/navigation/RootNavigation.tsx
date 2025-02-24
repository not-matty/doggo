// app/navigation/RootNavigation.tsx

import { createNavigationContainerRef, NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<T extends keyof RootStackParamList>(
  screen: T,
  params?: RootStackParamList[T] extends undefined ? never : RootStackParamList[T]
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(screen as any, params as any);
  } else {
    console.warn('Navigation is not ready');
  }
}
