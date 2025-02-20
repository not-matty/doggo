// app/features/search/SearchNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SearchStackParamList } from '@navigation/types';
import SearchPage from './SearchPage';
import ProfileDetailsScreen from '@features/profile/screens/ProfileDetailsScreen';
import { colors } from '@styles/theme';

const SearchStack = createStackNavigator<SearchStackParamList>();

const SearchNavigator: React.FC = () => {
  return (
    <SearchStack.Navigator screenOptions={{ headerShown: false }}>
      <SearchStack.Screen name="SearchPage" component={SearchPage} />
      <SearchStack.Screen
        name="ProfileDetails"
        component={ProfileDetailsScreen}
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerBackTitleVisible: false,
          headerTintColor: colors.primary
        }}
      />
    </SearchStack.Navigator>
  );
};

export default SearchNavigator;
