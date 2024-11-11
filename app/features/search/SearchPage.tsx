// app/features/search/SearchPage.tsx

import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Keyboard, 
  TouchableWithoutFeedback, 
  FlatList 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SearchStackParamList } from '../../navigation/types';
import Feather from 'react-native-vector-icons/Feather';
import UserItem from '../../components/common/UserItem'; // Import UserItem

type SearchPageNavigationProp = StackNavigationProp<SearchStackParamList, 'SearchPage'>;

type User = {
  id: number;
  name: string;
};

const demoUsers: User[] = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `person${i + 1}` }));

const SearchPage: React.FC = () => {
  const navigation = useNavigation<SearchPageNavigationProp>();
  const [query, setQuery] = useState('');

  const handleUserClick = (userId: number) => {
    navigation.navigate('ProfileDetails', { userId: userId.toString() });
  };

  const renderItem = ({ item }: { item: User }) => (
    <UserItem 
      name={item.name} 
      onPress={() => handleUserClick(item.id)} 
    />
  );

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.container}>
        <TextInput
          placeholder="Search"
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
        />
        <FlatList
          data={demoUsers.filter(user => user.name.toLowerCase().includes(query.toLowerCase()))}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          style={styles.userList}
          keyboardDismissMode="on-drag"
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  searchInput: {
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    marginTop: 50,
  },
  userList: {
    flex: 1,
  },
});

export default SearchPage;
