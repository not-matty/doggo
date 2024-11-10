import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

// Import the local profile picture
import defaultProfilePic from '../../assets/images/Default_pfp.svg.png'; // Adjust the path based on your project structure

const ProfileDetails = () => {
    const { userId } = useLocalSearchParams();
    const [liked, setLiked] = useState(false);

    const toggleLike = () => {
        setLiked(!liked);
    };

    return (
        <View style={styles.container}>
            <Image
                source={defaultProfilePic} // Use the local image as the default profile picture
                style={styles.profileImage}
            />
            <Text style={styles.title}>Profile Details</Text>
            <Text>User ID: {userId}</Text>
            <TouchableOpacity onPress={toggleLike} style={styles.likeButton}>
                <Text style={[styles.likeButtonText, { color: liked ? '#D32F2F' : '#000' }]}>
                    {liked ? '♥ Liked' : '♡ Like'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    likeButton: {
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: '#FFCDD2',
    },
    likeButtonText: {
        fontSize: 18,
    },
});

export default ProfileDetails;
