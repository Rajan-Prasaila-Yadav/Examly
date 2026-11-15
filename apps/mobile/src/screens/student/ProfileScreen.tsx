// apps/mobile/src/screens/student/ProfileScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useAuth } from '../../auth/auth-context';
import { User, Mail, Shield, LogOut, Award } from 'lucide-react-native';

export function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060709" />
      <View style={styles.header}>
        <Text style={styles.title}>Student Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName?.[0] || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{user?.fullName || 'Examly Student'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role || 'STUDENT'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Mail size={18} color="#8B80F5" />
            <View style={styles.rowText}>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.value}>{user?.email || 'student@examly.io'}</Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <Shield size={18} color="#8B80F5" />
            <View style={styles.rowText}>
              <Text style={styles.label}>Account ID</Text>
              <Text style={styles.value}>{user?.id || 'EX-9283'}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060709' },
  header: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#161926' },
  title: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  content: { padding: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#5B4FCF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '900', color: '#FFFFFF' },
  userName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  roleBadge: { backgroundColor: 'rgba(91, 79, 207, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleText: { color: '#8B80F5', fontSize: 11, fontWeight: '700' },
  card: { backgroundColor: '#0E111A', borderColor: '#1E2333', borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 },
  rowText: { flex: 1 },
  label: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  value: { fontSize: 13, color: '#FFFFFF', fontWeight: '700', marginTop: 2 },
  separator: { height: 1, backgroundColor: '#1E2333', marginVertical: 10 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', borderWidth: 1, padding: 14, borderRadius: 16 },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
});
