import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
  Linking,
  Modal,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Pdf from "react-native-pdf";
import Svg, { Path, Rect } from "react-native-svg";
import * as FileSystem from "expo-file-system";
import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Highlighter,
  Menu,
  MoreHorizontal,
  PenLine,
  Search,
  Settings2,
  StickyNote,
  X,
} from "lucide-react-native";
import { apiClient } from "../../api/client";

interface PdfReaderScreenProps {
  noteId?: string;
  onBack: () => void;
}
type Tool = "select" | "highlight" | "pen" | "note";
type AnnotationType = "HIGHLIGHT" | "DRAWING" | "STICKY" | "TEXT";
interface CourseNote {
  id: string;
  title: string;
  fileUrl?: string;
  fileSizeBytes?: number | null;
  description?: string | null;
}
interface ReaderData {
  note: CourseNote;
  lesson?: { name?: string; subject?: { name?: string } };
}
interface Annotation {
  id: string;
  pageNumber: number;
  type: AnnotationType;
  color?: string | null;
  content?: string | null;
  geometryJson?: string | null;
}
interface BookmarkRecord {
  id: string;
  targetType: string;
  targetId: string;
}
interface Point {
  x: number;
  y: number;
}
type AnnotationPayload = Omit<Annotation, "id" | "geometryJson"> & {
  geometryJson?: string | Record<string, unknown>;
};
const bytes = (value?: number | null) =>
  !value
    ? ""
    : value < 1024 * 1024
      ? `${Math.round(value / 1024)} KB`
      : `${(value / (1024 * 1024)).toFixed(1)} MB`;
