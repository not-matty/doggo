import React from 'react';
import { View, TextInput, StyleSheet, Keyboard, TouchableWithoutFeedback } from 'react-native';

export default function SearchPage() {
    return (
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.container}>
                <TextInput placeholder="search" style={styles.searchInput} />
                {/* Additional search content here */}
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
    },
});
