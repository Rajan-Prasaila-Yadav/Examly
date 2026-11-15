// apps/mobile/src/screens/student/VideoPlayerScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize2,
  CheckCircle2,
  Clock,
  BookOpen,
  MessageSquare,
  Bookmark,
  Share2,
  ChevronRight,
  Plus,
  Send,
  Volume2,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface VideoPlayerScreenProps {
  videoId?: string;
  onBack: () => void;
  onNavigateVideo?: (videoId: string) => void;
}

export function VideoPlayerScreen({ videoId, onBack, onNavigateVideo }: VideoPlayerScreenProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'discussion' | 'notes'>('overview');
  const [playbackSpeed, setPlaybackSpeed] = useState<'1x' | '1.25x' | '1.5x' | '2x'>('1x');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [userComment, setUserComment] = useState('');

  // Sample real comments for the discussion tab
  const [discussions, setDiscussions] = useState([
    {
      id: 'd1',
      author: 'Aarav Sharma',
      timeAgo: '2 hours ago',
      text: 'In Coulomb\'s law, why does the dielectric constant k decrease the electrostatic force between two charges placed inside water?',
      likes: 8,
      replies: 2,
    },
    {
      id: 'd2',
      author: 'Dr. Anuj Sharma (Faculty)',
      timeAgo: '1 hour ago',
      text: 'Water molecules have a high relative permittivity (ε_r ≈ 80), which causes polarization and shields the electric field lines, reducing the net force to F/80.',
      likes: 19,
      replies: 0,
      isFaculty: true,
    },
  ]);

  const [studentNotes, setStudentNotes] = useState([
    { id: 'n1', timestamp: '04:15', note: 'Dielectric constant of vacuum is exactly 1, air is approximately 1.00059.' },
    { id: 'n2', timestamp: '12:30', note: 'Vector form: F₁₂ = -F₂₁ follows Newton’s third law of motion.' },
    { id: 'n3', timestamp: '21:05', note: 'Remember sign convention: positive product means repulsive, negative product means attractive.' },
  ]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* ── 1. VIDEO VIEWPORT ── */}
      <View style={styles.videoPlayerContainer}>
        {/* Video Canvas Backdrop */}
        <LinearGradient
          colors={['#1E1B4B', '#0F172A', '#020617']}
          style={styles.videoBackdrop}
        >
          {/* Subtle Grid / Orbital Accent */}
          <View style={styles.videoOverlayGraphics}>
            <View style={styles.videoPulseCircle} />
          </View>

          {/* Top Video Overlay Bar */}
          <View style={styles.videoTopBar}>
            <TouchableOpacity onPress={onBack} style={styles.videoTopButton} activeOpacity={0.8}>
              <ArrowLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.videoQualityBadge}>
              <Text style={styles.videoQualityText}>1080p FHD</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsBookmarked(!isBookmarked)}
              style={styles.videoTopButton}
              activeOpacity={0.8}
            >
              <Bookmark size={18} color={isBookmarked ? '#F59E0B' : '#FFFFFF'} fill={isBookmarked ? '#F59E0B' : 'none'} />
            </TouchableOpacity>
          </View>

          {/* Center Playback Controls */}
          <View style={styles.centerControlsRow}>
            <TouchableOpacity
              style={styles.controlIconCircle}
              onPress={() => Alert.alert('Playback', 'Seek -10s')}
              activeOpacity={0.7}
            >
              <RotateCcw size={22} color="#FFFFFF" />
              <Text style={styles.seekSecondsText}>10</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryPlayButton}
              onPress={() => setIsPlaying(!isPlaying)}
              activeOpacity={0.85}
            >
              {isPlaying ? (
                <Pause size={30} color="#FFFFFF" />
              ) : (
                <Play size={30} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlIconCircle}
              onPress={() => Alert.alert('Playback', 'Seek +10s')}
              activeOpacity={0.7}
            >
              <RotateCw size={22} color="#FFFFFF" />
              <Text style={styles.seekSecondsText}>10</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Scrubber & Time */}
          <View style={styles.videoBottomControls}>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: '40%' }]} />
              <View style={[styles.progressThumb, { left: '40%' }]} />
            </View>

            <View style={styles.videoBottomRow}>
              <Text style={styles.videoTimeText}>12:00 / 30:00</Text>

              <View style={styles.playbackSettingsRow}>
                <TouchableOpacity
                  style={styles.speedPill}
                  onPress={() => {
                    const speeds: Array<'1x' | '1.25x' | '1.5x' | '2x'> = ['1x', '1.25x', '1.5x', '2x'];
                    const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
                    setPlaybackSpeed(next);
                  }}
                >
                  <Text style={styles.speedPillText}>{playbackSpeed}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.fullscreenButton}
                  onPress={() => Alert.alert('Orientation', 'Rotating to Fullscreen Landscape...')}
                >
                  <Maximize2 size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ── 2. VIDEO METADATA STRIP ── */}
      <View style={styles.metaStrip}>
        <View style={styles.metaRow}>
          <View style={styles.lessonTagPill}>
            <Text style={styles.lessonTagText}>Physics • Chapter 05</Text>
          </View>
          <View style={styles.hdPill}>
            <Text style={styles.hdPillText}>High Speed CDN</Text>
          </View>
        </View>
        <Text style={styles.videoTitle}>02 Coulomb's Law & Electrostatic Forces</Text>
        <Text style={styles.instructorText}>Taught by Dr. Anuj Sharma • Apex Senior Faculty</Text>
      </View>

      {/* ── 3. SUB-TABS (OVERVIEW / DISCUSSION / MY NOTES) ── */}
      <View style={styles.tabsHeaderContainer}>
        {(['overview', 'discussion', 'notes'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const labels = {
            overview: 'Overview',
            discussion: `Discussion (${discussions.length})`,
            notes: `My Notes (${studentNotes.length})`,
          };
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.subTabButton, isActive && styles.subTabButtonActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                {labels[tab]}
              </Text>
              {isActive && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── 4. TAB CONTENT ── */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <View>
            {/* Description Card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardHeading}>About this Lecture</Text>
              <Text style={styles.infoCardBody}>
                Comprehensive derivation of Coulomb's inverse square law, comparison between gravitational and electrostatic forces, vector notation, and the role of dielectric constant (permittivity of medium).
              </Text>

              <View style={styles.keyPointsList}>
                <View style={styles.keyPointRow}>
                  <CheckCircle2 size={15} color="#10B981" />
                  <Text style={styles.keyPointText}>Permittivity of Free Space (ε₀ = 8.854 × 10⁻¹² C²/N·m²)</Text>
                </View>
                <View style={styles.keyPointRow}>
                  <CheckCircle2 size={15} color="#10B981" />
                  <Text style={styles.keyPointText}>Superposition principle for multiple discrete point charges</Text>
                </View>
                <View style={styles.keyPointRow}>
                  <CheckCircle2 size={15} color="#10B981" />
                  <Text style={styles.keyPointText}>Vector form: F₂₁ = (1 / 4πε₀) · (q₁q₂ / r²) · r̂₁₂</Text>
                </View>
              </View>
            </View>

            {/* Next Video Card */}
            <Text style={styles.sectionHeading}>Up Next in this Chapter</Text>
            <TouchableOpacity
              style={styles.nextVideoCard}
              activeOpacity={0.85}
              onPress={() => onNavigateVideo?.('vid-3')}
            >
              <View style={styles.nextVideoThumb}>
                <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
              </View>
              <View style={styles.nextVideoInfo}>
                <Text style={styles.nextVideoSub}>Video 03 of 04</Text>
                <Text style={styles.nextVideoTitle}>Electric Field & Field Lines</Text>
                <View style={styles.nextVideoDuration}>
                  <Clock size={12} color="#94A3B8" />
                  <Text style={styles.nextVideoDurationText}>24 mins • Comprehensive</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        )}

        {/* DISCUSSION TAB */}
        {activeTab === 'discussion' && (
          <View>
            {/* Ask Doubt Input Bar */}
            <View style={styles.doubtInputRow}>
              <View style={styles.doubtInputBox}>
                <MessageSquare size={16} color="#64748B" />
                <Text style={styles.doubtPlaceholder}>Have a doubt? Ask your teacher & batchmates...</Text>
              </View>
              <TouchableOpacity
                style={styles.askButton}
                onPress={() => Alert.alert('Post Doubt', 'Opening doubt composer...')}
              >
                <Send size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Discussions List */}
            {discussions.map((d) => (
              <View key={d.id} style={styles.discussionCard}>
                <View style={styles.discussionHeader}>
                  <View style={styles.authorBadge}>
                    <Text style={styles.authorBadgeText}>{d.author[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.authorName}>{d.author}</Text>
                      {d.isFaculty && (
                        <View style={styles.facultyBadge}>
                          <Text style={styles.facultyBadgeText}>FACULTY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.timeAgoText}>{d.timeAgo}</Text>
                  </View>
                </View>
                <Text style={styles.discussionText}>{d.text}</Text>
                <View style={styles.discussionFooter}>
                  <TouchableOpacity style={styles.likePill}>
                    <Text style={styles.likeText}>👍 {d.likes} helpful</Text>
                  </TouchableOpacity>
                  {d.replies > 0 && (
                    <Text style={styles.replyCountText}>{d.replies} replies</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* MY NOTES TAB */}
        {activeTab === 'notes' && (
          <View>
            <TouchableOpacity
              style={styles.addNoteBanner}
              activeOpacity={0.8}
              onPress={() => Alert.alert('Add Note', 'Timestamped note captured at 12:00!')}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.addNoteBannerText}>Capture Note at 12:00 (Current Timestamp)</Text>
            </TouchableOpacity>

            {studentNotes.map((n) => (
              <View key={n.id} style={styles.noteItemCard}>
                <View style={styles.timestampPill}>
                  <Clock size={12} color="#7C65F6" />
                  <Text style={styles.timestampPillText}>{n.timestamp}</Text>
                </View>
                <Text style={styles.noteBodyText}>{n.note}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07080E',
  },
  videoPlayerContainer: {
    width: '100%',
    height: 240,
    backgroundColor: '#000000',
  },
  videoBackdrop: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 14,
  },
  videoOverlayGraphics: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.15,
  },
  videoPulseCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#7C65F6',
  },
  videoTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  videoTopButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoQualityBadge: {
    backgroundColor: 'rgba(124, 101, 246, 0.3)',
    borderColor: 'rgba(124, 101, 246, 0.5)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  videoQualityText: {
    color: '#DDD6FE',
    fontSize: 11,
    fontWeight: '800',
  },
  centerControlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 36,
  },
  controlIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seekSecondsText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    marginTop: -2,
  },
  primaryPlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7C65F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C65F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  videoBottomControls: {
    gap: 8,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7C65F6',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  videoBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoTimeText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  playbackSettingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  speedPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  speedPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  fullscreenButton: {
    padding: 4,
  },
  metaStrip: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0B0D17',
    borderBottomWidth: 1,
    borderBottomColor: '#171A29',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  lessonTagPill: {
    backgroundColor: 'rgba(124, 101, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lessonTagText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '700',
  },
  hdPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hdPillText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  instructorText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabsHeaderContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#171A29',
    backgroundColor: '#0B0D17',
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  subTabButtonActive: {},
  subTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#FFFFFF',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#7C65F6',
    borderRadius: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#0E111E',
    borderColor: '#1D2237',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  infoCardHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoCardBody: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 14,
  },
  keyPointsList: {
    gap: 8,
  },
  keyPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  keyPointText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
    flex: 1,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  nextVideoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E111E',
    borderColor: '#1D2237',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  nextVideoThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#7C65F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextVideoInfo: {
    flex: 1,
  },
  nextVideoSub: {
    fontSize: 10,
    color: '#7C65F6',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  nextVideoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
    marginBottom: 4,
  },
  nextVideoDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextVideoDurationText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  doubtInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  doubtInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0E111E',
    borderColor: '#1D2237',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  doubtPlaceholder: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  askButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#7C65F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discussionCard: {
    backgroundColor: '#0E111E',
    borderColor: '#1D2237',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  discussionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  authorBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5B4FCF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  facultyBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  facultyBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
  },
  timeAgoText: {
    fontSize: 10,
    color: '#64748B',
  },
  discussionText: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 19,
    marginBottom: 10,
  },
  discussionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  likePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  likeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },
  replyCountText: {
    fontSize: 11,
    color: '#7C65F6',
    fontWeight: '700',
  },
  addNoteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C65F6',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  addNoteBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  noteItemCard: {
    backgroundColor: '#0E111E',
    borderColor: '#1D2237',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  timestampPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124, 101, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  timestampPillText: {
    color: '#7C65F6',
    fontSize: 11,
    fontWeight: '800',
  },
  noteBodyText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 19,
  },
});
