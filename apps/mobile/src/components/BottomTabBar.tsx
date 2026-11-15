// apps/mobile/src/components/BottomTabBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LayoutDashboard, Layers, FileCheck2, BookOpen, User } from 'lucide-react-native';

export type TabType = 'home' | 'batches' | 'tests' | 'notes' | 'profile';

interface BottomTabBarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function BottomTabBar({ currentTab, onTabChange }: BottomTabBarProps) {
  const tabs = [
    { key: 'home', label: 'Home', icon: LayoutDashboard },
    { key: 'batches', label: 'Batches', icon: Layers },
    { key: 'tests', label: 'Tests', icon: FileCheck2 },
    { key: 'notes', label: 'Notes', icon: BookOpen },
    { key: 'profile', label: 'Profile', icon: User },
  ] as const;

  return (
    <View style={styles.container}>
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
            <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
              <Icon size={20} color={isActive ? '#8B80F5' : '#64748B'} />
            </View>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#090B10',
    borderTopWidth: 1,
    borderTopColor: '#161926',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconBox: {
    padding: 4,
    borderRadius: 12,
  },
  iconBoxActive: {
    backgroundColor: 'rgba(91, 79, 207, 0.2)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#8B80F5',
    fontWeight: '700',
  },
});
