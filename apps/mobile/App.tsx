// apps/mobile/App.tsx
import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/auth-context';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { HomeScreen } from './src/screens/student/HomeScreen';
import { BatchesScreen } from './src/screens/student/BatchesScreen';
import { TestsScreen } from './src/screens/student/TestsScreen';
import { NotesScreen } from './src/screens/student/NotesScreen';
import { ProfileScreen } from './src/screens/student/ProfileScreen';
import { BottomTabBar, TabType } from './src/components/BottomTabBar';

function MainApp() {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabType>('home');

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#8B80F5" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.screenContainer}>
        {currentTab === 'home' && <HomeScreen />}
        {currentTab === 'batches' && <BatchesScreen />}
        {currentTab === 'tests' && <TestsScreen />}
        {currentTab === 'notes' && <NotesScreen />}
        {currentTab === 'profile' && <ProfileScreen />}
      </View>
      <BottomTabBar currentTab={currentTab} onTabChange={setCurrentTab} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060709',
  },
  splash: {
    flex: 1,
    backgroundColor: '#060709',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenContainer: {
    flex: 1,
  },
});
