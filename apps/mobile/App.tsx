// apps/mobile/App.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar, BackHandler } from 'react-native';
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

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeVideoId) {
        setActiveVideoId(null);
        return true;
      }
      if (activeNoteId) {
        setActiveNoteId(null);
        return true;
      }
      if (currentTab !== 'home') {
        setCurrentTab('home');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [activeNoteId, activeVideoId, currentTab]);

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
        onOpenNote={(noteId) => {
          setActiveVideoId(null);
          setActiveNoteId(noteId);
        }}
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
        <View style={[styles.tabScreen, currentTab !== 'home' && styles.hiddenScreen]} pointerEvents={currentTab === 'home' ? 'auto' : 'none'}>
          <HomeScreen
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onOpenTest={() => setCurrentTab('tests')}
            onOpenVideo={(vId) => setActiveVideoId(vId ?? null)}
            onOpenNote={(nId) => setActiveNoteId(nId ?? null)}
            onOpenBatch={() => setCurrentTab('learn')}
          />
        </View>
        <View style={[styles.tabScreen, currentTab !== 'learn' && styles.hiddenScreen]} pointerEvents={currentTab === 'learn' ? 'auto' : 'none'}>
          <LearnScreen
            onOpenVideo={(vId) => setActiveVideoId(vId ?? null)}
            onOpenNote={(nId) => setActiveNoteId(nId ?? null)}
            onOpenTest={() => setCurrentTab('tests')}
          />
        </View>
        <View style={[styles.tabScreen, currentTab !== 'tests' && styles.hiddenScreen]} pointerEvents={currentTab === 'tests' ? 'auto' : 'none'}><TestsScreen /></View>
        <View style={[styles.tabScreen, currentTab !== 'activity' && styles.hiddenScreen]} pointerEvents={currentTab === 'activity' ? 'auto' : 'none'}>
          <ActivityScreen
            onOpenTest={() => setCurrentTab('tests')}
            onOpenVideo={(vId) => setActiveVideoId(vId ?? null)}
            onOpenNote={(nId) => setActiveNoteId(nId ?? null)}
          />
        </View>
        <View style={[styles.tabScreen, currentTab !== 'profile' && styles.hiddenScreen]} pointerEvents={currentTab === 'profile' ? 'auto' : 'none'}>
          <ProfileScreen
            onOpenNote={(nId) => setActiveNoteId(nId ?? null)}
          />
        </View>
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
  tabScreen: {
    flex: 1,
  },
  hiddenScreen: {
    display: 'none',
  },
});
