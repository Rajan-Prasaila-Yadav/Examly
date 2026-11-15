// apps/mobile/App.tsx
import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/auth-context';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { HomeScreen } from './src/screens/student/HomeScreen';
import { LearnScreen } from './src/screens/student/LearnScreen';
import { TestsScreen } from './src/screens/student/TestsScreen';
import { ActivityScreen } from './src/screens/student/ActivityScreen';
import { ProfileScreen } from './src/screens/student/ProfileScreen';
import { VideoPlayerScreen } from './src/screens/student/VideoPlayerScreen';
import { PdfReaderScreen } from './src/screens/student/PdfReaderScreen';
import { BottomTabBar, TabType } from './src/components/BottomTabBar';

function MainApp() {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabType>('home');

  // Fullscreen Modal States
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <StatusBar barStyle="light-content" backgroundColor="#06070B" />
        <ActivityIndicator size="large" color="#7C65F6" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // If viewing video in fullscreen player
  if (activeVideoId) {
    return (
      <VideoPlayerScreen
        videoId={activeVideoId}
        onBack={() => setActiveVideoId(null)}
        onNavigateVideo={(newId) => setActiveVideoId(newId)}
      />
    );
  }

  // If viewing PDF note in reader
  if (activeNoteId) {
    return (
      <PdfReaderScreen
        noteId={activeNoteId}
        onBack={() => setActiveNoteId(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06070B" />
      <View style={styles.screenContainer}>
        {currentTab === 'home' && (
          <HomeScreen
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onOpenTest={() => setCurrentTab('tests')}
            onOpenVideo={(vId) => setActiveVideoId(vId || 'vid-2')}
            onOpenNote={(nId) => setActiveNoteId(nId || 'note-1')}
            onOpenBatch={() => setCurrentTab('learn')}
          />
        )}
        {currentTab === 'learn' && (
          <LearnScreen
            onOpenVideo={(vId) => setActiveVideoId(vId || 'vid-2')}
            onOpenNote={(nId) => setActiveNoteId(nId || 'note-1')}
            onOpenTest={() => setCurrentTab('tests')}
          />
        )}
        {currentTab === 'tests' && <TestsScreen />}
        {currentTab === 'activity' && (
          <ActivityScreen
            onOpenTest={() => setCurrentTab('tests')}
            onOpenVideo={(vId) => setActiveVideoId(vId || 'vid-2')}
            onOpenNote={(nId) => setActiveNoteId(nId || 'note-1')}
          />
        )}
        {currentTab === 'profile' && (
          <ProfileScreen
            onOpenTest={() => setCurrentTab('tests')}
            onOpenNote={(nId) => setActiveNoteId(nId || 'note-1')}
          />
        )}
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
    backgroundColor: '#07080E',
  },
  splash: {
    flex: 1,
    backgroundColor: '#07080E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenContainer: {
    flex: 1,
  },
});
