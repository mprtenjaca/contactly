import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Image } from 'react-native';

export default function GoogleSignInButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Image 
        source={require('../assets/images/icon.png')} // ISPRAVI
        style={styles.logo}
      />
      <Text style={styles.text}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  logo: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  text: {
    color: '#757575',
    fontSize: 16,
    fontWeight: '500',
  },
}); 