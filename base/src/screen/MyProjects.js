import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Modal,
  TextInput,
} from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { deleteProject, getProjects, getSimulations, renameProject } from '../storage/projectStorage';

function formatDate(value) {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function formatNumber(value, fallback = '-') {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  if (Math.abs(number) > 0 && Math.abs(number) < 0.001) return number.toExponential(2);
  return String(Number(number.toFixed(4)));
}

function resolveGeometryLabel(input, metadata) {
  const geometryType = metadata?.geometryType || input?.geometry?.type || 'rectangle';
  if (geometryType === 'polygon') {
    const pointCount = input?.geometry?.polygon?.points?.length || input?.coordinates?.length || 0;
    return `Custom Polygon (${pointCount} points)`;
  }
  const width = input?.dimensions?.width ?? input?.geometry?.rectangle?.width ?? '-';
  const height = input?.dimensions?.height ?? input?.geometry?.rectangle?.height ?? '-';
  return `${width}m × ${height}m`;
}

function resolveMeshLabel(input, metadata) {
  const algorithm = metadata?.algorithm || input?.meshConfig?.algorithm || input?.meshingConfig?.algorithm || 'structured';
  const elementType = metadata?.elementType || input?.meshConfig?.elementType || input?.meshingConfig?.elementType || 'quad';
  const nx = metadata?.meshInfo?.nx ?? input?.meshConfig?.nx ?? input?.meshingConfig?.nx ?? '-';
  const ny = metadata?.meshInfo?.ny ?? input?.meshConfig?.ny ?? input?.meshingConfig?.ny ?? '-';
  if (metadata?.geometryType === 'polygon' || input?.geometry?.type === 'polygon') {
    return `${String(algorithm).toUpperCase()} ${String(elementType).toUpperCase()}`;
  }
  return `${String(algorithm).toUpperCase()} ${String(elementType).toUpperCase()}, NX=${nx}, NY=${ny}`;
}

function MiniMeshPreview({ simulation }) {
  const output = simulation?.output || {};
  const mesh = output?.data?.mesh || {};
  const results = output?.data?.results || {};
  const nodes = mesh.nodes || [];
  const elements = mesh.elements || [];
  const deformedNodes = results.deformedNodes || [];

  if (!nodes.length || !elements.length) {
    return (
      <View style={styles.meshPreviewEmpty}>
        <Text style={styles.meshPreviewEmptyText}>No mesh preview available.</Text>
      </View>
    );
  }

  const visualNodes = deformedNodes.length === nodes.length ? deformedNodes : nodes;
  const allPoints = [...nodes, ...visualNodes];
  const minX = Math.min(...allPoints.map((node) => node.x));
  const maxX = Math.max(...allPoints.map((node) => node.x));
  const minY = Math.min(...allPoints.map((node) => node.y));
  const maxY = Math.max(...allPoints.map((node) => node.y));
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);

  const toPoint = (node) => {
    const x = 8 + ((node.x - minX) / spanX) * 84;
    const y = 88 - ((node.y - minY) / spanY) * 76;
    return `${x},${y}`;
  };

  return (
    <View style={styles.meshPreviewCard}>
      <Svg width="100%" height="150" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {[0, 25, 50, 75, 100].map((x) => (
          <Line key={`vx-${x}`} x1={x} y1="8" x2={x} y2="90" stroke="#E5E7EB" strokeWidth="0.3" strokeDasharray="1 1" />
        ))}
        {[10, 30, 50, 70, 90].map((y) => (
          <Line key={`hy-${y}`} x1="6" y1={y} x2="94" y2={y} stroke="#E5E7EB" strokeWidth="0.3" strokeDasharray="1 1" />
        ))}
        {elements.map((element, index) => {
          const original = element.nodes.map((id) => toPoint(nodes[id]));
          const deformed = element.nodes.map((id) => toPoint(visualNodes[id] || nodes[id]));
          return (
            <React.Fragment key={element.id ?? index}>
              <Polyline points={`${original.join(' ')} ${original[0]}`} fill="none" stroke="#111827" strokeWidth="0.45" strokeDasharray="1.2 1" opacity="0.65" />
              <Polyline points={`${deformed.join(' ')} ${deformed[0]}`} fill="none" stroke="#1D4ED8" strokeWidth="0.7" opacity="0.95" />
            </React.Fragment>
          );
        })}
      </Svg>
      <Text style={styles.meshPreviewCaption}>Original mesh dashed, deformed mesh highlighted.</Text>
    </View>
  );
}

