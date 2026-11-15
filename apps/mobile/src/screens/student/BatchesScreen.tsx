// apps/mobile/src/screens/student/BatchesScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { apiClient } from '../../api/client';
import { Layers, ChevronRight, BookOpen } from 'lucide-react-native';

export function BatchesScreen() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/v1/batches?status=ACTIVE')
      .then((res) => {
        if (res.data?.data) setBatches(res.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060709" />
      <View style={styles.header}>
        <Text style={styles.title}>My Batches & Curriculum</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#8B80F5" style={{ marginTop: 40 }} />
        ) : batches.length === 0 ? (
          <View style={styles.empty}>
            <Layers size={32} color="#64748B" />
            <Text style={styles.emptyText}>No active batches found.</Text>
          </View>
        ) : (
          batches.map((b) => (
            <TouchableOpacity key={b.id} style={styles.card} activeOpacity={0.85}>
              <View style={styles.cardHeader}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{b.code}</Text>
                </View>
                <Text style={styles.feeText}>{b.priceNpr ? `Rs. ${b.priceNpr}` : 'Free'}</Text>
              </View>
              <Text style={styles.cardTitle}>{b.name}</Text>
              <Text style={styles.cardDesc}>
                {b.subjects?.length || 0} subjects • {b._count?.students || 0} students enrolled
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
  badge: { backgroundColor: 'rgba(91, 79, 207, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#8B80F5', fontWeight: '700', fontSize: 11 },
  feeText: { color: '#34D399', fontWeight: '700', fontSize: 11 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  cardDesc: { color: '#94A3B8', fontSize: 12 },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { color: '#64748B', fontSize: 13 },
});
