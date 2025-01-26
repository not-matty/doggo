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
import { supabase } from '@services/supabase'; // Ensure this path is correct
import { Photo } from '@navigation/types'; // Ensure the Photo type is defined appropriately
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '@navigation/types'; // Adjust based on your navigation setup
import CustomHeader from '@components/common/CustomHeader'; // Ensure CustomHeader is correctly implemented
import Feather from 'react-native-vector-icons/Feather'; // For the "+" icon
import EmptyState from '@components/common/EmptyState';
import { AuthContext } from '@context/AuthContext';

type HomeScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Home'>;

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width / 2) - 20; // Adjusted for spacing

const HomeScreen: React.FC = () => {
  const { user } = useContext(AuthContext); // Ensure AuthContext is correctly imported and provides necessary data
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigation = useNavigation<HomeScreenNavigationProp>();

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('photos') // Ensure you have a 'photos' table in Supabase
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching photos:', error);
    } else {
      // Transform data to match FlatList's expected format
      const transformedPhotos: Photo[] = data.map((item: any) => ({
        uri: item.url, // Ensure 'url' field exists in your 'photos' table
        id: item.id,
        userId: item.user_id, // For navigation purposes
      }));
      setPhotos(transformedPhotos);
    }
    setLoading(false);
  };

  const handlePhotoPress = (item: Photo) => {
    navigation.navigate('ProfileDetails', { userId: item.userId }); // Ensure 'ProfileDetails' route exists
  };

  const handleAddPhoto = () => {
    // Navigate to AddPhoto screen or open camera/gallery
    navigation.navigate('AddPhoto'); // Ensure 'AddPhoto' route is defined in your navigation stack
  };

  const renderItem = ({ item }: { item: Photo }) => (
    <TouchableOpacity onPress={() => handlePhotoPress(item)} activeOpacity={0.8}>
      <Image source={{ uri: item.uri }} style={styles.image} resizeMode="cover" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom Header */}
      <CustomHeader />

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : photos.length === 0 ? (
          <EmptyState message="No photos available." />
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
      <TouchableOpacity style={styles.fab} onPress={handleAddPhoto} accessibilityLabel="Add Photo">
        <Feather name="plus" size={24} color="#000" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    paddingTop: 60, // Adjust based on CustomHeader height
    paddingHorizontal: 10,
    paddingBottom: 80, // Adjust based on Footer height or desired padding
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatListContent: {
    paddingBottom: 20,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    margin: 5,
    borderRadius: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 30, // Adjust based on desired spacing from the bottom
    right: 30, // Adjust based on desired spacing from the right
    backgroundColor: '#fff', // White background for the "+" icon
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, // Adds shadow for Android
    shadowColor: '#000', // Adds shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
  },
});