export default function MyProjects({ onNavigate, refreshToken = 0 }) {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [latestSimulation, setLatestSimulation] = useState(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const storedProjects = await getProjects();
      setProjects(storedProjects);
    } catch (error) {
      console.warn('Unable to load local projects:', error);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadMountedProjects = async () => {
      try {
        setIsLoading(true);
        const storedProjects = await getProjects();
        if (isMounted) setProjects(storedProjects);
      } catch (error) {
        console.warn('Unable to load local projects:', error);
        if (isMounted) setProjects([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadMountedProjects();
    return () => {
      isMounted = false;
    };
  }, [refreshToken]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => {
      const searchable = `${project.name || ''} ${project.description || ''} ${project.lastSimulationStatus || ''}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [projects, searchQuery]);

  const openProjectDetail = async (project) => {
    try {
      const simulations = await getSimulations(project.id);
      setSelectedProject(project);
      setRenameValue(project.name || '');
      setLatestSimulation(simulations?.[0] || null);
      setFeedbackMessage('');
      setIsDetailVisible(true);
    } catch (error) {
      console.warn('Unable to load project simulations:', error);
      setSelectedProject(project);
      setRenameValue(project.name || '');
      setLatestSimulation(null);
      setFeedbackMessage('');
      setIsDetailVisible(true);
    }
  };

  const closeProjectDetail = () => {
    setIsDetailVisible(false);
    setSelectedProject(null);
    setLatestSimulation(null);
    setRenameValue('');
    setFeedbackMessage('');
  };

  const handleRenameProject = async () => {
    if (!selectedProject) return;
    try {
      const updatedProject = await renameProject(selectedProject.id, renameValue);
      await loadProjects();
      setSelectedProject(updatedProject || { ...selectedProject, name: renameValue.trim() });
      setFeedbackMessage('Project renamed successfully.');
    } catch (error) {
      setFeedbackMessage(error?.message || 'Unable to rename project.');
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    try {
      await deleteProject(selectedProject.id);
      closeProjectDetail();
      await loadProjects();
    } catch (error) {
      setFeedbackMessage(error?.message || 'Unable to delete project.');
    }
  };

  const totalProjects = projects.length;
  const successfulProjects = projects.filter((project) => project.lastSimulationStatus === 'success').length;
  const latestInput = latestSimulation?.input || {};
  const latestOutput = latestSimulation?.output || {};
  const latestMetadata = latestSimulation?.metadata || latestOutput?.metadata || {};
  const latestResults = latestOutput?.data?.results || {};
  const latestQuality = latestOutput?.data?.quality || {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 12 : 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconText}>FEA</Text>
          </View>
          <Text style={styles.headerTitle}>My Projects</Text>
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={() => setSearchQuery('')}>
          <Text style={styles.searchIcon}>{searchQuery ? '✕' : '🔍'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBox}>
          <Text style={styles.searchBoxIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search projects by name, T3, Delaunay, or status..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Overview</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalProjects}</Text>
              <Text style={styles.statLabel}>Total Projects</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{successfulProjects}</Text>
              <Text style={styles.statLabel}>Successful Runs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#1A56DB' }]}>{filteredProjects.length}</Text>
              <Text style={styles.statLabel}>Visible</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Projects</Text>

        {isLoading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Loading projects...</Text>
            <Text style={styles.emptyDesc}>Reading local simulation history.</Text>
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No simulation projects yet</Text>
            <Text style={styles.emptyDesc}>Create a rectangle or custom polygon simulation and the app will save the input, output, quality metrics, and metadata locally.</Text>
            <TouchableOpacity style={styles.emptyActionBtn} onPress={onNavigate}>
              <Text style={styles.emptyActionText}>Create First Project</Text>
            </TouchableOpacity>
          </View>
        ) : filteredProjects.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No matching projects</Text>
            <Text style={styles.emptyDesc}>Try a different project name, element type, algorithm, or status keyword.</Text>
          </View>
        ) : (
          filteredProjects.map((project) => (
            <TouchableOpacity key={project.id} style={styles.projectItem} onPress={() => openProjectDetail(project)}>
              <View style={styles.projectImageContainer}>
                <View style={styles.projectImagePlaceholder}>
                  <Text style={styles.projectImageText}>2D</Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: project.lastSimulationStatus === 'success' ? '#10B981' : '#F59E0B' }]} />
              </View>

              <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectDate}>Updated: {formatDate(project.updatedAt)}</Text>
                <View style={styles.tagRow}>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagText}>{project.lastSimulationStatus || 'draft'}</Text>
                  </View>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagText}>Local history</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.arrowIcon}>❯</Text>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={onNavigate}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navIcon, styles.navActive]}>📁</Text>
          <Text style={[styles.navText, styles.navActive]}>Projects</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={onNavigate}>
          <Text style={styles.navIcon}>▶️</Text>
          <Text style={styles.navText}>Simulate</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isDetailVisible} transparent animationType="slide" onRequestClose={closeProjectDetail}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{selectedProject?.name || 'Project Detail'}</Text>
                <Text style={styles.detailSubtitle}>Updated: {formatDate(selectedProject?.updatedAt)}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={closeProjectDetail}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Project Actions</Text>
                <Text style={styles.inputLabel}>Project name</Text>
                <TextInput
                  style={styles.renameInput}
                  value={renameValue}
                  onChangeText={(value) => {
                    setRenameValue(value);
                    setFeedbackMessage('');
                  }}
                  placeholder="Enter project name"
                  placeholderTextColor="#9CA3AF"
                />
                {!!feedbackMessage && <Text style={styles.feedbackText}>{feedbackMessage}</Text>}
                <View style={styles.actionRowCompact}>
                  <TouchableOpacity style={styles.renameBtn} onPress={handleRenameProject}>
                    <Text style={styles.renameBtnText}>Rename</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteProject}>
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Project Metadata</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>{selectedProject?.lastSimulationStatus || 'draft'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedProject?.description || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedProject?.createdAt)}</Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Latest Mesh Preview</Text>
                <MiniMeshPreview simulation={latestSimulation} />
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Latest Simulation Summary</Text>
                {latestSimulation ? (
                  <>
                    <View style={styles.detailGrid}>
                      <View style={styles.detailMetricBox}>
                        <Text style={styles.detailMetricValue}>{latestMetadata.nodeCount || '-'}</Text>
                        <Text style={styles.detailMetricLabel}>Nodes</Text>
                      </View>
                      <View style={styles.detailMetricBox}>
                        <Text style={styles.detailMetricValue}>{latestMetadata.elementCount || '-'}</Text>
                        <Text style={styles.detailMetricLabel}>Elements</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Algorithm</Text>
                      <Text style={styles.detailValue}>{latestMetadata.algorithm || '-'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Element type</Text>
                      <Text style={styles.detailValue}>{String(latestMetadata.elementType || '-').toUpperCase()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Max displacement</Text>
                      <Text style={styles.detailValue}>{formatNumber(latestResults?.maxDisplacement?.value)} m</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Bad elements</Text>
                      <Text style={styles.detailValue}>{latestQuality?.badElementCount ?? '-'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Processing time</Text>
                      <Text style={styles.detailValue}>{latestMetadata.processingTimeMs || 0} ms</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.emptyDesc}>No saved simulation record found for this project.</Text>
                )}
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Input Parameters</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Geometry</Text>
                  <Text style={styles.detailValue}>{resolveGeometryLabel(latestInput, latestMetadata)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mesh setup</Text>
                  <Text style={styles.detailValue}>{resolveMeshLabel(latestInput, latestMetadata)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Material E</Text>
                  <Text style={styles.detailValue}>{formatNumber(latestInput?.physics?.youngModulus)} Pa</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Poisson ratio</Text>
                  <Text style={styles.detailValue}>{formatNumber(latestInput?.physics?.poissonRatio)}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.detailActions}>
              <TouchableOpacity style={styles.secondaryActionBtn} onPress={closeProjectDetail}>
                <Text style={styles.secondaryActionText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryActionBtn} onPress={() => { closeProjectDetail(); onNavigate(); }}>
                <Text style={styles.primaryActionText}>New Run</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  appIcon: { width: 36, height: 36, backgroundColor: '#1A56DB', borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  appIconText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  searchBtn: { padding: 8 },
  searchIcon: { fontSize: 20, color: '#6B7280' },
  content: { paddingHorizontal: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, height: 46, marginBottom: 18 },
  searchBoxIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#111827', fontSize: 14, fontWeight: '600' },
  overviewCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: '#F1F5F9' },
  overviewTitle: { fontSize: 14, color: '#1A56DB', fontWeight: '600', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: '#E2E8F0' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  emptyCard: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 22, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 18 },
  emptyActionBtn: { backgroundColor: '#1D4ED8', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  emptyActionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  projectItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  projectImageContainer: { position: 'relative', marginRight: 16 },
  projectImagePlaceholder: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#1D4ED8', justifyContent: 'center', alignItems: 'center' },
  projectImageText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  statusDot: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FFF' },
  projectInfo: { flex: 1 },
  projectName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  projectDate: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  tagText: { fontSize: 10, color: '#4B5563', fontWeight: '500' },
  arrowIcon: { fontSize: 16, color: '#9CA3AF', marginLeft: 10 },
  fab: { position: 'absolute', bottom: 82, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#1A56DB', justifyContent: 'center', alignItems: 'center', shadowColor: '#1A56DB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  fabIcon: { color: '#FFF', fontSize: 32, fontWeight: '300', marginTop: -4 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#FFF', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingBottom: 20 },
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { fontSize: 22, color: '#9CA3AF', marginBottom: 4 },
  navText: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  navActive: { color: '#1A56DB' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 36, maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  detailTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  detailSubtitle: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#374151', fontSize: 16, fontWeight: '800' },
  detailCard: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, marginBottom: 14 },
  detailSectionTitle: { fontSize: 15, color: '#111827', fontWeight: '800', marginBottom: 12 },
  inputLabel: { fontSize: 12, color: '#6B7280', fontWeight: '700', marginBottom: 6 },
  renameInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, height: 42, color: '#111827', fontWeight: '700', marginBottom: 10 },
  feedbackText: { color: '#1D4ED8', fontSize: 12, fontWeight: '700', marginBottom: 10 },
  actionRowCompact: { flexDirection: 'row', gap: 10 },
  renameBtn: { flex: 1, backgroundColor: '#1D4ED8', paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  renameBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  deleteBtn: { flex: 1, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  deleteBtnText: { color: '#DC2626', fontSize: 13, fontWeight: '800' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 10 },
  detailLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600', flex: 1 },
  detailValue: { fontSize: 13, color: '#111827', fontWeight: '700', flex: 1.4, textAlign: 'right' },
  detailGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  detailMetricBox: { flex: 1, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  detailMetricValue: { fontSize: 20, fontWeight: '800', color: '#1D4ED8', marginBottom: 4 },
  detailMetricLabel: { fontSize: 12, color: '#4B5563', fontWeight: '700' },
  meshPreviewCard: { backgroundColor: '#EFF6FF', borderRadius: 14, borderWidth: 1, borderColor: '#BFDBFE', overflow: 'hidden', paddingTop: 8 },
  meshPreviewCaption: { color: '#4B5563', fontSize: 12, fontWeight: '700', paddingHorizontal: 12, paddingBottom: 12 },
  meshPreviewEmpty: { backgroundColor: '#fff', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#E5E7EB' },
  meshPreviewEmptyText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  detailActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  secondaryActionBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  secondaryActionText: { color: '#374151', fontSize: 14, fontWeight: '800' },
  primaryActionBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#1D4ED8', alignItems: 'center' },
  primaryActionText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
