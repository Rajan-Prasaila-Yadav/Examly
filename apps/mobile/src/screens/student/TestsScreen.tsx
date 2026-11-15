// apps/mobile/src/screens/student/TestsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { apiClient } from '../../api/client';
import { FileCheck2, Clock, Award } from 'lucide-react-native';

export function TestsScreen() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/v1/tests?status=ACTIVE')
      .then((res) => {
        if (res.data?.data) setTests(res.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060709" />
      <View style={styles.header}>
        <Text style={styles.title}>Mock Tests & Exams</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#8B80F5" style={{ marginTop: 40 }} />
        ) : tests.length === 0 ? (
          <View style={styles.empty}>
            <FileCheck2 size={32} color="#64748B" />
            <Text style={styles.emptyText}>No mock tests available at this time.</Text>
          </View>
        ) : (
          tests.map((t) => (
            <TouchableOpacity key={t.id} style={styles.card} activeOpacity={0.85}>
              <View style={styles.cardHeader}>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{t.testStatus || 'SCHEDULED'}</Text>
                </View>
                <View style={styles.timePill}>
                  <Clock size={12} color="#94A3B8" />
                  <Text style={styles.timeText}>{t.durationMinutes} mins</Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{t.title}</Text>
              <Text style={styles.cardMeta}>
                Total Marks: {t.totalMarks} • Pass: {t.passMarks}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060709' },
  header: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#161926' },
  title: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  content: { padding: 20 },
  card: { backgroundColor: '#0E111A', borderColor: '#1E2333', borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusPill: { backgroundColor: 'rgba(91, 79, 207, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#8B80F5', fontWeight: '700', fontSize: 11 },
  timePill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { color: '#94A3B8', fontSize: 11 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  cardMeta: { color: '#64748B', fontSize: 12 },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { color: '#64748B', fontSize: 13 },
});
