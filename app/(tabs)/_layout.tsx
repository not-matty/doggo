// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import Feather from 'react-native-vector-icons/Feather';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarShowLabel: false }}>
      {/* Login Tab as Initial Screen */}
      <Tabs.Screen 
        name="login/page" 
        options={{
          tabBarButton: () => null, // Hide Login tab from the tab bar
        }}
      />

      {/* Home Tab */}
      <Tabs.Screen 
        name="home/page" 
        options={{ 
          title: 'Home', 
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }} 
      />

      {/* Search Tab */}
      <Tabs.Screen 
        name="search/page" 
        options={{ 
          title: 'Search', 
          tabBarIcon: ({ color, size }) => <Feather name="search" size={size} color={color} />,
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen 
        name="profile/page" 
        options={{ 
          title: 'Profile', 
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }} 
      />
    </Tabs>
  );
}
