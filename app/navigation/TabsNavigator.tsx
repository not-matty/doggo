// app/navigation/TabsNavigator.tsx

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import HomeNavigator from '@features/home/HomeNavigator';
import SearchNavigator from '@features/search/SearchNavigator';
import ProfileNavigator from '@features/profile/ProfileNavigator';
import LikesScreen from '@features/likes/screens/LikesScreen';
import { TabsParamList, MainStackParamList } from '@navigation/types';
import Feather from 'react-native-vector-icons/Feather';
import { colors, layout, shadows } from '@styles/theme';
import { View } from 'react-native';

const Tab = createBottomTabNavigator<TabsParamList>();

// Empty component for the Upload tab
const UploadTab = () => <View />;

const TabsNavigator: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, size }) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Search') {
            iconName = 'search';
          } else if (route.name === 'Upload') {
            iconName = 'plus-square';
          } else if (route.name === 'Likes') {
            iconName = 'heart';
          } else if (route.name === 'Profile') {
            iconName = 'user';
          } else {
            iconName = 'circle';
          }

          return (
            <Feather
              name={iconName}
              size={layout.iconSize.md}
              color={focused ? colors.primary : colors.secondary}
            />
          );
        },
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.divider,
          borderTopWidth: 0.5,
          height: 49,
          paddingBottom: 0,
          ...shadows.sm,
        },
      })}
      screenListeners={({ route }) => ({
        tabPress: (e) => {
          if (route.name === 'Upload') {
            // Prevent default action
            e.preventDefault();
            // Navigate to AddPhoto screen
            navigation.navigate('AddPhoto');
          }
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Search" component={SearchNavigator} />
      <Tab.Screen name="Upload" component={UploadTab} />
      <Tab.Screen name="Likes" component={LikesScreen} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
};

export default TabsNavigator;
