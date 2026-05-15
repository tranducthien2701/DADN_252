import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Switch, Modal, Platform, StatusBar } from 'react-native';
import Svg, { Polygon, Polyline, Line, Text as SvgText } from 'react-native-svg';
import Feather from 'react-native-vector-icons/Feather';
import { stringifySimulationExport } from '../utils/exportSimulation';

const DEFAULT_LAYERS = {
  originalMesh: true,
  deformedMesh: true,
  contour: false,
  fixedSupports: true,
  loadVectors: true,
  badElements: false,
};

const LAYER_OPTIONS = [
  { key: 'originalMesh', label: 'Original Mesh', description: 'Dashed reference mesh' },
  { key: 'deformedMesh', label: 'Deformed Mesh', description: 'Scaled displacement result' },
  { key: 'contour', label: 'Contour', description: 'Lite displacement magnitude field' },
  { key: 'fixedSupports', label: 'Fixed Supports', description: 'Boundary constraint markers' },
  { key: 'loadVectors', label: 'Load Vectors', description: 'Applied point load direction' },
  { key: 'badElements', label: 'Bad Elements', description: 'Highlight quality warnings' },
];

function getContourColor(normalizedValue) {
  const value = Math.max(0, Math.min(1, normalizedValue));
  if (value < 0.2) return '#DBEAFE';
  if (value < 0.4) return '#93C5FD';
  if (value < 0.6) return '#3B82F6';
  if (value < 0.8) return '#F59E0B';
  return '#DC2626';
}

function formatEngineeringNumber(value, unit = '') {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return `0${unit}`;
  const formatted = Math.abs(number) > 0 && Math.abs(number) < 0.001
    ? number.toExponential(3)
    : Number(number.toFixed(6)).toString();
  return `${formatted}${unit}`;
}

function formatForceVector(force) {
  if (!Array.isArray(force) || force.length < 2) return '[0, 0] N';
  const fx = Number(force[0] || 0);
  const fy = Number(force[1] || 0);
  return `[${fx.toExponential(2)}, ${fy.toExponential(2)}] N`;
}

function normalizeElementLabel(elementType) {
  const normalized = String(elementType || 'quad').toLowerCase();
  if (['triangle', 'tri', 'tri3'].includes(normalized)) return 'T3';
  return normalized === 't3' ? 'T3' : normalized.toUpperCase();
}

function normalizeGeometryLabel(geometryType) {
  const normalized = String(geometryType || 'rectangle').toLowerCase();
  if (normalized === 'polygon') return 'POLYGON';
  return 'RECTANGLE';
}

