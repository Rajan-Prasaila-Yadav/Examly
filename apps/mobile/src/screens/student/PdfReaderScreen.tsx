// apps/mobile/src/screens/student/PdfReaderScreen.tsx
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
import {
  ArrowLeft,
  Search,
  Bookmark,
  Share2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Highlighter,
  Edit3,
  StickyNote,
  MousePointer,
  Download,
  ZoomIn,
  ZoomOut,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface PdfReaderScreenProps {
  noteId?: string;
  onBack: () => void;
}

export function PdfReaderScreen({ noteId, onBack }: PdfReaderScreenProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 8;
  const [activeTool, setActiveTool] = useState<'select' | 'highlight' | 'pen' | 'note'>('select');
  const [highlightColor, setHighlightColor] = useState<'yellow' | 'green' | 'pink'>('yellow');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06070B" />

      {/* ── 1. TOP HEADER & ACTIONS ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerIconBtn} activeOpacity={0.8}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerDocTitle} numberOfLines={1}>
            Coulomb's Law — Notes.pdf
          </Text>
          <Text style={styles.headerDocMeta}>
            Physics • Chapter 05 • 8 Pages (2.4 MB)
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setIsBookmarked(!isBookmarked)}
          >
            <Bookmark
              size={18}
              color={isBookmarked ? '#F59E0B' : '#94A3B8'}
              fill={isBookmarked ? '#F59E0B' : 'none'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => Alert.alert('Offline Download', 'Notes saved to your offline study library.')}
          >
            <Download size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. PAGE NAVIGATION STRIP ── */}
      <View style={styles.pageScrubberStrip}>
        <TouchableOpacity
          style={[styles.pageNavBtn, currentPage === 1 && styles.pageNavBtnDisabled]}
          disabled={currentPage === 1}
          onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
        >
          <ChevronLeft size={16} color={currentPage === 1 ? '#475569' : '#FFFFFF'} />
        </TouchableOpacity>

        <View style={styles.pagePill}>
          <Text style={styles.pagePillText}>
            Page {currentPage} of {totalPages}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.pageNavBtn, currentPage === totalPages && styles.pageNavBtnDisabled]}
          disabled={currentPage === totalPages}
          onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        >
          <ChevronRight size={16} color={currentPage === totalPages ? '#475569' : '#FFFFFF'} />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {/* Zoom Controls */}
        <View style={styles.zoomContainer}>
          <TouchableOpacity
            onPress={() => setZoomLevel((z) => Math.max(80, z - 10))}
            style={styles.zoomBtn}
          >
            <ZoomOut size={14} color="#94A3B8" />
          </TouchableOpacity>
          <Text style={styles.zoomText}>{zoomLevel}%</Text>
          <TouchableOpacity
            onPress={() => setZoomLevel((z) => Math.min(150, z + 10))}
            style={styles.zoomBtn}
          >
            <ZoomIn size={14} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 3. PDF PAGE CANVAS ── */}
      <ScrollView
        contentContainerStyle={styles.canvasContainer}
        showsVerticalScrollIndicator={true}
      >
        <View style={[styles.paperSheet, { transform: [{ scale: zoomLevel / 100 }] }]}>
          {/* Header of the PDF document page */}
          <View style={styles.pdfHeaderRow}>
            <Text style={styles.pdfInstituteWatermark}>APEX MEDICAL ACADEMY • CEE 2027</Text>
            <Text style={styles.pdfPageNumWatermark}>PAGE {currentPage}</Text>
          </View>

          <Text style={styles.pdfChapterTitle}>CHAPTER 05: ELECTROSTATICS</Text>
          <Text style={styles.pdfSectionHeading}>Section 5.2 — Coulomb's Law & Force Vectors</Text>

          <View style={styles.pdfDivider} />

          {/* Statement */}
          <Text style={styles.pdfBodyParagraph}>
            <Text style={styles.boldText}>Statement: </Text>
            The magnitude of the electrostatic force between two stationary point charges is directly proportional to the product of the magnitudes of charges and inversely proportional to the square of the distance between them.
          </Text>

          {/* Formula Display Box */}
          <View style={styles.formulaCard}>
            <Text style={styles.formulaTitle}>Scalar Form in Vacuum (SI Units):</Text>
            <Text style={styles.formulaEquation}>
              F = (1 / 4πε₀) · (|q₁ · q₂| / r²)
            </Text>
            <Text style={styles.formulaAnnotation}>
              Where k = 1 / (4πε₀) ≈ 8.98755 × 10⁹ N·m²/C² ≈ 9 × 10⁹ N·m²/C²
            </Text>
          </View>

          {/* Highlighted Callout */}
          <View
            style={[
              styles.calloutCard,
              activeTool === 'highlight' && highlightColor === 'yellow' && styles.calloutHighlightedYellow,
              activeTool === 'highlight' && highlightColor === 'green' && styles.calloutHighlightedGreen,
              activeTool === 'highlight' && highlightColor === 'pink' && styles.calloutHighlightedPink,
            ]}
          >
            <Text style={styles.calloutTitle}>Key Examination Takeaway:</Text>
            <Text style={styles.calloutText}>
              • The electrostatic force acts along the straight line joining the centers of two point charges (Central Force).
              {'\n'}• If dielectric medium of relative permittivity (dielectric constant K) is introduced between charges, the force reduces to F' = F / K.
              {'\n'}• For distilled water at 20°C, K ≈ 80. Hence force decreases by a factor of 80!
            </Text>
          </View>

          {/* Vector Form */}
          <Text style={[styles.pdfSectionHeading, { marginTop: 14 }]}>Vector Form Representation</Text>
          <Text style={styles.pdfBodyParagraph}>
            Let r₁ and r₂ be the position vectors of charges q₁ and q₂. The force exerted on q₁ by q₂ is given by:
          </Text>

          <View style={styles.formulaCardVector}>
            <Text style={styles.formulaEquationVector}>
              F₁₂ = (1 / 4πε₀) · (q₁q₂ / |r₁ - r₂|³) · (r₁ - r₂)
            </Text>
            <Text style={styles.formulaAnnotationVector}>
              Since (r₁ - r₂) = - (r₂ - r₁), it follows that F₁₂ = - F₂₁ (Action-Reaction Pair).
            </Text>
          </View>

          {/* Sticky Note Annotation Preview */}
          <View style={styles.stickyNoteSticky}>
            <View style={styles.stickyNoteHeader}>
              <StickyNote size={12} color="#D97706" />
              <Text style={styles.stickyNoteAuthor}>My Note • Page 1</Text>
            </View>
            <Text style={styles.stickyNoteContent}>
              Revise ratio questions where charges touch each other and are then placed at distance r/2.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── 4. FLOATING BOTTOM ANNOTATION TOOLBAR ── */}
      <View style={styles.bottomToolbarContainer}>
        <View style={styles.floatingToolbar}>
          {/* Select Tool */}
          <TouchableOpacity
            style={[styles.toolBtn, activeTool === 'select' && styles.toolBtnActive]}
            onPress={() => setActiveTool('select')}
          >
            <MousePointer size={18} color={activeTool === 'select' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.toolLabel, activeTool === 'select' && styles.toolLabelActive]}>
              Select
            </Text>
          </TouchableOpacity>

          {/* Highlight Tool */}
          <TouchableOpacity
            style={[styles.toolBtn, activeTool === 'highlight' && styles.toolBtnActive]}
            onPress={() => {
              if (activeTool === 'highlight') {
                const colors: Array<'yellow' | 'green' | 'pink'> = ['yellow', 'green', 'pink'];
                const next = colors[(colors.indexOf(highlightColor) + 1) % colors.length];
                setHighlightColor(next);
              } else {
                setActiveTool('highlight');
              }
            }}
          >
            <Highlighter size={18} color={activeTool === 'highlight' ? '#F59E0B' : '#94A3B8'} />
            <Text style={[styles.toolLabel, activeTool === 'highlight' && styles.toolLabelActive]}>
              Highlight
            </Text>
          </TouchableOpacity>

          {/* Pen Tool */}
          <TouchableOpacity
            style={[styles.toolBtn, activeTool === 'pen' && styles.toolBtnActive]}
            onPress={() => setActiveTool('pen')}
          >
            <Edit3 size={18} color={activeTool === 'pen' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.toolLabel, activeTool === 'pen' && styles.toolLabelActive]}>
              Pen
            </Text>
          </TouchableOpacity>

          {/* Note Tool */}
          <TouchableOpacity
            style={[styles.toolBtn, activeTool === 'note' && styles.toolBtnActive]}
            onPress={() => {
              setActiveTool('note');
              Alert.alert('Annotation', 'Tap anywhere on the PDF page to drop a sticky note.');
            }}
          >
            <StickyNote size={18} color={activeTool === 'note' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.toolLabel, activeTool === 'note' && styles.toolLabelActive]}>
              Sticky
            </Text>
          </TouchableOpacity>

          {/* Fullscreen Button */}
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => Alert.alert('Fullscreen', 'Entering Fullscreen Reader view...')}
          >
            <Maximize2 size={18} color="#94A3B8" />
            <Text style={styles.toolLabel}>Full</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#121524',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerDocTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerDocMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageScrubberStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0B0D17',
    borderBottomWidth: 1,
    borderBottomColor: '#171A29',
    gap: 10,
  },
  pageNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#161A2B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNavBtnDisabled: {
    backgroundColor: '#0E111E',
  },
  pagePill: {
    backgroundColor: 'rgba(124, 101, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pagePillText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '800',
  },
  zoomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121524',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 6,
  },
  zoomBtn: {
    padding: 3,
  },
  zoomText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  canvasContainer: {
    padding: 16,
    paddingBottom: 110,
    alignItems: 'center',
  },
  paperSheet: {
    width: '100%',
    maxWidth: 580,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  pdfHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pdfInstituteWatermark: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  pdfPageNumWatermark: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
  },
  pdfChapterTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  pdfSectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4338CA',
    marginTop: 4,
    marginBottom: 8,
  },
  pdfDivider: {
    height: 1.5,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  pdfBodyParagraph: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 20,
    marginBottom: 14,
  },
  boldText: {
    fontWeight: '800',
    color: '#0F172A',
  },
  formulaCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  formulaTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  formulaEquation: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1,
    marginBottom: 6,
  },
  formulaAnnotation: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },
  calloutCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  calloutHighlightedYellow: {
    backgroundColor: '#FEF08A',
    borderColor: '#FACC15',
  },
  calloutHighlightedGreen: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
  },
  calloutHighlightedPink: {
    backgroundColor: '#FCE7F3',
    borderColor: '#F472B6',
  },
  calloutTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 18,
    fontWeight: '600',
  },
  formulaCardVector: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  formulaEquationVector: {
    fontSize: 14,
    fontWeight: '900',
    color: '#312E81',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  formulaAnnotationVector: {
    fontSize: 10,
    color: '#4338CA',
    textAlign: 'center',
    fontWeight: '600',
  },
  stickyNoteSticky: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stickyNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  stickyNoteAuthor: {
    fontSize: 10,
    fontWeight: '800',
    color: '#854D0E',
  },
  stickyNoteContent: {
    fontSize: 11,
    color: '#713F12',
    lineHeight: 16,
  },
  bottomToolbarContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  floatingToolbar: {
    flexDirection: 'row',
    backgroundColor: '#0F1322',
    borderColor: '#262D4A',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  toolBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  toolBtnActive: {
    backgroundColor: '#7C65F6',
  },
  toolLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '700',
  },
  toolLabelActive: {
    color: '#FFFFFF',
  },
});