const responseData = <T,>(response: { data: T | { data?: T } }) => {
  const body = response.data as { data?: T };
  return body && typeof body === "object" && "data" in body
    ? (body.data as T)
    : (response.data as T);
};
const annotationGeometry = (
  annotation: Annotation,
): Record<string, unknown> | null => {
  if (!annotation.geometryJson) return null;
  try {
    return JSON.parse(annotation.geometryJson) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export function PdfReaderScreen({ noteId, onBack }: PdfReaderScreenProps) {
  const pdf = useRef<Pdf>(null);
  const [data, setData] = useState<ReaderData | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [bookmark, setBookmark] = useState<BookmarkRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pdfUri, setPdfUri] = useState("");
  const [tool, setTool] = useState<Tool>("select");
  const [fitPolicy, setFitPolicy] = useState<0 | 1 | 2>(0);
  const [horizontal, setHorizontal] = useState(false);
  const [showPages, setShowPages] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAnnotationSheet, setShowAnnotationSheet] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [annotationText, setAnnotationText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [viewerSize, setViewerSize] = useState({ width: 1, height: 1 });
  const [drawPoints, setDrawPoints] = useState<Point[]>([]);
  const [lastTap, setLastTap] = useState<Point>({ x: 0.2, y: 0.2 });
  const load = useCallback(async () => {
    if (!noteId) {
      setError("This note is unavailable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setPdfUri("");
    try {
      const [noteResponse, annotationsResponse, bookmarksResponse] =
        await Promise.all([
          apiClient.get(`/api/v1/content/notes/${noteId}`),
          apiClient.get(`/api/v1/notes/${noteId}/annotations`),
          apiClient.get("/api/v1/bookmarks"),
        ]);
      const readerData = responseData<ReaderData>(noteResponse);
      if (!readerData.note.fileUrl)
        throw new Error("This note has no PDF file.");
      const cacheDirectory = FileSystem.cacheDirectory;
      if (!cacheDirectory)
        throw new Error("Local file storage is unavailable.");
      const noteDirectory = `${cacheDirectory}examly-notes`;
      await FileSystem.makeDirectoryAsync(noteDirectory, {
        intermediates: true,
      });
      const downloaded = await FileSystem.downloadAsync(
        readerData.note.fileUrl,
        `${noteDirectory}/${noteId}.pdf`,
        { headers: { Accept: "application/pdf" } },
      );
      if (downloaded.status < 200 || downloaded.status >= 300)
        throw new Error(`PDF download failed (${downloaded.status}).`);
      setData(readerData);
      setPdfUri(downloaded.uri);
      setAnnotations(responseData<Annotation[]>(annotationsResponse) || []);
      const bookmarks = responseData<BookmarkRecord[]>(bookmarksResponse) || [];
      setBookmark(
        bookmarks.find(
          (entry) => entry.targetType === "NOTE" && entry.targetId === noteId,
        ) || null,
      );
      await apiClient.post(`/api/v1/content/notes/${noteId}/open`, {});
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to load this note.",
      );
    } finally {
      setLoading(false);
    }
  }, [noteId]);
  useEffect(() => {
    void load();
  }, [load]);
  const note = data?.note;
  const pageAnnotations = useMemo(
    () => annotations.filter((entry) => entry.pageNumber === page),
    [annotations, page],
  );
  const visualAnnotations = useMemo(
    () =>
      pageAnnotations.filter(
        (entry) => entry.type === "HIGHLIGHT" || entry.type === "DRAWING",
      ),
    [pageAnnotations],
  );
  const visibleSearch = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return query
      ? annotations.filter((entry) =>
          entry.content?.toLowerCase().includes(query),
        )
      : annotations;
  }, [annotations, searchText]);
  const setPdfPage = (nextPage: number) => {
    const safePage = Math.max(1, Math.min(pageCount || 1, nextPage));
    setPage(safePage);
    pdf.current?.setPage(safePage);
  };
  const saveAnnotation = async (payload: AnnotationPayload) => {
    if (!noteId) return;
    try {
      const response = await apiClient.post(
        `/api/v1/notes/${noteId}/annotations`,
        payload,
      );
      setAnnotations((previous) => [
        ...previous,
        responseData<Annotation>(response),
      ]);
    } catch (requestError: any) {
      Alert.alert(
        "Could not save annotation",
        requestError.response?.data?.message || "Please try again.",
      );
    }
  };
  const removeAnnotation = async (annotationId: string) => {
    try {
      await apiClient.delete(`/api/v1/notes/annotations/${annotationId}`);
      setAnnotations((previous) =>
        previous.filter((entry) => entry.id !== annotationId),
      );
    } catch {
      Alert.alert("Could not remove annotation", "Please try again.");
    }
  };
  const toggleBookmark = async () => {
    if (!noteId || !note) return;
    try {
      if (bookmark) {
        await apiClient.delete(`/api/v1/bookmarks/${bookmark.id}`);
        setBookmark(null);
      } else {
        const response = await apiClient.post("/api/v1/bookmarks", {
          targetType: "NOTE",
          targetId: noteId,
          title: note.title,
        });
        setBookmark(responseData<BookmarkRecord>(response));
      }
    } catch {
      Alert.alert("Could not update bookmark", "Please try again.");
    }
  };
  const openFile = async () => {
    if (!note?.fileUrl) return;
    try {
      await Linking.openURL(note.fileUrl);
    } catch {
      Alert.alert(
        "Unable to open document",
        "The document URL is not available on this device.",
      );
    }
  };
  const commitNote = async () => {
    const content = annotationText.trim();
    if (!content) return;
    await saveAnnotation({
      pageNumber: page,
      type: tool === "highlight" ? "HIGHLIGHT" : "STICKY",
      color: tool === "highlight" ? "#FDE047" : "#A78BFA",
      content,
      geometryJson: { x: lastTap.x, y: lastTap.y },
    });
    setAnnotationText("");
    setShowAnnotationSheet(false);
    setTool("select");
  };
  const addHighlight = (x: number, y: number) => {
    setLastTap({ x, y });
    if (tool === "highlight")
      void saveAnnotation({
        pageNumber: page,
        type: "HIGHLIGHT",
        color: "#FDE047",
        geometryJson: { x, y, width: 0.36, height: 0.035 },
      });
    if (tool === "note") setShowAnnotationSheet(true);
  };
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => tool === "pen",
        onMoveShouldSetPanResponder: () => tool === "pen",
        onPanResponderGrant: (event) =>
          setDrawPoints([
            {
              x: event.nativeEvent.locationX / viewerSize.width,
              y: event.nativeEvent.locationY / viewerSize.height,
            },
          ]),
        onPanResponderMove: (event) =>
          setDrawPoints((previous) => [
            ...previous,
            {
              x: event.nativeEvent.locationX / viewerSize.width,
              y: event.nativeEvent.locationY / viewerSize.height,
            },
          ]),
        onPanResponderRelease: () => {
          const points = drawPoints;
          setDrawPoints([]);
          if (points.length > 1)
            void saveAnnotation({
              pageNumber: page,
              type: "DRAWING",
              color: "#A78BFA",
              geometryJson: { points },
            });
          setTool("select");
        },
      }),
    [drawPoints, page, tool, viewerSize.height, viewerSize.width],
  );
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B80F5" />
        <Text style={styles.loadingText}>Opening your course note…</Text>
      </View>
    );
  if (error || !note)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || "Note unavailable."}</Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07080E" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.icon}>
          <ArrowLeft size={20} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.heading}>
          <Text style={styles.title} numberOfLines={1}>
            {note.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {data?.lesson?.subject?.name || "Subject"} ·{" "}
            {bytes(note.fileSizeBytes) || "Course PDF"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowSearch(true)}
          style={styles.icon}
        >
          <Search size={18} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          style={styles.icon}
        >
          <MoreHorizontal size={19} color="#FFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.controlBar}>
        <TouchableOpacity
          style={styles.pagesButton}
          onPress={() => setShowPages(true)}
        >
          <Menu size={15} color="#C4B5FD" />
          <Text style={styles.pagesText}>Pages</Text>
        </TouchableOpacity>
        <Text style={styles.pageLabel}>
          Page {page} of {pageCount || "—"}
        </Text>
        <TouchableOpacity
          style={styles.smallIcon}
          onPress={() => void toggleBookmark()}
        >
          <Bookmark
            size={17}
            color={bookmark ? "#FDE047" : "#CBD5E1"}
            fill={bookmark ? "#FDE047" : "transparent"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.smallIcon}
          onPress={() => void openFile()}
        >
          <Download size={17} color="#CBD5E1" />
        </TouchableOpacity>
      </View>
      {note.description ? (
        <View style={styles.description}>
          <FileText size={14} color="#A78BFA" />
          <Text style={styles.descriptionText} numberOfLines={2}>
            {note.description}
          </Text>
        </View>
      ) : null}
      <View
        style={styles.viewer}
        onLayout={(event: LayoutChangeEvent) =>
          setViewerSize(event.nativeEvent.layout)
        }
      >
        <Pdf
          ref={pdf}
          source={{ uri: pdfUri }}
          style={StyleSheet.absoluteFill}
          page={page}
          fitPolicy={fitPolicy}
          horizontal={horizontal}
          enablePaging
          enableDoubleTapZoom
          minScale={1}
          maxScale={4}
          onLoadComplete={(count) => setPageCount(count)}
          onPageChanged={(current, total) => {
            setPage(current);
            setPageCount(total);
          }}
          onPageSingleTap={(_page, x, y) =>
            addHighlight(x / viewerSize.width, y / viewerSize.height)
          }
          onError={(nativeError) => setError(`This PDF could not be opened: ${String(nativeError)}`)}
          renderActivityIndicator={() => (
            <ActivityIndicator size="large" color="#7C65F6" />
          )}
        />
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%">
            {visualAnnotations.map((annotation) => {
              const geometry = annotationGeometry(annotation);
              if (annotation.type === "HIGHLIGHT")
                return (
                  <Rect
                    key={annotation.id}
                    x={`${Number(geometry?.x || 0.2) * 100}%`}
                    y={`${Number(geometry?.y || 0.2) * 100}%`}
                    width={`${Number(geometry?.width || 0.3) * 100}%`}
                    height={`${Number(geometry?.height || 0.035) * 100}%`}
                    fill={annotation.color || "#FDE047"}
                    opacity={0.36}
                    rx={3}
                  />
                );
              const points = Array.isArray(geometry?.points)
                ? (geometry.points as Point[])
                : [];
              const path = points
                .map(
                  (point, index) =>
                    `${index ? "L" : "M"} ${point.x * viewerSize.width} ${point.y * viewerSize.height}`,
                )
                .join(" ");
              return path ? (
                <Path
                  key={annotation.id}
                  d={path}
                  stroke={annotation.color || "#A78BFA"}
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null;
            })}
            {drawPoints.length > 1 ? (
              <Path
                d={drawPoints
                  .map(
                    (point, index) =>
                      `${index ? "L" : "M"} ${point.x * viewerSize.width} ${point.y * viewerSize.height}`,
                  )
                  .join(" ")}
                stroke="#A78BFA"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />
            ) : null}
          </Svg>
        </View>
        {tool === "pen" ? (
          <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
        ) : null}
      </View>
      <View style={styles.annotationPreview}>
        {pageAnnotations
          .filter((entry) => entry.type === "STICKY" || entry.type === "TEXT")
          .slice(0, 1)
          .map((entry) => (
            <TouchableOpacity
              key={entry.id}
              onLongPress={() => void removeAnnotation(entry.id)}
              style={styles.noteChip}
            >
              <StickyNote size={13} color="#DDD6FE" />
              <Text numberOfLines={1} style={styles.noteChipText}>
                {entry.content || "Saved note"}
              </Text>
            </TouchableOpacity>
          ))}
        {pageAnnotations.filter(
          (entry) => entry.type === "STICKY" || entry.type === "TEXT",
        ).length > 1 ? (
          <Text style={styles.annotationCount}>
            +
            {pageAnnotations.filter(
              (entry) => entry.type === "STICKY" || entry.type === "TEXT",
            ).length - 1}{" "}
            notes
          </Text>
        ) : null}
      </View>
      <View style={styles.pageNavigation}>
        <TouchableOpacity
          disabled={page <= 1}
          onPress={() => setPdfPage(page - 1)}
          style={[styles.navButton, page <= 1 && styles.disabled]}
        >
          <ChevronLeft size={21} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.progress}>
          <View
            style={[
              styles.progressFill,
              { width: `${pageCount ? (page / pageCount) * 100 : 0}%` },
            ]}
          />
        </View>
        <TouchableOpacity
          disabled={page >= pageCount}
          onPress={() => setPdfPage(page + 1)}
          style={[styles.navButton, page >= pageCount && styles.disabled]}
        >
          <ChevronRight size={21} color="#FFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.toolDock}>
        <ToolButton
          label="Select"
          active={tool === "select"}
          icon={<ArrowLeft size={16} color="#E2E8F0" />}
          onPress={() => setTool("select")}
        />
        <ToolButton
          label="Highlight"
          active={tool === "highlight"}
          icon={<Highlighter size={16} color="#FDE047" />}
          onPress={() => setTool(tool === "highlight" ? "select" : "highlight")}
        />
        <ToolButton
          label="Pen"
          active={tool === "pen"}
          icon={<PenLine size={16} color="#C4B5FD" />}
          onPress={() => setTool(tool === "pen" ? "select" : "pen")}
        />
        <ToolButton
          label="Note"
          active={tool === "note"}
          icon={<StickyNote size={16} color="#C4B5FD" />}
          onPress={() => {
            setTool("note");
            setShowAnnotationSheet(true);
          }}
        />
        <ToolButton
          label="View"
          active={false}
          icon={<Settings2 size={16} color="#CBD5E1" />}
          onPress={() => setShowSettings(true)}
        />
      </View>
      <ReaderModal
        visible={showPages}
        title="Pages"
        onClose={() => setShowPages(false)}
      >
        <ScrollView contentContainerStyle={styles.pageGrid}>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map(
            (number) => (
              <TouchableOpacity
                key={number}
                onPress={() => {
                  setPdfPage(number);
                  setShowPages(false);
                }}
                style={[
                  styles.pageTile,
                  number === page && styles.pageTileActive,
                ]}
              >
                <Text
                  style={[
                    styles.pageTileText,
                    number === page && styles.pageTileTextActive,
                  ]}
                >
                  Page {number}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>
      </ReaderModal>
      <ReaderModal
        visible={showSettings}
        title="Reader settings"
        onClose={() => setShowSettings(false)}
      >
        <Text style={styles.modalHint}>
          These controls change this live PDF reader only; your course content
          remains unchanged.
        </Text>
        <SettingRow
          label="Fit width"
          active={fitPolicy === 0}
          onPress={() => setFitPolicy(0)}
        />
        <SettingRow
          label="Fit page"
          active={fitPolicy === 1}
          onPress={() => setFitPolicy(1)}
        />
        <SettingRow
          label="Fit both"
          active={fitPolicy === 2}
          onPress={() => setFitPolicy(2)}
        />
        <SettingRow
          label="Horizontal page swipe"
          active={horizontal}
          onPress={() => setHorizontal((value) => !value)}
        />
        <TouchableOpacity
          style={styles.externalButton}
          onPress={() => void openFile()}
        >
          <Download size={16} color="#FFF" />
          <Text style={styles.externalText}>Open original document</Text>
        </TouchableOpacity>
      </ReaderModal>
      <ReaderModal
        visible={showSearch}
        title="Search saved notes"
        onClose={() => setShowSearch(false)}
      >
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          autoFocus
          placeholder="Search your annotations"
          placeholderTextColor="#64748B"
          style={styles.input}
        />
        <ScrollView>
          {visibleSearch.length ? (
            visibleSearch.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.searchResult}
                onPress={() => {
                  setPdfPage(entry.pageNumber);
                  setShowSearch(false);
                }}
              >
                <Text style={styles.searchPage}>Page {entry.pageNumber}</Text>
                <Text style={styles.searchContent}>
                  {entry.content || entry.type.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No saved annotations match this search.
            </Text>
          )}
        </ScrollView>
      </ReaderModal>
      <Modal
        visible={showAnnotationSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAnnotationSheet(false)}
      >
        <View style={styles.sheetShade}>
          <View style={styles.sheet}>
            <View style={styles.sheetTitle}>
              <Text style={styles.sheetHeading}>
                {tool === "highlight" ? "Describe highlight" : "Add a note"}
              </Text>
              <TouchableOpacity onPress={() => setShowAnnotationSheet(false)}>
                <X size={20} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>
              Saved privately to your Examly account on page {page}.
            </Text>
            <TextInput
              value={annotationText}
              onChangeText={setAnnotationText}
              multiline
              autoFocus
              placeholder={
                tool === "highlight"
                  ? "What should you remember?"
                  : "Write your note…"
              }
              placeholderTextColor="#64748B"
              style={[styles.input, styles.noteInput]}
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => void commitNote()}
            >
              <Text style={styles.saveText}>Save annotation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ToolButton({
  label,
  active,
  icon,
  onPress,
}: {
  label: string;
  active: boolean;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tool, active && styles.toolActive]}
    >
      {icon}
      <Text style={[styles.toolText, active && styles.toolTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
function SettingRow({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={[styles.radio, active && styles.radioActive]}>
        {active ? <View style={styles.radioDot} /> : null}
      </View>
    </TouchableOpacity>
  );
}
function ReaderModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetShade}>
        <View style={styles.sheet}>
          <View style={styles.sheetTitle}>
            <Text style={styles.sheetHeading}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07080E" },
  center: {
    flex: 1,
    backgroundColor: "#07080E",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: { color: "#A5B4FC", fontSize: 13 },
  error: {
    color: "#FCA5A5",
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 28,
  },
  link: { color: "#A78BFA", fontWeight: "800" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
    paddingTop: 37,
    paddingBottom: 10,
    backgroundColor: "#0B0D17",
    borderBottomWidth: 1,
    borderColor: "#1C2032",
  },
  icon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "#161A2B",
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { flex: 1, minWidth: 0 },
  title: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  meta: { color: "#94A3B8", fontSize: 10, marginTop: 3 },
  controlBar: {
    height: 46,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#0E1120",
    borderBottomWidth: 1,
    borderColor: "#1C2032",
  },
  pagesButton: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: "#1A1D32",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
  },
  pagesText: { color: "#DDD6FE", fontSize: 11, fontWeight: "800" },
  pageLabel: {
    flex: 1,
    textAlign: "center",
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
  },
  smallIcon: { padding: 6 },
  description: {
    flexDirection: "row",
    gap: 7,
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#11152A",
  },
  descriptionText: { flex: 1, color: "#CBD5E1", fontSize: 11, lineHeight: 16 },
  viewer: { flex: 1, backgroundColor: "#E5E7EB" },
  annotationPreview: {
    minHeight: 0,
    backgroundColor: "#0B0D17",
    paddingHorizontal: 12,
  },
  noteChip: {
    alignSelf: "flex-start",
    maxWidth: "80%",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 6,
    borderRadius: 7,
    backgroundColor: "#282144",
  },
  noteChipText: { color: "#EDE9FE", fontSize: 10, flexShrink: 1 },
  annotationCount: { color: "#A78BFA", fontSize: 10, marginTop: 5 },
  pageNavigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#0B0D17",
  },
  navButton: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: "#20243A",
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.32 },
  progress: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "#272B3B",
  },
  progressFill: { height: "100%", borderRadius: 2, backgroundColor: "#8B80F5" },
  toolDock: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
    paddingBottom: 22,
    paddingHorizontal: 8,
    backgroundColor: "#121527",
    borderTopWidth: 1,
    borderColor: "#242942",
  },
  tool: {
    minWidth: 55,
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  toolActive: { backgroundColor: "#2F2758" },
  toolText: { color: "#94A3B8", fontSize: 9, fontWeight: "800" },
  toolTextActive: { color: "#E9E5FF" },
  sheetShade: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.56)",
  },
  sheet: {
    maxHeight: "77%",
    padding: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: "#15192C",
  },
  sheetTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sheetHeading: { color: "#FFF", fontSize: 18, fontWeight: "900" },
  modalHint: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 13,
  },
  pageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  pageTile: {
    width: "30%",
    paddingVertical: 15,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#22273C",
  },
  pageTileActive: { backgroundColor: "#7461E9" },
  pageTileText: { color: "#CBD5E1", fontSize: 11, fontWeight: "800" },
  pageTileTextActive: { color: "#FFF" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#292E45",
    paddingVertical: 15,
  },
  settingLabel: { color: "#E2E8F0", fontSize: 14, fontWeight: "700" },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#64748B",
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: { borderColor: "#A78BFA" },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#A78BFA",
  },
  externalButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#735EEA",
  },
  externalText: { color: "#FFF", fontWeight: "900", fontSize: 13 },
  input: {
    color: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#0D1020",
    borderWidth: 1,
    borderColor: "#303753",
    borderRadius: 10,
    fontSize: 14,
  },
  noteInput: { minHeight: 106, textAlignVertical: "top" },
  saveButton: {
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#7C65F6",
  },
  saveText: { color: "#FFF", fontWeight: "900" },
  searchResult: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#292E45",
  },
  searchPage: {
    color: "#A78BFA",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 4,
  },
  searchContent: { color: "#E2E8F0", fontSize: 13 },
  emptyText: { color: "#94A3B8", textAlign: "center", paddingVertical: 22 },
});
