import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Keyboard, TouchableWithoutFeedback, FlatList, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const demoUsers = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `person${i + 1}` }));
    const router = useRouter();

    const handleUserClick = (userId: number) => {
        router.push({
            pathname: '/profile_details/page',
            params: { userId: userId.toString() }, 
        });
    };

    return (
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.container}>
                <TextInput
                    placeholder="search"
                    style={styles.searchInput}
                    value={query}
                    onChangeText={setQuery}
                />
                <FlatList
                    data={demoUsers}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => handleUserClick(item.id)} style={styles.userItem}>
                            <Text style={styles.userName}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                    style={styles.userList}
                />
            </View>
        </TouchableWithoutFeedback>
    );
}

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
    userItem: {
        paddingVertical: 15,
        paddingHorizontal: 10,
    },
    userName: {
        fontSize: 18,
        color: '#000',
    },
});
