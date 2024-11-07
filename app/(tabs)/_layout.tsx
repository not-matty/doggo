// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import Feather from 'react-native-vector-icons/Feather';
import { StyleSheet } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen 
        name="home/page" 
        options={{ 
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }} 
      />

      {/* Search Tab */}
      <Tabs.Screen 
        name="search/page" 
        options={{ 
          tabBarIcon: ({ color, size }) => <Feather name="search" size={size} color={color} />,
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen 
        name="profile/page" 
        options={{ 
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }} 
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: '#fff',
  },
});
