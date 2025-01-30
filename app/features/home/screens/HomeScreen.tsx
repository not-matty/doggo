// app/features/home/screens/HomeScreen.tsx

import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Image,
  Dimensions,
  FlatList,
  Alert,
  SafeAreaView,
} from 'react-native';
import { supabase } from '@services/supabase'; 
import { Photo, User } from '@navigation/types'; 
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '@navigation/types';
import CustomHeader from '@components/common/CustomHeader';
import { AuthContext } from '@context/AuthContext';
import Feather from 'react-native-vector-icons/Feather';

type HomeScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Home'>;

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width / 2 - 15;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useContext(AuthContext);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching photos:', error);
      Alert.alert('Error', 'Failed to fetch photos.');
    } else {
      const transformedPhotos: Photo[] = data.map((item: any) => ({
        uri: item.url,
        id: item.id,
        userId: item.user_id,
      }));
      setPhotos(transformedPhotos);
    }
    setLoading(false);
  };

  const handlePhotoPress = (item: Photo) => {
    navigation.navigate('ProfileDetails', { userId: item.userId });
  };

  const renderItem = ({ item }: { item: Photo }) => (
    <TouchableOpacity
      onPress={() => handlePhotoPress(item)}
      activeOpacity={0.8}
      style={styles.imageContainer}
    >
      <Image source={{ uri: item.uri }} style={styles.image} resizeMode="cover" />
    </TouchableOpacity>
  );

  // Handler for the floating plus button
  const handleAddPhotoPress = () => {
    navigation.navigate('AddPhoto');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader />

      {/* User Info Row */}
      <View style={styles.userInfoContainer}>
        <Image
          source={{
            uri: user?.profile_picture_url || 'https://via.placeholder.com/50',
          }}
          style={styles.profileImage}
        />
        <Text style={styles.userName}>{user?.name || 'User Name'}</Text>
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : (
          <FlatList
            data={photos}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            numColumns={2}
            contentContainerStyle={styles.flatListContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Floating "+" Icon Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddPhotoPress}
        accessibilityLabel="Add Photo"
      >
        <Feather name="plus" size={28} color="#000" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000', // VSCO-like black background
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#000',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatListContent: {
    paddingBottom: 20,
  },
  imageContainer: {
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    margin: 5,
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#fff',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
