// apps/mobile/src/screens/student/HomeScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import {
  Bell,
  GraduationCap,
  ChevronRight,
  Play,
  FileText,
  Bookmark,
  Download,
  Flame,
  ClipboardCheck,
  Clock,
  HelpCircle,
} from 'lucide-react-native';

interface HomeScreenProps {
  onNavigateTab?: (tab: 'home' | 'learn' | 'tests' | 'activity' | 'profile') => void;
  onOpenTest?: (id?: string) => void;
  onOpenVideo?: (id?: string) => void;
  onOpenNote?: (id?: string) => void;
  onOpenBatch?: (id?: string) => void;
}

export function HomeScreen({
  onNavigateTab,
  onOpenTest,
  onOpenVideo,
  onOpenNote,
  onOpenBatch,
}: HomeScreenProps) {
  const { user, logout } = useAuth();
  const [feed, setFeed] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const response = await apiClient.get('/api/v1/students/home-feed');
      if (response.data?.success) {
        setFeed(response.data.data);
      }
    } catch (err: any) {
      console.warn('Failed to load student home feed:', err);
      setError('Unable to load feed. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const student = feed?.student || user;
  const firstName = user?.fullName?.split(' ')[0] || student?.fullName?.split(' ')[0] || 'Student';
  const batch = feed?.enrolledBatch;
  const continueProgress = feed?.continueWatching;
  const continueVideo = continueProgress?.video;
  const liveTest = feed?.liveTests?.[0];

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B80F5" />
        <Text style={styles.loadingText}>Loading your learning dashboard…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07080E" />

      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.logoRow}>
          <Image
            source={require('../../../assets/logo_icon.png')}
            style={styles.logoIcon}
            resizeMode="contain"
          />
          <Text style={styles.logoWordmark}>Examly</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => onNavigateTab?.('activity')}
            activeOpacity={0.8}
          >
            <Bell size={21} color="#E2E8F0" />
            <View style={styles.unreadDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => onNavigateTab?.('profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{firstName[0]?.toUpperCase() || 'R'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchFeed(true)}
            tintColor="#8B80F5"
          />
        }
      >
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>
            {greeting}, {firstName}
          </Text>
          <Text style={styles.greetingSubtitle}>Keep your preparation moving.</Text>
        </View>

        {/* Batch Selector Card */}
        <TouchableOpacity
          style={styles.batchSelector}
          onPress={() => onNavigateTab?.('learn')}
          activeOpacity={0.85}
        >
          <View style={styles.batchSelectorLeft}>
            <GraduationCap size={22} color="#8B80F5" />
            <Text style={styles.batchSelectorText}>{batch?.name || 'Select Batch'}</Text>
          </View>
          <ChevronRight size={18} color="#8A8F9E" />
        </TouchableOpacity>

        {/* Continue Learning Hero Card */}
        {continueVideo ? (
          <LinearGradient
            colors={['#322278', '#4F33BA', '#6D4FF0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTop}>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroTag}>CONTINUE LEARNING</Text>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {continueVideo.lesson?.name || continueVideo.title}
                </Text>
                <Text style={styles.heroSubtitle} numberOfLines={1}>
                  {continueVideo.lesson?.subject?.name ? `${continueVideo.lesson.subject.name} • ` : ''}
                  {continueVideo.title}
                </Text>

                {/* Progress Line */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(100, Math.max(0, continueProgress.percentage || 0))}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressTimeText}>
                  {continueProgress.minutesLeft ?? 18} min left
                </Text>
              </View>

              {/* Illustration / Graphic right */}
              <View style={styles.heroGraphicBox}>
                <View style={styles.orbitalRing}>
                  <View style={styles.orbitalPlanet} />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.resumeButton}
              onPress={() => onOpenVideo?.(continueVideo.id)}
              activeOpacity={0.9}
            >
              <Play size={16} color="#6D4FF0" fill="#6D4FF0" />
              <Text style={styles.resumeButtonText}>Resume</Text>
            </TouchableOpacity>
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={['#1E1B4B', '#2E1065', '#3B0764']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTop}>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroTag}>START LEARNING</Text>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {batch?.name || 'Explore Your Syllabus'}
                </Text>
                <Text style={styles.heroSubtitle}>
                  Choose a subject to watch lectures and solve problems.
                </Text>
              </View>
              <View style={styles.heroGraphicBox}>
                <View style={styles.orbitalRing}>
                  <View style={styles.orbitalPlanet} />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.resumeButton}
              onPress={() => onNavigateTab?.('learn')}
              activeOpacity={0.9}
            >
              <Play size={16} color="#6D4FF0" fill="#6D4FF0" />
              <Text style={styles.resumeButtonText}>Start Learning</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* Quick Access Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick access</Text>
        </View>

        <View style={styles.quickAccessGrid}>
          {/* Videos */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => onNavigateTab?.('learn')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#2D1F6E', '#1B1C2E']}
              style={styles.quickCardGradient}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: '#7C65F6' }]}>
                <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
              </View>
              <Text style={styles.quickCardLabel}>Videos</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Notes */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => onOpenNote?.()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1E234A', '#1B1C2E']}
              style={styles.quickCardGradient}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: '#4C6EF5' }]}>
                <FileText size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.quickCardLabel}>Notes</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Bookmarks */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => onNavigateTab?.('activity')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#3B1F3D', '#1B1C2E']}
              style={styles.quickCardGradient}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: '#E64980' }]}>
                <Bookmark size={18} color="#FFFFFF" fill="#FFFFFF" />
              </View>
              <Text style={styles.quickCardLabel}>Bookmarks</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Downloads */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => onNavigateTab?.('activity')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1D2E4A', '#1B1C2E']}
              style={styles.quickCardGradient}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: '#339AF0' }]}>
                <Download size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.quickCardLabel}>Downloads</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Upcoming Test Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Upcoming test</Text>
          <TouchableOpacity onPress={() => onNavigateTab?.('tests')} activeOpacity={0.8}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        {liveTest ? (
          <View style={styles.upcomingTestCard}>
            <View style={styles.testBadgeRow}>
              <View style={styles.tomorrowBadge}>
                <Text style={styles.tomorrowBadgeText}>{liveTest.badge || 'UPCOMING'}</Text>
              </View>
            </View>

            <Text style={styles.testCardTitle}>
              {liveTest.title}
            </Text>
            <Text style={styles.testDateTimeText}>
              {liveTest.formattedDate || 'Upcoming Schedule'}
            </Text>

            <View style={styles.testFooterRow}>
              <View style={styles.testMetaLeft}>
                <View style={styles.testMetaItem}>
                  <ClipboardCheck size={16} color="#8A8F9E" />
                  <Text style={styles.testMetaText}>
                    {liveTest.questionsCount || 20} questions
                  </Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.testMetaItem}>
                  <Clock size={16} color="#8A8F9E" />
                  <Text style={styles.testMetaText}>
                    {liveTest.durationMinutes >= 60
                      ? `${Math.round(liveTest.durationMinutes / 60)} hours`
                      : `${liveTest.durationMinutes} mins`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => onOpenTest?.(liveTest.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.viewDetailsText}>View details</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.upcomingTestCard}>
            <Text style={styles.testCardTitle}>No upcoming tests scheduled</Text>
            <Text style={styles.testDateTimeText}>All current tests are up to date.</Text>
            <View style={styles.testFooterRow}>
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => onNavigateTab?.('tests')}
                activeOpacity={0.85}
              >
                <Text style={styles.viewDetailsText}>View all tests</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Your Preparation Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your preparation</Text>
        </View>

        <View style={styles.prepRow}>
          {/* Tests completed */}
          <View style={styles.prepCard}>
            <View style={[styles.prepIconCircle, { backgroundColor: '#6D4FF025' }]}>
              <ClipboardCheck size={22} color="#8B80F5" />
            </View>
            <View style={styles.prepCardTextCol}>
              <Text style={styles.prepLabel}>Tests completed</Text>
              <Text style={styles.prepNumber}>{feed?.stats?.testsTaken ?? 0}</Text>
            </View>
          </View>

          {/* Study streak */}
          <View style={styles.prepCard}>
            <View style={[styles.prepIconCircle, { backgroundColor: '#F59E0B25' }]}>
              <Flame size={22} color="#F59E0B" />
            </View>
            <View style={styles.prepCardTextCol}>
              <Text style={styles.prepLabel}>Study streak</Text>
              <Text style={styles.prepNumber}>
                {feed?.stats?.streakDays ?? (feed?.stats?.testsTaken > 0 ? 1 : 0)} days
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.quoteText}>Small steps. Stronger preparation.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07080E',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#07080E',
    gap: 12,
  },
  loadingText: {
    color: '#8A8F9E',
    fontSize: 14,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 28,
    height: 28,
  },
  logoWordmark: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#141624',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#212538',
  },
  unreadDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B80F5',
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#8B80F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  greetingSection: {
    marginTop: 10,
    marginBottom: 16,
  },
  greetingTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  greetingSubtitle: {
    color: '#8A8F9E',
    fontSize: 14,
    marginTop: 4,
  },
  batchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111320',
    borderWidth: 1,
    borderColor: '#1F2236',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
  },
  batchSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  batchSelectorText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTextCol: {
    flex: 1,
  },
  heroTag: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  progressTimeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  heroGraphicBox: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitalRing: {
    width: 60,
    height: 36,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ rotate: '-25deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitalPlanet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#C4B5FD',
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 12,
    marginTop: 18,
    alignSelf: 'flex-end',
    paddingHorizontal: 24,
  },
  resumeButtonText: {
    color: '#6D4FF0',
    fontWeight: '800',
    fontSize: 14,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  viewAllText: {
    color: '#8B80F5',
    fontWeight: '700',
    fontSize: 13,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickCard: {
    width: '23%',
    aspectRatio: 0.95,
  },
  quickCardGradient: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E2135',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  quickIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickCardLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  upcomingTestCard: {
    backgroundColor: '#111320',
    borderWidth: 1,
    borderColor: '#1F2236',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  testBadgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tomorrowBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tomorrowBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  testCardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  testDateTimeText: {
    color: '#8A8F9E',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  testFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  testMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testMetaText: {
    color: '#8A8F9E',
    fontSize: 12,
    fontWeight: '500',
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#262A40',
  },
  viewDetailsButton: {
    borderWidth: 1,
    borderColor: '#8B80F5',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewDetailsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  prepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  prepCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111320',
    borderWidth: 1,
    borderColor: '#1F2236',
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  prepIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepCardTextCol: {
    flex: 1,
  },
  prepLabel: {
    color: '#8A8F9E',
    fontSize: 11,
    fontWeight: '600',
  },
  prepNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  quoteText: {
    textAlign: 'center',
    color: '#555A70',
    fontSize: 12,
    marginTop: 8,
  },
});
