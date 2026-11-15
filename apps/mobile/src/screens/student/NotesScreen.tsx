// apps/mobile/src/screens/student/NotesScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { apiClient } from '../../api/client';
import { BookOpen, ChevronRight, FileText } from 'lucide-react-native';

export function NotesScreen() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/v1/content/notes')
      .then((res) => {
        if (res.data?.data) setNotes(res.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060709" />
      <View style={styles.header}>
        <Text style={styles.title}>Notes & Handouts</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#8B80F5" style={{ marginTop: 40 }} />
        ) : notes.length === 0 ? (
          <View style={styles.empty}>
            <BookOpen size={32} color="#64748B" />
            <Text style={styles.emptyText}>No notes available in your curriculum.</Text>
          </View>
        ) : (
          notes.map((n) => (
            <TouchableOpacity key={n.id} style={styles.card} activeOpacity={0.85}>
              <View style={styles.iconBox}>
                <FileText size={20} color="#8B80F5" />
              </View>
              <View style={styles.info}>
                <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                <Text style={styles.cardMeta}>
                  {n.lesson?.subject?.name || 'Subject'} • PDF Document
                </Text>
              </View>
              <ChevronRight size={16} color="#64748B" />
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
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0E111A', borderColor: '#1E2333', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10, gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#161926', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  cardMeta: { color: '#64748B', fontSize: 11, marginTop: 2 },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { color: '#64748B', fontSize: 13 },
});
