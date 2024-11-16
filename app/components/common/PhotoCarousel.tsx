import React from 'react';
import { FlatList, Image, Dimensions, StyleSheet } from 'react-native';
import { Photo } from '@navigation/types';

type PhotoCarouselProps = {
  photos: any[]; // Adjust type based on your photo implementation
};

const { width, height } = Dimensions.get('window');
const SEARCH_BAR_HEIGHT = 70; // Must match the height used in SearchPage

const PhotoCarousel: React.FC<PhotoCarouselProps> = ({ photos }) => {
  return (
    <FlatList
      data={photos}
      keyExtractor={(item, index) => index.toString()}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => (
        <Image source={item} style={styles.image} />
      )}
      // Prevent vertical scrolling inside the horizontal FlatList
      nestedScrollEnabled={true}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    width: width,
    height: height - SEARCH_BAR_HEIGHT - 60, // Adjusted for search bar and footer
    resizeMode: 'cover',
  },
});

export default PhotoCarousel;
