// apps/mobile/src/components/BottomTabBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Home, BookOpen, ClipboardList, BarChart2, User } from 'lucide-react-native';

export type TabType = 'home' | 'learn' | 'tests' | 'activity' | 'profile';

interface BottomTabBarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function BottomTabBar({ currentTab, onTabChange }: BottomTabBarProps) {
  const tabs = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'learn', label: 'Learn', icon: BookOpen },
    { key: 'tests', label: 'Tests', icon: ClipboardList },
    { key: 'activity', label: 'Activity', icon: BarChart2 },
    { key: 'profile', label: 'Profile', icon: User },
  ] as const;

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabButton}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconPill, isActive && styles.iconPillActive]}>
                <Icon size={20} color={isActive ? '#FFFFFF' : '#94A3B8'} strokeWidth={isActive ? 2.5 : 2} />
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#07080E',
    borderTopWidth: 1,
    borderTopColor: '#171926',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconPill: {
    width: 54,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: '#7C65F6',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8A8F9E',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
