// app/_layout.tsx
import { Stack } from 'expo-router';
import Feather from 'react-native-vector-icons/Feather';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function Layout() {
  const navigation = useNavigation();

  return (
    <Stack initialRouteName="login/page" screenOptions={{ headerShown: false }}>
      {/* Main Login Screen */}
      <Stack.Screen name="login/page" options={{ headerShown: false }} />

      {/* Main Tabs Layout */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Messages Screen without Tab Bar */}
      <Stack.Screen
        name="messages/page"
        options={{
          headerShown: true,
          title: 'Messages',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingLeft: 10 }}>
              <Feather name="chevron-left" size={22} color="black" />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
