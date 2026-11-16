// apps/mobile/src/screens/student/ActivityScreen.tsx
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart2,
  Clock,
  CheckCircle2,
  Play,
  FileText,
  Bookmark,
  Download,
  Award,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Trash2,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface ActivityScreenProps {
  onOpenTest?: (testId?: string) => void;
  onOpenVideo?: (videoId?: string) => void;
  onOpenNote?: (noteId?: string) => void;
}

export function ActivityScreen({ onOpenTest, onOpenVideo, onOpenNote }: ActivityScreenProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'tests' | 'videos' | 'notes' | 'bookmarks' | 'downloads'>('all');
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const items: any[] = [
        {
          id: 'act-1',
          type: 'test',
          title: 'Electric Charges & Fields — Practice Test',
          meta: 'Score: 11 / 20 (55%) • Rank #4 • Passed',
          time: 'Today, 11:45 AM',
          badge: '55% Score',
          badgeColor: '#10B981',
          icon: Award,
          actionText: 'View Analysis',
          onPress: () => onOpenTest?.('cmwif3f8l0007w8av2oubk2r7'),
        },
        {
          id: 'act-2',
          type: 'video',
          title: "02 Coulomb's Law & Electrostatic Forces",
          meta: 'Watched 12 of 30 mins • Chapter 05 Physics',
          time: 'Today, 10:20 AM',
          badge: '40% Watched',
          badgeColor: '#7C65F6',
          icon: Play,
          actionText: 'Resume Video',
          onPress: () => onOpenVideo?.('cmwif1bjy000n14fgqjk7veuo'),
        },
        {
          id: 'act-3',
          type: 'note',
          title: "Coulomb's Law — Notes.pdf",
          meta: 'Read 8 Pages • 2 Highlights added',
          time: 'Yesterday, 4:15 PM',
          badge: 'Notes Read',
          badgeColor: '#F59E0B',
          icon: FileText,
          actionText: 'Open PDF',
          onPress: () => onOpenNote?.('cmwif27ox0007pgn7jcorfwc6'),
        },
        {
          id: 'act-4',
          type: 'bookmark',
          title: 'Question 7: Electrostatic Force When Distance Halved',
          meta: 'Saved in Important Formulas & High Yield Qs',
          time: 'Yesterday, 3:30 PM',
          badge: 'Bookmarked',
          badgeColor: '#EC4899',
          icon: Bookmark,
          actionText: 'Review Question',
          onPress: () => onOpenTest?.('cmwif3f8l0007w8av2oubk2r7'),
        },
        {
          id: 'act-5',
          type: 'download',
          title: 'Physics Mechanics & Electrostatics Formula Sheet.pdf',
          meta: '358 KB • Available Offline in Storage',
          time: '2 days ago',
          badge: 'Downloaded',
          badgeColor: '#06B6D4',
          icon: Download,
          actionText: 'Open Offline',
          onPress: () => onOpenNote?.('cmwif27ox0007pgn7jcorfwc6'),
        },
      ];
      setActivities(items);
    } catch (e) {
      console.warn('Failed to load activities:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = activities.filter((a) => {
    if (activeFilter === 'all') return true;
    return a.type === activeFilter;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06070B" />

      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Learning Activity</Text>
        <Text style={styles.headerSub}>Timeline of your study progress and saved items</Text>
      </View>

      {/* Overview Stat Strip */}
      <View style={styles.statCardsRow}>
        <View style={styles.statColCard}>
          <Text style={styles.statNumber}>1</Text>
          <Text style={styles.statLabel}>Tests Taken</Text>
        </View>
        <View style={styles.statColCard}>
          <Text style={styles.statNumber}>4.5h</Text>
          <Text style={styles.statLabel}>Study Time</Text>
        </View>
        <View style={styles.statColCard}>
          <Text style={styles.statNumber}>2</Text>
          <Text style={styles.statLabel}>Notes Read</Text>
        </View>
        <View style={styles.statColCard}>
          <Text style={styles.statNumber}>5</Text>
          <Text style={styles.statLabel}>Saved Items</Text>
        </View>
      </View>

      {/* Filter Segment Tabs */}
      <View style={styles.filterStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {(['all', 'tests', 'videos', 'notes', 'bookmarks', 'downloads'] as const).map((filter) => {
            const isActive = activeFilter === filter;
            const labels = {
              all: 'All (5)',
              tests: 'Tests (1)',
              videos: 'Videos (1)',
              notes: 'Notes (1)',
              bookmarks: 'Bookmarks (1)',
              downloads: 'Downloads (1)',
            };
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {labels[filter]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Timeline List */}
      <ScrollView contentContainerStyle={styles.contentList} showsVerticalScrollIndicator={false}>
        {filtered.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.activityCard}
              activeOpacity={0.85}
              onPress={item.onPress}
            >
              <View style={[styles.activityIconCircle, { backgroundColor: `${item.badgeColor}25` }]}>
                <Icon size={20} color={item.badgeColor} />
              </View>

              <View style={styles.activityInfo}>
                <View style={styles.activityTopRow}>
                  <View style={[styles.badgePill, { backgroundColor: `${item.badgeColor}20` }]}>
                    <Text style={[styles.badgePillText, { color: item.badgeColor }]}>{item.badge}</Text>
                  </View>
                  <Text style={styles.activityTimeText}>{item.time}</Text>
                </View>

                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityMeta}>{item.meta}</Text>

                <View style={styles.actionRow}>
                  <Text style={styles.actionText}>{item.actionText}</Text>
                  <ChevronRight size={14} color="#7C65F6" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 38,
    paddingBottom: 12,
    backgroundColor: '#0B0D17',
    borderBottomWidth: 1,
    borderBottomColor: '#171A29',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  statCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0B0D17',
    borderBottomWidth: 1,
    borderBottomColor: '#171A29',
    gap: 8,
  },
  statColCard: {
    flex: 1,
    backgroundColor: '#101424',
    borderColor: '#1F253C',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '700',
  },
  filterStrip: {
    paddingVertical: 10,
    backgroundColor: '#0B0D17',
    borderBottomWidth: 1,
    borderBottomColor: '#171A29',
  },
  filterPill: {
    backgroundColor: '#121524',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2438',
  },
  filterPillActive: {
    backgroundColor: '#7C65F6',
    borderColor: '#7C65F6',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  contentList: {
    padding: 16,
    paddingBottom: 80,
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#0E111E',
    borderColor: '#1D2237',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  activityIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  activityTimeText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  activityMeta: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C65F6',
  },
});
