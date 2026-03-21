import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { requestNotificationPermissions } from './src/utils/helpers';
import { isOnboardingDone } from './src/utils/storage';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/constants/colors';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      await requestNotificationPermissions();
      const done = await isOnboardingDone();
      setOnboardingComplete(done);
    } catch (e) {
      console.error('Init error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!onboardingComplete) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <OnboardingScreen onComplete={() => setOnboardingComplete(true)} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" backgroundColor={Colors.bg} translucent />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