export default function MeshQualityView({ onBack, meshingData }) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_LAYERS);

  const simulationResult = meshingData?.result || {};
  const structuredData = simulationResult?.data || {};
  const metadata = simulationResult?.metadata || {};
  const mesh = structuredData?.mesh || {};
  const results = structuredData?.results || {};
  const boundaryVisualization = structuredData?.boundaryVisualization || {};
  const quality = structuredData?.quality || {};
  const exportJson = useMemo(() => stringifySimulationExport(meshingData), [meshingData]);

  const nodes = mesh.nodes || simulationResult.nodes || [];
  const deformedNodes = results.deformedNodes || simulationResult.deformedNodes || [];
  const elements = mesh.elements || simulationResult.elements || [];
  const fixedNodeIds = boundaryVisualization.fixedNodeIds || simulationResult.fixedNodeIds || [];
  const loadMarkers = boundaryVisualization.loadMarkers || simulationResult.loadMarkers || [];
  const displacementMagnitude = results.displacementMagnitude || simulationResult.displacementMagnitude || [];
  const nodeCount = metadata.nodeCount || simulationResult.nodeCount || nodes.length || 0;
  const elementCount = metadata.elementCount || simulationResult.elementCount || elements.length || 0;
  const meshInfo = metadata.meshInfo || simulationResult.meshInfo || {};
  const scaleFactor = metadata.scaleFactor || simulationResult.scaleFactor || 200;
  const maxDisplacement = results.maxDisplacement || { value: 0, nodeId: '-' };
  const algorithm = metadata.algorithm || meshInfo.algorithm || meshingData?.meshConfig?.algorithm || meshingData?.meshingConfig?.algorithm || 'structured';
  const elementType = metadata.elementType || meshInfo.element_type || meshInfo.elementType || meshingData?.meshConfig?.elementType || meshingData?.meshingConfig?.elementType || 'quad';
  const geometryType = metadata.geometryType || meshingData?.geometry?.type || (meshingData?.shape === 'Custom Polygon' ? 'polygon' : 'rectangle');
  const nx = meshInfo.nx || meshingData?.meshConfig?.nx || meshingData?.meshingConfig?.nx || '-';
  const ny = meshInfo.ny || meshingData?.meshConfig?.ny || meshingData?.meshingConfig?.ny || '-';
  const primaryLoadMarker = loadMarkers[0] || {};
  const elementLabel = normalizeElementLabel(elementType);
  const geometryLabel = normalizeGeometryLabel(geometryType);
  const algorithmLabel = String(algorithm || 'structured').toUpperCase();
  const dashboardBadge = `${geometryLabel} ${elementLabel}`;
  const meshSummary = geometryType === 'polygon'
    ? `${algorithmLabel} ${elementLabel}`
    : `${algorithmLabel} ${elementLabel}, NX=${nx}, NY=${ny}`;

  const badElementIds = useMemo(() => {
    return new Set((quality.elementMetrics || []).filter((item) => item.isBad).map((item) => item.id));
  }, [quality.elementMetrics]);

  const contourData = useMemo(() => {
    const valueByNodeId = new Map();
    displacementMagnitude.forEach((item) => {
      valueByNodeId.set(Number(item.id), Number(item.value || 0));
    });
    const values = nodes.map((_, nodeId) => valueByNodeId.get(nodeId) || 0);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    const range = Math.max(max - min, 1e-18);
    return { valueByNodeId, min, max, range };
  }, [displacementMagnitude, nodes]);

  const activeLayerCount = Object.values(visibleLayers).filter(Boolean).length;

  const toggleLayer = (layerKey) => {
    setVisibleLayers((current) => ({ ...current, [layerKey]: !current[layerKey] }));
  };

  const getElementContourFill = (elementNodeIds) => {
    if (!elementNodeIds?.length) return '#DBEAFE';
    const sum = elementNodeIds.reduce((total, nodeId) => total + (contourData.valueByNodeId.get(Number(nodeId)) || 0), 0);
    const avg = sum / elementNodeIds.length;
    return getContourColor((avg - contourData.min) / contourData.range);
  };

  const renderMesh = () => {
    if (!nodes.length || !elements.length || !deformedNodes.length) {
      return (
        <View style={styles.emptyCanvas}>
          <Text style={styles.emptyCanvasText}>No FEA data available.</Text>
        </View>
      );
    }

    const allPoints = [...nodes, ...deformedNodes];
    const minX = Math.min(...allPoints.map((n) => n.x));
    const maxX = Math.max(...allPoints.map((n) => n.x));
    const minY = Math.min(...allPoints.map((n) => n.y));
    const maxY = Math.max(...allPoints.map((n) => n.y));
    const spanX = Math.max(1e-6, maxX - minX);
    const spanY = Math.max(1e-6, maxY - minY);
    const axisLeft = 12;
    const axisBottom = 92;
    const axisRight = 94;
    const axisTop = 8;

    const toCanvasPoint = (x, y) => {
      const sx = axisLeft + ((x - minX) / spanX) * (axisRight - axisLeft);
      const sy = axisBottom - ((y - minY) / spanY) * (axisBottom - axisTop);
      return { sx, sy, point: `${sx},${sy}` };
    };

    const xTicks = Array.from({ length: 5 }, (_, i) => ({ value: Number((minX + (spanX * i) / 4).toFixed(2)), x: axisLeft + ((axisRight - axisLeft) * i) / 4 }));
    const yTicks = Array.from({ length: 5 }, (_, i) => ({ value: Number((minY + (spanY * i) / 4).toFixed(2)), y: axisBottom - ((axisBottom - axisTop) * i) / 4 }));

    return (
      <Svg height="100%" width="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {xTicks.map((tick, i) => (
          <React.Fragment key={`xtick-${i}`}>
            <Line x1={tick.x} y1={axisBottom} x2={tick.x} y2={axisTop} stroke="#E5E7EB" strokeWidth="0.3" strokeDasharray="1 1" />
            <SvgText x={tick.x} y={96.5} fontSize="2.7" fill="#4B5563" textAnchor="middle">{tick.value}</SvgText>
          </React.Fragment>
        ))}
        {yTicks.map((tick, i) => (
          <React.Fragment key={`ytick-${i}`}>
            <Line x1={axisLeft} y1={tick.y} x2={axisRight} y2={tick.y} stroke="#E5E7EB" strokeWidth="0.3" strokeDasharray="1 1" />
            <SvgText x={9.5} y={tick.y + 0.8} fontSize="2.7" fill="#4B5563" textAnchor="end">{tick.value}</SvgText>
          </React.Fragment>
        ))}
        <Line x1={axisLeft} y1={axisBottom} x2={axisRight} y2={axisBottom} stroke="#111827" strokeWidth="0.45" />
        <Line x1={axisLeft} y1={axisBottom} x2={axisLeft} y2={axisTop} stroke="#111827" strokeWidth="0.45" />
        <SvgText x={(axisLeft + axisRight) / 2} y={99} fontSize="3" fill="#374151" textAnchor="middle">X axis (m)</SvgText>
        <SvgText x={3.5} y={(axisTop + axisBottom) / 2} fontSize="3" fill="#374151" textAnchor="middle" transform={`rotate(-90 3.5 ${(axisTop + axisBottom) / 2})`}>Y axis (m)</SvgText>

        {elements.map((el, i) => {
          const originalPoints = el.nodes.map((nId) => toCanvasPoint(nodes[nId].x, nodes[nId].y).point);
          const deformedPoints = el.nodes.map((nId) => toCanvasPoint(deformedNodes[nId].x, deformedNodes[nId].y).point);
          const isBad = badElementIds.has(el.id ?? i);
          return (
            <React.Fragment key={el.id ?? i}>
              {visibleLayers.contour && <Polygon points={deformedPoints.join(' ')} fill={getElementContourFill(el.nodes)} opacity="0.62" stroke="none" />}
              {visibleLayers.originalMesh && <Polyline points={`${originalPoints.join(' ')} ${originalPoints[0]}`} fill="none" stroke="#111827" strokeDasharray="1.4 1.2" strokeWidth="0.5" opacity="0.75" />}
              {visibleLayers.deformedMesh && <Polyline points={`${deformedPoints.join(' ')} ${deformedPoints[0]}`} fill="none" stroke={visibleLayers.badElements && isBad ? '#DC2626' : '#1D4ED8'} strokeWidth={visibleLayers.badElements && isBad ? '1.2' : '0.7'} opacity="0.95" />}
              {visibleLayers.badElements && isBad && !visibleLayers.deformedMesh && <Polyline points={`${originalPoints.join(' ')} ${originalPoints[0]}`} fill="none" stroke="#DC2626" strokeWidth="1.2" opacity="0.95" />}
            </React.Fragment>
          );
        })}

        {visibleLayers.fixedSupports && fixedNodeIds.map((nodeId) => {
          const node = nodes[nodeId];
          if (!node) return null;
          const { sx, sy } = toCanvasPoint(node.x, node.y);
          return <Polygon key={`fixed-${nodeId}`} points={`${sx},${sy - 1.8} ${sx - 1.4},${sy + 1.5} ${sx + 1.4},${sy + 1.5}`} fill="#DC2626" />;
        })}

        {visibleLayers.loadVectors && loadMarkers.map((marker, index) => {
          const { sx, sy } = toCanvasPoint(marker.x, marker.y);
          const fx = marker.force?.[0] || 0;
          const fy = marker.force?.[1] || 0;
          const norm = Math.max(1e-9, Math.sqrt(fx * fx + fy * fy));
          return <Line key={`load-${index}`} x1={sx} y1={sy} x2={sx + (fx / norm) * 5} y2={sy - (fy / norm) * 5} stroke="#F59E0B" strokeWidth="0.8" />;
        })}
      </Svg>
    );
  };

  const maxDispText = Number(maxDisplacement.value || 0).toExponential(2);
  const contourMinText = Number(contourData.min || 0).toExponential(2);
  const contourMaxText = Number(contourData.max || 0).toExponential(2);
  const stability = Math.max(0, 100 - (quality.badElementCount || 0) * 10).toFixed(1);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 12 : 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}><Feather name="arrow-left" size={24} color="#333" /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mesh & Quality View</Text>
          <Text style={styles.headerSubtitle}>{dashboardBadge} • {algorithmLabel}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.shareIconBtn} onPress={() => setShowExportModal(true)}><Feather name="share-2" size={20} color="#374151" /></TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={() => setShowExportModal(true)}><Text style={styles.exportBtnText}>Export</Text></TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.canvasContainer}>
          <View style={styles.canvasWrapper}>
            {renderMesh()}
            {visibleLayers.contour && (
              <View style={styles.contourLegend}>
                <Text style={styles.contourLegendTitle}>Displacement Contour</Text>
                <View style={styles.contourGradientRow}>{['#DBEAFE', '#93C5FD', '#3B82F6', '#F59E0B', '#DC2626'].map((color) => <View key={color} style={[styles.contourSwatch, { backgroundColor: color }]} />)}</View>
                <View style={styles.contourLegendScale}><Text style={styles.contourLegendText}>{contourMinText}</Text><Text style={styles.contourLegendText}>{contourMaxText} m</Text></View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.layerSection}>
          <View style={styles.layerHeaderRow}>
            <View><Text style={styles.sectionTitle}>Layer Controls</Text><Text style={styles.layerSubtext}>{activeLayerCount} visualization layers active</Text></View>
            <TouchableOpacity style={styles.resetLayersBtn} onPress={() => setVisibleLayers(DEFAULT_LAYERS)}><Text style={styles.resetLayersText}>Reset</Text></TouchableOpacity>
          </View>
          {LAYER_OPTIONS.map((layer) => (
            <View key={layer.key} style={styles.layerRow}>
              <View style={styles.layerInfo}><Text style={styles.layerLabel}>{layer.label}</Text><Text style={styles.layerDescription}>{layer.description}</Text></View>
              <Switch trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }} thumbColor={visibleLayers[layer.key] ? '#1D4ED8' : '#9CA3AF'} onValueChange={() => toggleLayer(layer.key)} value={visibleLayers[layer.key]} />
            </View>
          ))}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statLabel}>Nodes</Text><Text style={styles.statValue}>{nodeCount}</Text><Text style={styles.statStable}>{geometryLabel}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>Elements</Text><Text style={styles.statValue}>{elementCount}</Text><Text style={styles.statStable}>{elementLabel}</Text></View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statLabel}>Max Displacement</Text><Text style={styles.metricValue}>{maxDispText} m</Text><Text style={styles.statStable}>Node #{maxDisplacement.nodeId}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>Processing</Text><Text style={styles.metricValue}>{metadata.processingTimeMs || 0} ms</Text><Text style={styles.statStable}>Scale {scaleFactor}x</Text></View>
        </View>

        <View style={styles.resultPanel}>
          <View style={styles.resultHeaderRow}><View><Text style={styles.sectionTitle}>Simulation Metadata</Text><Text style={styles.layerSubtext}>Solver and mesh configuration</Text></View><View style={styles.resultBadge}><Text style={styles.resultBadgeText}>{dashboardBadge}</Text></View></View>
          <View style={styles.resultGrid}>
            <InfoCell label="Geometry" value={geometryLabel} />
            <InfoCell label="Algorithm" value={algorithmLabel} />
            <InfoCell label="Element Type" value={elementLabel} />
            <InfoCell label="Mesh Setup" value={meshSummary} />
            <InfoCell label="Scale Factor" value={`${scaleFactor}x`} />
            <InfoCell label="Result Status" value={simulationResult.status || 'success'} />
          </View>
        </View>

        <View style={styles.resultPanel}>
          <View style={styles.resultHeaderRow}><View><Text style={styles.sectionTitle}>Boundary Summary</Text><Text style={styles.layerSubtext}>Support and loading conditions</Text></View><View style={styles.resultBadge}><Text style={styles.resultBadgeText}>{dashboardBadge}</Text></View></View>
          <View style={styles.resultGrid}>
            <InfoCell label="Support Type" value="Fixed left edge" />
            <InfoCell label="Fixed Nodes" value={fixedNodeIds.length} />
            <InfoCell label="Load Markers" value={loadMarkers.length} />
            <InfoCell label="Primary Load Node" value={`#${primaryLoadMarker.nodeId ?? '-'}`} />
          </View>
          <View style={styles.resultHighlightCard}><Text style={styles.resultHighlightLabel}>Primary load vector</Text><Text style={styles.resultHighlightValueSmall}>{formatForceVector(primaryLoadMarker.force)}</Text><Text style={styles.resultHighlightMeta}>Point load marker shown on the visualization canvas.</Text></View>
        </View>

        <View style={styles.resultPanel}>
          <View style={styles.resultHeaderRow}><View><Text style={styles.sectionTitle}>Displacement Result</Text><Text style={styles.layerSubtext}>Numeric post-processing summary</Text></View><View style={styles.resultBadge}><Text style={styles.resultBadgeText}>Linear Static</Text></View></View>
          <View style={styles.resultHighlightCard}><Text style={styles.resultHighlightLabel}>Maximum displacement magnitude</Text><Text style={styles.resultHighlightValue}>{maxDispText} m</Text><Text style={styles.resultHighlightMeta}>Detected at node #{maxDisplacement.nodeId}</Text></View>
          <View style={styles.resultGrid}>
            <InfoCell label="Ux" value={formatEngineeringNumber(maxDisplacement.ux, ' m')} />
            <InfoCell label="Uy" value={formatEngineeringNumber(maxDisplacement.uy, ' m')} />
            <InfoCell label="Contour Min" value={`${contourMinText} m`} />
            <InfoCell label="Contour Max" value={`${contourMaxText} m`} />
          </View>
        </View>

        <View style={styles.qualitySection}>
          <Text style={styles.sectionTitle}>Quality Check</Text>
          <View style={styles.switchRow}><View style={{ flex: 1, paddingRight: 16 }}><Text style={styles.switchLabel}>Bad element layer</Text><Text style={styles.switchDesc}>Use Layer Controls to show or hide quality warnings.</Text></View><Switch trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }} thumbColor={visibleLayers.badElements ? '#1A56DB' : '#9CA3AF'} onValueChange={() => toggleLayer('badElements')} value={visibleLayers.badElements} /></View>
          <View style={styles.stabilityRow}><Text style={styles.stabilityLabel}>Mesh Stability</Text><Text style={styles.stabilityPercent}>{stability}%</Text></View>
          <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${stability}%` }]} /></View>
          <View style={styles.qualityGrid}>
            <Text style={styles.qualityText}>Bad elements: {quality.badElementCount || 0}</Text>
            <Text style={styles.qualityText}>Min area: {Number(quality.minArea || 0).toExponential(2)} m²</Text>
            <Text style={styles.qualityText}>Max area: {Number(quality.maxArea || 0).toExponential(2)} m²</Text>
            <Text style={styles.qualityText}>Max aspect ratio: {Number(quality.maxAspectRatio || 0).toFixed(2)}</Text>
          </View>
          {visibleLayers.badElements && (quality.badElementCount || 0) > 0 && <View style={styles.warningBox}><Feather name="alert-triangle" size={20} color="#DC2626" /><View style={{ marginLeft: 12, flex: 1 }}><Text style={styles.warningTitle}>{quality.badElementCount} bad elements detected</Text><Text style={styles.warningDesc}>Review highlighted elements and consider changing mesh density.</Text></View></View>}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.navItem} onPress={onBack}><Feather name="folder" size={24} color="#9CA3AF" /><Text style={styles.navText}>Projects</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem}><Feather name="zoom-in" size={24} color="#1D4ED8" /><Text style={[styles.navText, styles.navActive]}>Inspect</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setShowExportModal(true)}><Feather name="upload" size={24} color="#9CA3AF" /><Text style={styles.navText}>Export</Text></TouchableOpacity>
      </View>

      <Modal visible={showExportModal} transparent animationType="slide" onRequestClose={() => setShowExportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Export JSON Package</Text>
            <Text style={styles.sheetSubtitle}>Full simulation package: input, output, quality, and metadata.</Text>
            <View style={styles.exportSummaryCard}>
              <Text style={styles.exportSummaryTitle}>Package Summary</Text>
              <Text style={styles.exportSummaryText}>Type: {dashboardBadge} • {algorithmLabel}</Text>
              <Text style={styles.exportSummaryText}>Nodes: {nodeCount} • Elements: {elementCount}</Text>
              <Text style={styles.exportSummaryText}>Max displacement: {maxDispText} m</Text>
              <Text style={styles.exportSummaryText}>Format: JSON exportVersion 1.1</Text>
            </View>
            <Text style={styles.jsonPreviewLabel}>Preview</Text>
            <ScrollView style={styles.jsonPreviewBox} nestedScrollEnabled><Text selectable style={styles.jsonPreviewText}>{exportJson}</Text></ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowExportModal(false)}><Text style={styles.cancelBtnText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoCell({ label, value }) {
  return (
    <View style={styles.resultCell}>
      <Text style={styles.resultCellLabel}>{label}</Text>
      <Text style={styles.resultCellValue}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  emptyCanvas: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCanvasText: { color: '#6B7280' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827', lineHeight: 20 },
  headerSubtitle: { fontSize: 11, color: '#6B7280', fontWeight: '700', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  shareIconBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 8, marginRight: 8 },
  exportBtn: { backgroundColor: '#1D4ED8', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  exportBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  canvasContainer: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  canvasWrapper: { height: 280, width: '100%', position: 'relative', backgroundColor: '#EFF6FF' },
  contourLegend: { position: 'absolute', left: 12, bottom: 12, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E5E7EB', width: 150 },
  contourLegendTitle: { color: '#111827', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  contourGradientRow: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  contourSwatch: { flex: 1 },
  contourLegendScale: { flexDirection: 'row', justifyContent: 'space-between' },
  contourLegendText: { fontSize: 9, color: '#4B5563', fontWeight: '700' },
  layerSection: { backgroundColor: '#fff', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 20, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  layerHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  layerSubtext: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 4 },
  resetLayersBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  resetLayersText: { color: '#1D4ED8', fontWeight: '800', fontSize: 12 },
  layerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  layerInfo: { flex: 1, paddingRight: 14 },
  layerLabel: { color: '#111827', fontSize: 14, fontWeight: '800', marginBottom: 3 },
  layerDescription: { color: '#6B7280', fontSize: 12, lineHeight: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  statLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },
  statStable: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  resultPanel: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 20, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  resultHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  resultBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#BFDBFE' },
  resultBadgeText: { color: '#1D4ED8', fontSize: 11, fontWeight: '800' },
  resultHighlightCard: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 14 },
  resultHighlightLabel: { color: '#6B7280', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  resultHighlightValue: { color: '#111827', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  resultHighlightValueSmall: { color: '#111827', fontSize: 16, fontWeight: '900', marginBottom: 4 },
  resultHighlightMeta: { color: '#4B5563', fontSize: 12, fontWeight: '700' },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  resultCell: { width: '48%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  resultCellLabel: { color: '#6B7280', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  resultCellValue: { color: '#111827', fontSize: 12, fontWeight: '800' },
  qualitySection: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 30, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  switchLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  switchDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  stabilityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stabilityLabel: { fontSize: 14, color: '#4B5563', fontWeight: '600' },
  stabilityPercent: { fontSize: 14, fontWeight: '800', color: '#1D4ED8' },
  progressBarBg: { height: 8, backgroundColor: '#EFF6FF', borderRadius: 4, overflow: 'hidden', marginBottom: 20 },
  progressBarFill: { height: '100%', backgroundColor: '#1D4ED8', borderRadius: 4 },
  qualityGrid: { gap: 8, marginBottom: 14 },
  qualityText: { fontSize: 13, color: '#4B5563', fontWeight: '600' },
  warningBox: { flexDirection: 'row', backgroundColor: '#FEF2F2', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' },
  warningTitle: { fontSize: 14, fontWeight: '800', color: '#991B1B', marginBottom: 4 },
  warningDesc: { fontSize: 13, color: '#DC2626' },
  bottomBar: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 12, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#E5E7EB', justifyContent: 'space-around' },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', marginTop: 4 },
  navActive: { color: '#1D4ED8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '86%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sheetSubtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 18 },
  exportSummaryCard: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, padding: 14, marginBottom: 16 },
  exportSummaryTitle: { fontSize: 14, color: '#1D4ED8', fontWeight: '800', marginBottom: 8 },
  exportSummaryText: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 4 },
  jsonPreviewLabel: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 8 },
  jsonPreviewBox: { maxHeight: 260, backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 16 },
  jsonPreviewText: { color: '#E5E7EB', fontSize: 11, lineHeight: 16, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  cancelBtn: { marginTop: 8, paddingVertical: 16, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: '#374151' },
});
