import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function SearchPage() {
    return (
        <View style={styles.container}>
            <TextInput placeholder="Search connections..." style={styles.searchInput} />
            {/* Additional search content here */}
        </View>
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
    },
});
