import { Tabs } from 'expo-router';
import Icon from 'react-native-vector-icons/FontAwesome';

export default function Layout() {
  return (
    <Tabs initialRouteName="login/page" screenOptions={{ tabBarShowLabel: false }}>
      {/* Home Tab */}
      <Tabs.Screen 
        name="home/page" 
        options={{ 
          title: 'Home', 
          tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} />,
        }} 
      />

      {/* Search Tab */}
      <Tabs.Screen 
        name="search/page" 
        options={{ 
          title: 'Search', 
          tabBarIcon: ({ color, size }) => <Icon name="search" size={size} color={color} />,
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen 
        name="profile/page" 
        options={{ 
          title: 'Profile', 
          tabBarIcon: ({ color, size }) => <Icon name="user" size={size} color={color} />,
        }} 
      />

      {/* Hide Login Tab */}
      <Tabs.Screen 
        name="login/page" 
        options={{
          tabBarButton: () => null, // Hide Login tab from the tab bar
        }}
      />

      {/* Hide Messages Tab */}
      <Tabs.Screen 
        name="messages/page" 
        options={{
          tabBarButton: () => null, // Hide Messages tab from the tab bar
        }}
      />
    </Tabs>
  );
}
