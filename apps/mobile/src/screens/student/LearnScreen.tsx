// apps/mobile/src/screens/student/LearnScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiClient } from '../../api/client';
import {
  Search,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  Atom,
  FlaskConical,
  Sprout,
  PawPrint,
  Calculator,
  Play,
  FileText,
  ClipboardList,
  FolderOpen,
  Download,
  CheckCircle2,
  Clock,
  ArrowRight,
  Bookmark,
} from 'lucide-react-native';

interface LearnScreenProps {
  onOpenVideo?: (videoId?: string) => void;
  onOpenNote?: (noteId?: string) => void;
  onOpenTest?: (testId?: string) => void;
}

export function LearnScreen({ onOpenVideo, onOpenNote, onOpenTest }: LearnScreenProps) {
  // Navigation stack within Learn tab
  const [viewState, setViewState] = useState<'batches' | 'batch_details' | 'subject_lessons' | 'lesson_details'>('batches');
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);

  // Data states
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<'active' | 'completed'>('active');
  const [batchSubTab, setBatchSubTab] = useState<'subjects' | 'tests' | 'updates'>('subjects');
  const [lessonContentTab, setLessonContentTab] = useState<'videos' | 'notes' | 'tests' | 'resources'>('videos');

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/v1/batches?status=ACTIVE');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
      setBatches(data);
    } catch (err) {
      console.warn('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  // Subject icon helper
  const renderSubjectIcon = (name: string, size = 20) => {
    const lower = name.toLowerCase();
    if (lower.includes('phys')) return <Atom size={size} color="#A78BFA" />;
    if (lower.includes('chem')) return <FlaskConical size={size} color="#60A5FA" />;
    if (lower.includes('botan') || lower.includes('bio')) return <Sprout size={size} color="#34D399" />;
    if (lower.includes('zool')) return <PawPrint size={size} color="#F87171" />;
    return <Calculator size={size} color="#FBBF24" />;
  };

  // ── 1. BATCHES OVERVIEW LIST ──
  if (viewState === 'batches') {
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
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.pageTitle}>My learning</Text>
          <Text style={styles.pageSubtitle}>Your batches. Your next chapter.</Text>

          {/* Search Box */}
          <View style={styles.searchBar}>
            <Search size={18} color="#8A8F9E" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your batches"
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Segmented Filter */}
          <View style={styles.filterPillTrack}>
            <TouchableOpacity
              style={[styles.filterPill, activeTabFilter === 'active' && styles.filterPillActive]}
              onPress={() => setActiveTabFilter('active')}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeTabFilter === 'active' && styles.filterPillTextActive]}>
                Active ({batches.length || 2})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeTabFilter === 'completed' && styles.filterPillActive]}
              onPress={() => setActiveTabFilter('completed')}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeTabFilter === 'completed' && styles.filterPillTextActive]}>
                Completed (1)
              </Text>
            </TouchableOpacity>
          </View>

          {/* My Batches Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>My batches</Text>
            <Text style={styles.batchCountText}>{batches.length || 2} active</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#8B80F5" style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Batch Card 1: CEE Preparation 2027 */}
              <View style={styles.batchCard}>
                <LinearGradient
                  colors={['#2D1F6E', '#4B35A6', '#6D4FF0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.batchBanner}
                >
                  <Text style={styles.batchCategory}>MEDICAL ENTRANCE</Text>
                  <Text style={styles.batchCardName}>CEE Preparation 2027</Text>
                  <Text style={styles.batchCardOrg}>U-ThinkCrazy • Regular batch</Text>
                </LinearGradient>

                <View style={styles.batchCardBody}>
                  <View style={styles.batchStatusRow}>
                    <View style={styles.activeDotRow}>
                      <View style={styles.greenDot} />
                      <Text style={styles.activeStatusText}>Active</Text>
                    </View>
                    <Text style={styles.subjectCountText}>4 subjects</Text>
                  </View>

                  {/* Subject Icons Row */}
                  <View style={styles.subjectTilesRow}>
                    <View style={styles.subjectTile}>
                      <Atom size={24} color="#A78BFA" />
                      <Text style={styles.subjectTileLabel}>Physics</Text>
                    </View>
                    <View style={styles.subjectTile}>
                      <FlaskConical size={24} color="#60A5FA" />
                      <Text style={styles.subjectTileLabel}>Chemistry</Text>
                    </View>
                    <View style={styles.subjectTile}>
                      <Sprout size={24} color="#34D399" />
                      <Text style={styles.subjectTileLabel}>Botany</Text>
                    </View>
                    <View style={styles.subjectTile}>
                      <PawPrint size={24} color="#F87171" />
                      <Text style={styles.subjectTileLabel}>Zoology</Text>
                    </View>
                  </View>

                  {/* Progress Line */}
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Learning progress</Text>
                    <Text style={styles.progressPercent}>36%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: '36%' }]} />
                  </View>
                  <Text style={styles.progressSub}>18 of 50 lessons completed</Text>

                  <TouchableOpacity
                    style={styles.continueBatchBtn}
                    onPress={() => {
                      setSelectedBatch(batches.find(b => b.name?.includes('CEE')) || { id: 'cee', name: 'CEE Preparation 2027' });
                      setViewState('batch_details');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.continueBatchBtnText}>Continue learning</Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Batch Card 2: IOE Foundation 2027 */}
              <View style={styles.batchCard}>
                <LinearGradient
                  colors={['#0F3854', '#155E75', '#0E7490']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.batchBanner}
                >
                  <Text style={styles.batchCategory}>ENGINEERING ENTRANCE</Text>
                  <Text style={styles.batchCardName}>IOE Foundation 2027</Text>
                  <Text style={styles.batchCardOrg}>U-ThinkCrazy • Weekend batch</Text>
                </LinearGradient>

                <View style={styles.batchCardBody}>
                  <View style={styles.batchStatusRow}>
                    <View style={styles.activeDotRow}>
                      <View style={styles.greenDot} />
                      <Text style={styles.activeStatusText}>Active</Text>
                    </View>
                    <Text style={styles.subjectCountText}>3 subjects</Text>
                  </View>

                  {/* Subject Icons Row */}
                  <View style={styles.subjectTilesRow}>
                    <View style={styles.subjectTile}>
                      <Atom size={24} color="#A78BFA" />
                      <Text style={styles.subjectTileLabel}>Physics</Text>
                    </View>
                    <View style={styles.subjectTile}>
                      <FlaskConical size={24} color="#60A5FA" />
                      <Text style={styles.subjectTileLabel}>Chemistry</Text>
                    </View>
                    <View style={styles.subjectTile}>
                      <Calculator size={24} color="#38BDF8" />
                      <Text style={styles.subjectTileLabel}>Maths</Text>
                    </View>
                  </View>

                  {/* Progress Line */}
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Learning progress</Text>
                    <Text style={styles.progressPercent}>10%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: '10%', backgroundColor: '#22D3EE' }]} />
                  </View>
                  <Text style={styles.progressSub}>4 of 40 lessons completed</Text>

                  <TouchableOpacity
                    style={styles.openBatchBtn}
                    onPress={() => {
                      setSelectedBatch(batches.find(b => b.name?.includes('IOE')) || { id: 'ioe', name: 'IOE Foundation 2027' });
                      setViewState('batch_details');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.openBatchBtnText}>Open batch</Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── 2. BATCH DETAILS (SUBJECTS, TESTS, UPDATES) ──
  if (viewState === 'batch_details') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#07080E" />

        {/* Back Header */}
        <View style={styles.screenHeader}>
          <TouchableOpacity onPress={() => setViewState('batches')} style={styles.backButton}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.screenHeaderTitle}>Batch details</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Banner */}
          <LinearGradient
            colors={['#2D1F6E', '#4B35A6', '#6D4FF0']}
            style={styles.detailHeroBanner}
          >
            <Text style={styles.batchCategory}>MEDICAL ENTRANCE</Text>
            <Text style={styles.detailHeroTitle}>{selectedBatch?.name || 'CEE Preparation 2027'}</Text>
            <Text style={styles.detailHeroSub}>U-ThinkCrazy • Regular batch</Text>

            <View style={styles.detailActiveBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.activeStatusText}>Active</Text>
            </View>

            <View style={styles.detailProgressRow}>
              <Text style={styles.detailProgressLabel}>Overall progress</Text>
              <Text style={styles.detailProgressPercent}>36%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '36%' }]} />
            </View>
            <Text style={styles.progressSubWhite}>18 of 50 lessons completed</Text>
          </LinearGradient>

          {/* Sub Tabs */}
          <View style={styles.subTabRow}>
            <TouchableOpacity
              style={[styles.subTabButton, batchSubTab === 'subjects' && styles.subTabActive]}
              onPress={() => setBatchSubTab('subjects')}
            >
              <Text style={[styles.subTabText, batchSubTab === 'subjects' && styles.subTabTextActive]}>Subjects</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTabButton, batchSubTab === 'tests' && styles.subTabActive]}
              onPress={() => setBatchSubTab('tests')}
            >
              <Text style={[styles.subTabText, batchSubTab === 'tests' && styles.subTabTextActive]}>Tests</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTabButton, batchSubTab === 'updates' && styles.subTabActive]}
              onPress={() => setBatchSubTab('updates')}
            >
              <Text style={[styles.subTabText, batchSubTab === 'updates' && styles.subTabTextActive]}>Updates</Text>
            </TouchableOpacity>
          </View>

          {/* Continue Learning Strip */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Continue learning</Text>
          </View>
          <View style={styles.continueLearningStrip}>
            <View style={styles.continueIconCircle}>
              <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
            </View>
            <View style={styles.continueTextCol}>
              <Text style={styles.continueStripTitle}>Electric Charges & Fields</Text>
              <Text style={styles.continueStripSub}>Physics • 18 min left</Text>
            </View>
            <TouchableOpacity
              style={styles.resumeStripBtn}
              onPress={() => onOpenVideo?.()}
              activeOpacity={0.8}
            >
              <Text style={styles.resumeStripBtnText}>Resume</Text>
            </TouchableOpacity>
          </View>

          {/* Your Subjects List */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Your subjects</Text>
            <Text style={styles.batchCountText}>4 subjects</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Choose a subject to explore its lessons.</Text>

          {[
            { id: 'phy', name: 'Physics', progress: '50%', completed: '6 of 12 lessons completed' },
            { id: 'chm', name: 'Chemistry', progress: '29%', completed: '4 of 14 lessons completed' },
            { id: 'bot', name: 'Botany', progress: '42%', completed: '5 of 12 lessons completed' },
            { id: 'zoo', name: 'Zoology', progress: '25%', completed: '3 of 12 lessons completed' },
          ].map((sub) => (
            <TouchableOpacity
              key={sub.id}
              style={styles.subjectRowCard}
              onPress={() => {
                setSelectedSubject(sub);
                setViewState('subject_lessons');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.subjectCardLeft}>
                <View style={styles.subjectRowIconBox}>
                  {renderSubjectIcon(sub.name, 28)}
                </View>
                <View style={styles.subjectRowTextCol}>
                  <Text style={styles.subjectRowName}>{sub.name}</Text>
                  <Text style={styles.subjectRowSub}>{sub.completed}</Text>
                  <View style={styles.smallProgressTrack}>
                    <View style={[styles.progressFill, { width: sub.progress as any }]} />
                  </View>
                </View>
              </View>

              <View style={styles.subjectCardRight}>
                <Text style={styles.subjectPercentText}>{sub.progress}</Text>
                <ChevronRight size={18} color="#8A8F9E" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── 3. SUBJECT LESSONS (e.g. Physics) ──
  if (viewState === 'subject_lessons') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#07080E" />

        <View style={styles.screenHeader}>
          <TouchableOpacity onPress={() => setViewState('batch_details')} style={styles.backButton}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.screenHeaderTitle}>{selectedSubject?.name || 'Physics'}</Text>
          <TouchableOpacity>
            <Bookmark size={20} color="#E2E8F0" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.breadcrumbText}>CEE Preparation 2027 &gt;</Text>

          {/* Subject Header Card */}
          <LinearGradient
            colors={['#2D1F6E', '#4B35A6', '#6D4FF0']}
            style={styles.subjectHeaderCard}
          >
            <View style={styles.subjectHeaderTop}>
              <Atom size={44} color="#FFFFFF" />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.subjectHeaderTitle}>{selectedSubject?.name || 'Physics'}</Text>
                <Text style={styles.subjectHeaderSub}>Build concepts. Practice confidently.</Text>
              </View>
            </View>

            <View style={styles.detailProgressRow}>
              <Text style={styles.progressSubWhite}>6 of 12 lessons completed</Text>
              <Text style={styles.detailProgressPercent}>50%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '50%' }]} />
            </View>
          </LinearGradient>

          {/* Search Box */}
          <View style={styles.searchBar}>
            <Search size={18} color="#8A8F9E" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search lessons"
              placeholderTextColor="#64748B"
            />
          </View>

          {/* Segmented Filter */}
          <View style={styles.lessonFilterTrack}>
            <View style={[styles.filterPill, styles.filterPillActive]}>
              <Text style={styles.filterPillTextActive}>All (12)</Text>
            </View>
            <View style={styles.filterPill}>
              <Text style={styles.filterPillText}>In progress (1)</Text>
            </View>
            <View style={styles.filterPill}>
              <Text style={styles.filterPillText}>Completed (6)</Text>
            </View>
          </View>

          {/* Active Lesson Hero */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Continue learning</Text>
          </View>

          <TouchableOpacity
            style={styles.continueLessonHero}
            onPress={() => {
              setSelectedLesson({ name: 'Electric Charges & Fields' });
              setViewState('lesson_details');
            }}
            activeOpacity={0.85}
          >
            <View style={styles.inProgressBadge}>
              <Text style={styles.inProgressBadgeText}>IN PROGRESS</Text>
            </View>
            <View style={styles.continueLessonRow}>
              <View style={styles.lessonAtomBox}>
                <Atom size={32} color="#A78BFA" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.continueLessonTitle}>Electric Charges & Fields</Text>
                <Text style={styles.continueLessonMeta}>▷ 4 videos  |  🗎 2 notes  |  ✔ 1 test</Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '40%' }]} />
            </View>

            <View style={styles.continueFooterRow}>
              <Text style={styles.videoTimeLeft}>Current video • 18 min left</Text>
              <TouchableOpacity
                style={styles.heroResumeBtn}
                onPress={() => onOpenVideo?.()}
              >
                <Text style={styles.heroResumeBtnText}>Resume</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* All Lessons List */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>All lessons</Text>
            <Text style={styles.syllabusOrderText}>↑↓ Syllabus order</Text>
          </View>

          {[
            { num: '01', title: 'Units & Measurements', meta: '▷ 3 videos • 🗎 1 note • ✔ 1 test' },
            { num: '02', title: 'Vectors & Motion', meta: '▷ 5 videos • 🗎 2 notes • ✔ 1 test' },
            { num: '03', title: 'Laws of Motion', meta: '▷ 4 videos • 🗎 2 notes • ✔ 1 test' },
            { num: '04', title: 'Work, Energy & Power', meta: '▷ 4 videos • 🗎 1 note • ✔ 1 test' },
          ].map((l) => (
            <TouchableOpacity
              key={l.num}
              style={styles.lessonItemCard}
              onPress={() => {
                setSelectedLesson(l);
                setViewState('lesson_details');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.lessonNumBox}>
                <Text style={styles.lessonNumText}>{l.num}</Text>
              </View>
              <View style={styles.lessonItemTextCol}>
                <Text style={styles.lessonItemTitle}>{l.title}</Text>
                <Text style={styles.lessonItemMeta}>{l.meta}</Text>
              </View>
              <View style={styles.completedBadgeRow}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={styles.completedBadgeText}>Completed</Text>
                <ChevronRight size={18} color="#8A8F9E" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── 4. LESSON DETAILS (VIDEOS, NOTES, TESTS, RESOURCES) ──
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07080E" />

      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => setViewState('subject_lessons')} style={styles.backButton}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.screenHeaderTitle}>Lesson details</Text>
        <TouchableOpacity>
          <Bookmark size={20} color="#E2E8F0" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.breadcrumbText}>CEE Preparation 2027 / Physics</Text>

        {/* Lesson Header */}
        <View style={styles.lessonDetailHeaderRow}>
          <View style={styles.lessonDetailIconBox}>
            <Atom size={40} color="#A78BFA" />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.lessonDetailTitle}>Electric Charges & Fields</Text>
            <Text style={styles.lessonDetailDesc}>Charge, force and electric field concepts.</Text>
            <View style={styles.inProgressPillSmall}>
              <Text style={styles.inProgressPillTextSmall}>IN PROGRESS</Text>
            </View>
          </View>
        </View>

        {/* Content Tabs */}
        <View style={styles.lessonTabsTrack}>
          <TouchableOpacity
            style={[styles.lessonTabPill, lessonContentTab === 'videos' && styles.lessonTabPillActive]}
            onPress={() => setLessonContentTab('videos')}
          >
            <Text style={[styles.lessonTabPillText, lessonContentTab === 'videos' && styles.lessonTabPillTextActive]}>
              Videos (4)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.lessonTabPill, lessonContentTab === 'notes' && styles.lessonTabPillActive]}
            onPress={() => setLessonContentTab('notes')}
          >
            <Text style={[styles.lessonTabPillText, lessonContentTab === 'notes' && styles.lessonTabPillTextActive]}>
              Notes (2)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.lessonTabPill, lessonContentTab === 'tests' && styles.lessonTabPillActive]}
            onPress={() => setLessonContentTab('tests')}
          >
            <Text style={[styles.lessonTabPillText, lessonContentTab === 'tests' && styles.lessonTabPillTextActive]}>
              Tests (1)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.lessonTabPill, lessonContentTab === 'resources' && styles.lessonTabPillActive]}
            onPress={() => setLessonContentTab('resources')}
          >
            <Text style={[styles.lessonTabPillText, lessonContentTab === 'resources' && styles.lessonTabPillTextActive]}>
              Resources
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Videos */}
        {lessonContentTab === 'videos' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.heroTagDark}>CONTINUE WATCHING</Text>
            </View>

            {/* Video Hero Preview */}
            <View style={styles.videoHeroCard}>
              <LinearGradient
                colors={['#1F164D', '#342082']}
                style={styles.videoThumbnailBox}
              >
                <TouchableOpacity
                  style={styles.bigPlayButton}
                  onPress={() => onOpenVideo?.()}
                  activeOpacity={0.85}
                >
                  <Play size={26} color="#6D4FF0" fill="#6D4FF0" />
                </TouchableOpacity>
                <View style={styles.durationBadge}>
                  <Text style={styles.durationBadgeText}>30:00</Text>
                </View>
              </LinearGradient>

              <View style={styles.videoHeroInfo}>
                <Text style={styles.videoHeroTitle}>Coulomb’s Law</Text>
                <Text style={styles.videoHeroSub}>Video 2 of 4</Text>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: '40%' }]} />
                </View>

                <View style={styles.videoHeroTimeRow}>
                  <Text style={styles.videoHeroTime}>12:00 / 30:00</Text>
                  <Text style={styles.videoHeroTime}>18 min left</Text>
                </View>

                <TouchableOpacity
                  style={styles.fullResumeVideoBtn}
                  onPress={() => onOpenVideo?.()}
                  activeOpacity={0.9}
                >
                  <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.fullResumeVideoBtnText}>Resume video</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Lesson Videos List */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Lesson videos</Text>
              <Text style={styles.batchCountText}>1 of 4 completed</Text>
            </View>

            {[
              { id: 'v1', title: 'Electric Charge Basics', duration: '24 min', status: 'completed' },
              { id: 'v2', title: "Coulomb's Law", duration: '30 min', left: '18 min left', status: 'in_progress' },
              { id: 'v3', title: 'Electric Field & Field Lines', duration: '28 min', status: 'not_started' },
              { id: 'v4', title: 'Electric Dipole', duration: '26 min', status: 'not_started' },
            ].map((v) => (
              <TouchableOpacity
                key={v.id}
                style={styles.videoRowItem}
                onPress={() => onOpenVideo?.(v.id)}
                activeOpacity={0.85}
              >
                <View style={styles.videoRowThumb}>
                  <Play size={16} color="#A78BFA" fill="#A78BFA" />
                </View>
                <View style={styles.videoRowInfo}>
                  <Text style={styles.videoRowTitle}>{v.title}</Text>
                  <View style={styles.videoRowMeta}>
                    <Text style={styles.videoMetaText}>▷ {v.duration}</Text>
                    {v.status === 'completed' && (
                      <View style={styles.statusCompletedBadge}>
                        <CheckCircle2 size={12} color="#10B981" />
                        <Text style={styles.statusCompletedText}>Completed</Text>
                      </View>
                    )}
                    {v.status === 'in_progress' && (
                      <View style={styles.statusProgressBadge}>
                        <Text style={styles.statusProgressText}>In progress</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={styles.downloadIconBtn}>
                  <Download size={18} color="#8A8F9E" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Tab 2: Notes */}
        {lessonContentTab === 'notes' && (
          <View style={{ marginTop: 12 }}>
            <TouchableOpacity
              style={styles.noteItemCard}
              onPress={() => onOpenNote?.()}
              activeOpacity={0.85}
            >
              <View style={styles.pdfIconBadge}>
                <Text style={styles.pdfIconText}>PDF</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.noteItemTitle}>Coulomb’s Law — Notes</Text>
                <Text style={styles.noteItemMeta}>PDF • 8 pages • 350 KB</Text>
              </View>
              <TouchableOpacity style={styles.openNoteBtn} onPress={() => onOpenNote?.()}>
                <Text style={styles.openNoteBtnText}>Open</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab 3: Tests */}
        {lessonContentTab === 'tests' && (
          <View style={{ marginTop: 12 }}>
            <TouchableOpacity
              style={styles.practiceTestCard}
              onPress={() => onOpenTest?.()}
              activeOpacity={0.85}
            >
              <View style={styles.practiceTestIcon}>
                <Atom size={28} color="#A78BFA" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.practiceTestTitle}>Electric Charges & Fields — Practice Test</Text>
                <Text style={styles.practiceTestMeta}>20 questions • 30 min • +1 / -0.25</Text>
                <View style={styles.testAttemptNotice}>
                  <CheckCircle2 size={14} color="#10B981" />
                  <Text style={styles.testAttemptNoticeText}>Attempt 1 completed • Score 11/20</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab 4: Resources */}
        {lessonContentTab === 'resources' && (
          <View style={{ marginTop: 20, alignItems: 'center', padding: 20 }}>
            <FolderOpen size={36} color="#6D4FF0" />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16, marginTop: 12 }}>
              Lesson Resource Files
            </Text>
            <Text style={{ color: '#8A8F9E', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
              Formula sheets, practice problems, and downloadable handouts.
            </Text>
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
  topHeader: {
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
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#171926',
  },
  backButton: {
    padding: 4,
  },
  screenHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  pageSubtitle: {
    color: '#8A8F9E',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121422',
    borderWidth: 1,
    borderColor: '#1F2236',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    padding: 0,
  },
  filterPillTrack: {
    flexDirection: 'row',
    backgroundColor: '#111320',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterPillActive: {
    backgroundColor: '#7C65F6',
  },
  filterPillText: {
    color: '#8A8F9E',
    fontWeight: '600',
    fontSize: 13,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  sectionHeading: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  batchCountText: {
    color: '#8B80F5',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#8A8F9E',
    fontSize: 13,
    marginBottom: 16,
  },
  batchCard: {
    backgroundColor: '#111320',
    borderWidth: 1,
    borderColor: '#1F2236',
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 20,
  },
  batchBanner: {
    padding: 20,
  },
  batchCategory: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  batchCardName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  batchCardOrg: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginTop: 4,
  },
  batchCardBody: {
    padding: 18,
  },
  batchStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  activeDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeStatusText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 13,
  },
  subjectCountText: {
    color: '#8A8F9E',
    fontSize: 13,
    fontWeight: '500',
  },
  subjectTilesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  subjectTile: {
    width: '23%',
    backgroundColor: '#161828',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#24273E',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  subjectTileLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: '#8A8F9E',
    fontSize: 13,
    fontWeight: '500',
  },
  progressPercent: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7C65F6',
    borderRadius: 3,
  },
  progressSub: {
    color: '#8A8F9E',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 16,
  },
  progressSubWhite: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 6,
  },
  continueBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C65F6',
    borderRadius: 14,
    paddingVertical: 14,
  },
  continueBatchBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  openBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#7C65F6',
    borderRadius: 14,
    paddingVertical: 14,
  },
  openBatchBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  detailHeroBanner: {
    borderRadius: 22,
    padding: 20,
    marginTop: 12,
    marginBottom: 18,
  },
  detailHeroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  detailHeroSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  detailActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  detailProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailProgressLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
  },
  detailProgressPercent: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  subTabRow: {
    flexDirection: 'row',
    backgroundColor: '#111320',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  subTabActive: {
    backgroundColor: '#7C65F6',
  },
  subTabText: {
    color: '#8A8F9E',
    fontWeight: '600',
    fontSize: 13,
  },
  subTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  continueLearningStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111320',
    borderWidth: 1,
    borderColor: '#1F2236',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  continueIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#7C65F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  continueStripTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  continueStripSub: {
    color: '#8A8F9E',
    fontSize: 12,
    marginTop: 2,
  },
  resumeStripBtn: {
    borderWidth: 1,
    borderColor: '#7C65F6',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  resumeStripBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  subjectRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111320',
    borderWidth: 1,
    borderColor: '#1F2236',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  subjectCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subjectRowIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#161828',
    borderWidth: 1,
    borderColor: '#24273E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectRowTextCol: {
    flex: 1,
    marginLeft: 14,
  },
  subjectRowName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  subjectRowSub: {
    color: '#8A8F9E',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  smallProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: '90%',
    overflow: 'hidden',
  },
  subjectCardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  subjectPercentText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  breadcrumbText: {
    color: '#8A8F9E',
    fontSize: 13,
    marginTop: 10,
    marginBottom: 10,
  },
  subjectHeaderCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  subjectHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subjectHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  subjectHeaderSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginTop: 2,
  },
  lessonFilterTrack: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  continueLessonHero: {
    backgroundColor: '#111320',
    borderWidth: 1,
    borderColor: '#7C65F6',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  inProgressBadge: {
    backgroundColor: 'rgba(124, 101, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  inProgressBadgeText: {
    color: '#8B80F5',
    fontSize: 11,
    fontWeight: '800',
  },
  continueLessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  lessonAtomBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1C163D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueLessonTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  continueLessonMeta: {
    color: '#8A8F9E',
    fontSize: 12,
    marginTop: 4,
  },
  continueFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  videoTimeLeft: {
    color: '#8A8F9E',
    fontSize: 12,
  },
  heroResumeBtn: {
    backgroundColor: '#7C65F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  heroResumeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  syllabusOrderText: {
    color: '#8B80F5',
    fontSize: 12,
    fontWeight: '600',
  },
  lessonItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111320',
    borderWidth: 1,
    borderColor: '#1F2236',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  lessonNumBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1C163D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonNumText: {
    color: '#8B80F5',
    fontWeight: '800',
    fontSize: 14,
  },
  lessonItemTextCol: {
    flex: 1,
    marginLeft: 14,
  },
  lessonItemTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  lessonItemMeta: {
    color: '#8A8F9E',
    fontSize: 12,
    marginTop: 2,
  },
  completedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  lessonDetailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  lessonDetailIconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#1C163D',
    borderWidth: 1,
    borderColor: '#302466',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonDetailTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  lessonDetailDesc: {
    color: '#8A8F9E',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  inProgressPillSmall: {
    backgroundColor: 'rgba(124, 101, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  inProgressPillTextSmall: {
    color: '#8B80F5',
    fontSize: 10,
    fontWeight: '800',
  },
  lessonTabsTrack: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  lessonTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111320',
    borderWidth: 1,
    borderColor: '#1F2236',
  },
  lessonTabPillActive: {
    backgroundColor: '#7C65F6',
    borderColor: '#7C65F6',
  },
  lessonTabPillText: {
    color: '#8A8F9E',
    fontSize: 12,
    fontWeight: '600',
  },
  lessonTabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroTagDark: {
    color: '#8A8F9E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  videoHeroCard: {
    backgroundColor: '#111320',
    borderWidth: 1,
    borderColor: '#1F2236',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  videoThumbnailBox: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPlayButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  videoHeroInfo: {
    padding: 16,
  },
  videoHeroTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  videoHeroSub: {
    color: '#8A8F9E',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  videoHeroTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 14,
  },
  videoHeroTime: {
    color: '#8A8F9E',
    fontSize: 12,
  },
  fullResumeVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C65F6',
    borderRadius: 14,
    paddingVertical: 12,
  },
  fullResumeVideoBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  videoRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111320',
    borderWidth: 1,
    borderColor: '#1F2236',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  videoRowThumb: {
    width: 60,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1E163F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  videoRowTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  videoRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  videoMetaText: {
    color: '#8A8F9E',
    fontSize: 11,
  },
  statusCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusCompletedText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  statusProgressBadge: {
    backgroundColor: 'rgba(124, 101, 246, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusProgressText: {
    color: '#8B80F5',
    fontSize: 10,
    fontWeight: '700',
  },
  downloadIconBtn: {
    padding: 8,
  },
  noteItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111320',
    borderWidth: 1,
    borderColor: '#1F2236',
    borderRadius: 16,
    padding: 16,
  },
  pdfIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#7C65F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfIconText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  noteItemTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  noteItemMeta: {
    color: '#8A8F9E',
    fontSize: 12,
    marginTop: 4,
  },
  openNoteBtn: {
    borderWidth: 1,
    borderColor: '#7C65F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  openNoteBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  practiceTestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111320',
    borderWidth: 1,
    borderColor: '#1F2236',
    borderRadius: 16,
    padding: 16,
  },
  practiceTestIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#1C163D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceTestTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  practiceTestMeta: {
    color: '#8A8F9E',
    fontSize: 12,
    marginTop: 4,
  },
  testAttemptNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  testAttemptNoticeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
});
