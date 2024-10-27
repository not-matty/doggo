// app/_layout.tsx
import { Tabs } from 'expo-router';
import Feather from 'react-native-vector-icons/Feather';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function Layout() {
  const navigation = useNavigation();

  return (
    <Tabs
      initialRouteName="login/page"
      screenOptions={{
        tabBarShowLabel: false,
        headerStyle: {
          elevation: 0, // Remove shadow on Android
          shadowOpacity: 0, // Remove shadow on iOS
          borderBottomWidth: 0, // Remove bottom border
        },
      }}
    >
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

      {/* Hide Login Tab */}
      <Tabs.Screen 
        name="login/page" 
        options={{
          tabBarButton: () => null, // Hide Login tab from the tab bar
        }}
      />

      {/* Hide Messages Tab with Custom Thin Back Button */}
      <Tabs.Screen 
        name="messages/page" 
        options={{
          title: 'Messages',
          tabBarButton: () => null, // Hide Messages tab from the tab bar
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingLeft: 10 }}>
              <Feather name="chevron-left" size={22} color="black" />
            </TouchableOpacity>
          ),
        }}
      />
    </Tabs>
  );
}
