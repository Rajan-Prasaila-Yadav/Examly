// apps/mobile/src/screens/student/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../auth/auth-context';
import {
  User,
  Mail,
  Shield,
  LogOut,
  Award,
  BookOpen,
  Bookmark,
  Download,
  Bell,
  Moon,
  ChevronRight,
  GraduationCap,
  FileText,
  KeyRound,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface ProfileScreenProps {
  onOpenTest?: (id?: string) => void;
  onOpenNote?: (id?: string) => void;
}

export function ProfileScreen({ onOpenTest, onOpenNote }: ProfileScreenProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'settings'>('overview');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [classReminders, setClassReminders] = useState(true);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your Examly student account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06070B" />

      {/* ── 1. PROFILE TOP HEADER ── */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['#7C65F6', '#4338CA']}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarInitial}>
              {user?.fullName ? user.fullName[0].toUpperCase() : 'R'}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.profileMeta}>
          <Text style={styles.profileName}>{user?.fullName || 'Rajan Student'}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'developerajan@gmail.com'}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.batchPill}>
              <GraduationCap size={11} color="#A78BFA" />
              <Text style={styles.batchPillText}>CEE Prep 2027</Text>
            </View>
            <View style={styles.rollPill}>
              <Text style={styles.rollPillText}>Roll: CEE-2027-042</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── 2. SUB-TABS (OVERVIEW / ACADEMIC / SETTINGS) ── */}
      <View style={styles.tabBarStrip}>
        {(['overview', 'academic', 'settings'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const labels = {
            overview: 'Overview',
            academic: 'Academic',
            settings: 'Settings',
          };
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.subTabBtn, isActive && styles.subTabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                {labels[tab]}
              </Text>
              {isActive && <View style={styles.activeTabLine} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── 3. TAB CONTENT ── */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <View>
            {/* Quick Progress Cards */}
            <View style={styles.quickStatsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxNum}>24%</Text>
                <Text style={styles.statBoxLabel}>Curriculum</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxNum}>88%</Text>
                <Text style={styles.statBoxLabel}>Attendance</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxNum}>55%</Text>
                <Text style={styles.statBoxLabel}>Avg Test Score</Text>
              </View>
            </View>

            {/* Learning Library Section */}
            <Text style={styles.groupHeading}>My Learning Library</Text>
            <View style={styles.menuGroup}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => Alert.alert('Bookmarks', '5 saved questions and formula cards.')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                  <Bookmark size={18} color="#EC4899" />
                </View>
                <View style={styles.menuItemTextCol}>
                  <Text style={styles.menuItemTitle}>Bookmarked Questions</Text>
                  <Text style={styles.menuItemSub}>5 questions saved for quick revision</Text>
                </View>
                <ChevronRight size={16} color="#64748B" />
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => Alert.alert('Offline Downloads', '1 note (12.4 MB) downloaded and stored.')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                  <Download size={18} color="#06B6D4" />
                </View>
                <View style={styles.menuItemTextCol}>
                  <Text style={styles.menuItemTitle}>Offline Study Materials</Text>
                  <Text style={styles.menuItemSub}>Available without internet connectivity</Text>
                </View>
                <ChevronRight size={16} color="#64748B" />
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => onOpenNote?.('note-1')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <FileText size={18} color="#F59E0B" />
                </View>
                <View style={styles.menuItemTextCol}>
                  <Text style={styles.menuItemTitle}>Study Notes & Annotations</Text>
                  <Text style={styles.menuItemSub}>2 documents with your personal highlights</Text>
                </View>
                <ChevronRight size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Performance Hub Section */}
            <Text style={styles.groupHeading}>Exam Performance</Text>
            <View style={styles.menuGroup}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => onOpenTest?.('test-ch05')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Award size={18} color="#10B981" />
                </View>
                <View style={styles.menuItemTextCol}>
                  <Text style={styles.menuItemTitle}>Mock Test History & Ranks</Text>
                  <Text style={styles.menuItemSub}>Electric Charges Practice Test (11 / 20)</Text>
                </View>
                <ChevronRight size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ACADEMIC TAB */}
        {activeTab === 'academic' && (
          <View>
            <View style={styles.infoCard}>
              <Text style={styles.cardHeader}>Enrolled Institute</Text>
              <Text style={styles.instituteName}>Apex Medical Academy</Text>
              <Text style={styles.instituteBranch}>Kathmandu Main Campus • CEE Wing</Text>

              <View style={styles.cardDivider} />

              <Text style={styles.cardHeader}>Enrolled Programs</Text>
              <View style={styles.programPillRow}>
                <View style={styles.programActivePill}>
                  <CheckCircle2 size={13} color="#10B981" />
                  <Text style={styles.programActiveText}>CEE Preparation 2027 (Active)</Text>
                </View>
                <View style={styles.programSecondaryPill}>
                  <Text style={styles.programSecondaryText}>IOE Foundation 2027</Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <Text style={styles.cardHeader}>Curriculum Subjects</Text>
              <View style={styles.subjectsGrid}>
                {['Physics (Ch 05 Active)', 'Chemistry', 'Botany', 'Zoology'].map((s, idx) => (
                  <View key={idx} style={styles.subjectCard}>
                    <Text style={styles.subjectCardText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* SETTINGS & PREFERENCES TAB */}
        {activeTab === 'settings' && (
          <View>
            <Text style={styles.groupHeading}>Notifications</Text>
            <View style={styles.menuGroup}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Push Notifications</Text>
                  <Text style={styles.toggleSub}>Announcements and test release alerts</Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#1E2338', true: '#7C65F6' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.menuDivider} />

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Class Schedule Reminders</Text>
                  <Text style={styles.toggleSub}>Alert 15 minutes before scheduled class</Text>
                </View>
                <Switch
                  value={classReminders}
                  onValueChange={setClassReminders}
                  trackColor={{ false: '#1E2338', true: '#7C65F6' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <Text style={styles.groupHeading}>Application & Security</Text>
            <View style={styles.menuGroup}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => Alert.alert('Security', 'Password change request sent to registered email.')}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(124, 101, 246, 0.15)' }]}>
                  <KeyRound size={18} color="#7C65F6" />
                </View>
                <View style={styles.menuItemTextCol}>
                  <Text style={styles.menuItemTitle}>Change Password</Text>
                  <Text style={styles.menuItemSub}>Update credentials and active sessions</Text>
                </View>
                <ChevronRight size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <LogOut size={16} color="#EF4444" />
          <Text style={styles.signOutBtnText}>Sign Out of Examly</Text>
        </TouchableOpacity>

        <Text style={styles.versionFooter}>Examly Student App • Version 1.0.0 (Native Release)</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07080E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 38,
    paddingBottom: 16,
    backgroundColor: '#0B0D17',
    borderBottomWidth: 1,
    borderBottomColor: '#171A29',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  batchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124, 101, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  batchPillText: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '800',
  },
  rollPill: {
    backgroundColor: '#161A2B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rollPillText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
  },
  tabBarStrip: {
    flexDirection: 'row',
    backgroundColor: '#0B0D17',
    borderBottomWidth: 1,
    borderBottomColor: '#171A29',
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  subTabBtnActive: {},
  subTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#FFFFFF',
  },
  activeTabLine: {
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
    paddingBottom: 80,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#0E111E',
    borderColor: '#1D2237',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statBoxNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statBoxLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '700',
  },
  groupHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#CBD5E1',
    marginBottom: 10,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuGroup: {
    backgroundColor: '#0E111E',
    borderColor: '#1D2237',
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemTextCol: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  menuItemSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#171A29',
    marginLeft: 62,
  },
  infoCard: {
    backgroundColor: '#0E111E',
    borderColor: '#1D2237',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C65F6',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  instituteName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  instituteBranch: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#171A29',
    marginVertical: 14,
  },
  programPillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  programActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  programActiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
  },
  programSecondaryPill: {
    backgroundColor: '#161A2B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  programSecondaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  subjectCard: {
    backgroundColor: '#13172B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  subjectCardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  toggleSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  signOutBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  versionFooter: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 11,
    marginTop: 18,
    fontWeight: '600',
  },
});
