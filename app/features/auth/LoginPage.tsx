import React, { useState, useContext } from 'react';
import { View, TextInput, Button, StyleSheet, Text } from 'react-native';
import { AuthContext } from '@context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '@navigation/types';

type AuthNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

const Login: React.FC = () => {
  const { signIn } = useContext(AuthContext);
  const navigation = useNavigation<AuthNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    await signIn(email, password);
  };

  const handleCreateProfile = () => {
    navigation.navigate('Register'); // Navigate to the Register screen
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
      <Button title="Sign In" onPress={handleSignIn} />
      {/* New button for creating a profile */}
      <View style={{ marginTop: 20 }}>
        <Button title="Create Profile" onPress={handleCreateProfile} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 24,
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: '#555',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    color: '#000',
  },
});

export default Login;
