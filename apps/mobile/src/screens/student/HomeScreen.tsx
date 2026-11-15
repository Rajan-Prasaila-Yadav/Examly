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
  Platform,
} from 'react-native';
import { apiClient } from '../../api/client';
import { useAuth } from '../../auth/auth-context';
import {
  Layers,
  FileCheck2,
  PlayCircle,
  BookOpen,
  Calendar,
  Clock,
  ChevronRight,
  Sparkles,
  Bookmark,
  Bell,
  LogOut,
} from 'lucide-react-native';

export function HomeScreen({
  onOpenTest,
  onOpenVideo,
  onOpenNote,
  onOpenBatch,
}: {
  onOpenTest?: (id: string) => void;
  onOpenVideo?: (id: string) => void;
  onOpenNote?: (id: string) => void;
  onOpenBatch?: (id: string) => void;
}) {
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B80F5" />
        <Text style={styles.loadingText}>Loading your learning dashboard…</Text>
      </View>
    );
  }

  const student = feed?.student || user;
  const batch = feed?.enrolledBatch || feed?.batch || student?.batch || student?.studentProfile?.batch;
  const liveTest = feed?.liveTests?.[0];
  const continueVideo = feed?.continueWatching;
  const recentNotes = feed?.recentNotes || [];
  const todayClasses = feed?.todayClasses || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060709" />

      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{student?.fullName?.[0] || 'S'}</Text>
          </View>
          <View>
            <Text style={styles.greetingText}>Welcome back,</Text>
            <Text style={styles.userNameText}>{student?.fullName || 'Student'}</Text>
          </View>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => {}}>
            <Bell size={20} color="#E2E8F0" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={logout}>
            <LogOut size={20} color="#F87171" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchFeed(true)}
            tintColor="#8B80F5"
          />
        }
      >
        {/* Error message */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* 1. Live Test Alert Banner (if active) */}
        {liveTest && (
          <TouchableOpacity
            style={styles.liveBanner}
            onPress={() => onOpenTest?.(liveTest.id)}
            activeOpacity={0.9}
          >
            <View style={styles.liveBadgeRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE TEST ACTIVE</Text>
              <Text style={styles.liveDurationText}>{liveTest.durationMinutes} mins</Text>
            </View>
            <Text style={styles.liveTestTitle}>{liveTest.title}</Text>
            <View style={styles.liveFooter}>
              <Text style={styles.liveBatchText}>{liveTest.batch?.name || 'Batch Exam'}</Text>
              <View style={styles.joinButton}>
                <Text style={styles.joinButtonText}>Take Exam</Text>
                <ChevronRight size={14} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* 2. Enrolled Batch Card */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Batch</Text>
          <TouchableOpacity onPress={() => onOpenBatch?.(batch?.id)}>
            <Text style={styles.sectionAction}>View all</Text>
          </TouchableOpacity>
        </View>

        {batch ? (
          <TouchableOpacity
            style={styles.batchCard}
            onPress={() => onOpenBatch?.(batch.id)}
            activeOpacity={0.85}
          >
            <View style={styles.batchHeader}>
              <View style={styles.batchBadge}>
                <Layers size={14} color="#8B80F5" />
                <Text style={styles.batchBadgeText}>{batch.code}</Text>
              </View>
              <Text style={styles.batchStatus}>Active</Text>
            </View>
            <Text style={styles.batchName}>{batch.name}</Text>
            <Text style={styles.batchSubjectsCount}>
              {batch.subjects?.length || 0} enrolled subjects • Complete curriculum
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Not enrolled in an active batch.</Text>
          </View>
        )}

        {/* 3. Continue Learning Video */}
        {continueVideo && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Continue Learning</Text>
            </View>
            <TouchableOpacity
              style={styles.videoCard}
              onPress={() => onOpenVideo?.(continueVideo.videoId)}
              activeOpacity={0.85}
            >
              <View style={styles.videoPlayCircle}>
                <PlayCircle size={28} color="#8B80F5" />
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoSubject}>
                  {continueVideo.video?.lesson?.subject?.name || 'Subject'}
                </Text>
                <Text style={styles.videoTitle} numberOfLines={1}>
                  {continueVideo.video?.title || 'Lecture'}
                </Text>
                {/* Progress bar */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          100,
                          ((continueVideo.progressSeconds || 0) /
                            (continueVideo.durationSeconds || 1)) *
                            100
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* 4. Today's Timetable / Classes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Classes</Text>
        </View>

        {todayClasses.length > 0 ? (
          todayClasses.map((item: any) => (
            <View key={item.id} style={styles.classCard}>
              <View style={styles.classTimeBox}>
                <Clock size={14} color="#8B80F5" />
                <Text style={styles.classTimeText}>{item.startTime}</Text>
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.classSubject}>{item.subject?.name || 'Lecture'}</Text>
                <Text style={styles.classTeacher}>By {item.teacher?.fullName || 'Faculty'}</Text>
              </View>
              <View style={styles.classStatusPill}>
                <Text style={styles.classStatusText}>{item.status}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Calendar size={18} color="#64748B" style={{ marginBottom: 4 }} />
            <Text style={styles.emptyText}>No live classes scheduled for today.</Text>
          </View>
        )}

        {/* 5. Recent Notes & Handouts */}
        {recentNotes.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Notes</Text>
            </View>
            {recentNotes.map((note: any) => (
              <TouchableOpacity
                key={note.id}
                style={styles.noteCard}
                onPress={() => onOpenNote?.(note.id)}
                activeOpacity={0.8}
              >
                <View style={styles.noteIconBox}>
                  <BookOpen size={18} color="#8B80F5" />
                </View>
                <View style={styles.noteInfo}>
                  <Text style={styles.noteTitle} numberOfLines={1}>
                    {note.title}
                  </Text>
                  <Text style={styles.noteMeta}>
                    {note.lesson?.subject?.name || 'Handout'} • PDF Document
                  </Text>
                </View>
                <ChevronRight size={16} color="#64748B" />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060709',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#060709',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#161926',
    backgroundColor: '#090B10',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#5B4FCF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  greetingText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  topActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#161926',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    textAlign: 'center',
  },
  liveBanner: {
    backgroundColor: '#31102A',
    borderColor: '#E11D48',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F43F5E',
  },
  liveBadgeText: {
    color: '#FDA4AF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  liveDurationText: {
    marginLeft: 'auto',
    color: '#FDA4AF',
    fontSize: 11,
    fontWeight: '600',
  },
  liveTestTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  liveFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBatchText: {
    color: '#FDA4AF',
    fontSize: 12,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E11D48',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionAction: {
    fontSize: 12,
    color: '#8B80F5',
    fontWeight: '600',
  },
  batchCard: {
    backgroundColor: '#0E111A',
    borderColor: '#1E2333',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  batchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(91, 79, 207, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  batchBadgeText: {
    color: '#8B80F5',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  batchStatus: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  batchName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  batchSubjectsCount: {
    color: '#94A3B8',
    fontSize: 12,
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E111A',
    borderColor: '#1E2333',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    gap: 12,
  },
  videoPlayCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(91, 79, 207, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoSubject: {
    color: '#8B80F5',
    fontSize: 11,
    fontWeight: '700',
  },
  videoTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginVertical: 2,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1E2333',
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B80F5',
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E111A',
    borderColor: '#1E2333',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  classTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#161926',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  classTimeText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  classInfo: {
    flex: 1,
  },
  classSubject: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  classTeacher: {
    color: '#94A3B8',
    fontSize: 11,
  },
  classStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  classStatusText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E111A',
    borderColor: '#1E2333',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  noteIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#161926',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteInfo: {
    flex: 1,
  },
  noteTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  noteMeta: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#0E111A',
    borderColor: '#1E2333',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 12,
  },
});
