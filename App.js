import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      // Check location services (Android)
      if (Platform.OS === 'android') {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          setErrorMsg('Please enable location services');
          Alert.alert('Error', 'Location services are disabled. Please enable them.');
          return;
        }
      }

      // Request permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied');
        Alert.alert('Error', 'Location permission is required to display your coordinates.');
        return;
      }

      // Get initial location
      let loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(loc);

      // Continuous tracking
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 10 },
        (newLocation) => {
          setLocation(newLocation);
        }
      );

      // Cleanup subscription
      return () => subscription.remove();
    })();
  }, []);

  let displayText = 'Waiting for location...';
  if (errorMsg) {
    displayText = errorMsg;
  } else if (location) {
    displayText = `Latitude: ${location.coords.latitude.toFixed(4)}\nLongitude: ${location.coords.longitude.toFixed(4)}`;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{displayText}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
    padding: 20,
    color: '#333',
  },
});