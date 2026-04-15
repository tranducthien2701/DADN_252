import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Switch, Modal, Platform, StatusBar } from 'react-native';
import Svg, { Polygon, Polyline, Line, Text as SvgText } from 'react-native-svg';
import Feather from 'react-native-vector-icons/Feather';

export default function MeshQualityView({ onBack, meshingData }) {
  const [highlightBad, setHighlightBad] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  console.log('Received meshing data:', meshingData);
  // Get data mapped from API result
  const nodes = meshingData?.result?.nodes || [];
  const deformedNodes = meshingData?.result?.deformedNodes || [];
  const elements = meshingData?.result?.elements || [];
  const fixedNodeIds = meshingData?.result?.fixedNodeIds || [];
  const nodeCount = meshingData?.result?.nodeCount || 0;
  const elementCount = meshingData?.result?.elementCount || 0;
  const meshInfo = meshingData?.result?.meshInfo || {};
  const scaleFactor = meshingData?.result?.scaleFactor || 200;

  const renderMockMesh = () => {
    if (!nodes.length || !elements.length || !deformedNodes.length) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6B7280' }}>No FEA data available.</Text>
        </View>
      );
    }

    const allPoints = [...nodes, ...deformedNodes];
    const minX = Math.min(...allPoints.map(n => n.x));
    const maxX = Math.max(...allPoints.map(n => n.x));
    const minY = Math.min(...allPoints.map(n => n.y));
    const maxY = Math.max(...allPoints.map(n => n.y));
    const spanX = Math.max(1e-6, maxX - minX);
    const spanY = Math.max(1e-6, maxY - minY);
    const pad = 8;
    const axisLeft = 12;
    const axisBottom = 92;
    const axisRight = 94;
    const axisTop = 8;
    const xTickCount = 4;
    const yTickCount = 4;

    const toCanvas = (x, y) => {
      const sx = axisLeft + ((x - minX) / spanX) * (axisRight - axisLeft);
      const sy = axisBottom - ((y - minY) / spanY) * (axisBottom - axisTop);
      return `${sx},${sy}`;
    };

    const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => {
      const t = minX + (spanX * i) / xTickCount;
      const x = axisLeft + ((axisRight - axisLeft) * i) / xTickCount;
      return { value: Number(t.toFixed(2)), x };
    });
    const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => {
      const t = minY + (spanY * i) / yTickCount;
      const y = axisBottom - ((axisBottom - axisTop) * i) / yTickCount;
      return { value: Number(t.toFixed(2)), y };
    });

    return (
      <Svg height="100%" width="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {xTicks.map((tick, i) => (
          <React.Fragment key={`xtick-${i}`}>
            <Line x1={tick.x} y1={axisBottom} x2={tick.x} y2={axisTop} stroke="#E5E7EB" strokeWidth="0.3" strokeDasharray="1 1" />
            <SvgText x={tick.x} y={96.5} fontSize="2.7" fill="#4B5563" textAnchor="middle">
              {tick.value}
            </SvgText>
          </React.Fragment>
        ))}
        {yTicks.map((tick, i) => (
          <React.Fragment key={`ytick-${i}`}>
            <Line x1={axisLeft} y1={tick.y} x2={axisRight} y2={tick.y} stroke="#E5E7EB" strokeWidth="0.3" strokeDasharray="1 1" />
            <SvgText x={9.5} y={tick.y + 0.8} fontSize="2.7" fill="#4B5563" textAnchor="end">
              {tick.value}
            </SvgText>
          </React.Fragment>
        ))}

        <Line x1={axisLeft} y1={axisBottom} x2={axisRight} y2={axisBottom} stroke="#111827" strokeWidth="0.45" />
        <Line x1={axisLeft} y1={axisBottom} x2={axisLeft} y2={axisTop} stroke="#111827" strokeWidth="0.45" />
        <SvgText x={(axisLeft + axisRight) / 2} y={99} fontSize="3" fill="#374151" textAnchor="middle">
          Truc X (m)
        </SvgText>
        <SvgText x={3.5} y={(axisTop + axisBottom) / 2} fontSize="3" fill="#374151" textAnchor="middle" transform={`rotate(-90 3.5 ${(axisTop + axisBottom) / 2})`}>
          Truc Y (m)
        </SvgText>

        {elements.map((el, i) => {
          const originalPoints = el.nodes.map((nId) => {
            const node = nodes[nId];
            return toCanvas(node.x, node.y);
          });
          const deformedPoints = el.nodes.map((nId) => {
            const node = deformedNodes[nId];
            return toCanvas(node.x, node.y);
          });

          return (
            <React.Fragment key={i}>
              <Polyline
                points={`${originalPoints.join(' ')} ${originalPoints[0]}`}
                fill="none"
                stroke="#111827"
                strokeDasharray="1.4 1.2"
                strokeWidth="0.5"
                opacity="0.75"
              />
              <Polyline
                points={`${deformedPoints.join(' ')} ${deformedPoints[0]}`}
                fill="none"
                stroke={highlightBad && i % 2 !== 0 ? '#DC2626' : '#1D4ED8'}
                strokeWidth="0.7"
                opacity="0.95"
              />
            </React.Fragment>
          );
        })}

        {fixedNodeIds.map((nodeId) => {
          const node = nodes[nodeId];
          const [sx, sy] = toCanvas(node.x, node.y).split(',').map(Number);
          return (
            <Polygon
              key={`fixed-${nodeId}`}
              points={`${sx},${sy - 1.8} ${sx - 1.4},${sy + 1.5} ${sx + 1.4},${sy + 1.5}`}
              fill="#DC2626"
            />
          );
        })}
      </Svg>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 12 : 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mesh & Quality{'\n'}View</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.shareIconBtn} onPress={() => setShowExportModal(true)}>
            <Feather name="share-2" size={20} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={() => setShowExportModal(true)}>
            <Text style={styles.exportBtnText}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* CANVAS PREVIEW */}
        <View style={styles.canvasContainer}>
          <View style={styles.canvasWrapper}>
            {renderMockMesh()}
            <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.zoomBtn}>
                <Feather name="zoom-in" size={20} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomBtn}>
                <Feather name="zoom-out" size={20} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomBtn}>
                <Feather name="rotate-cw" size={20} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* STATS CARDS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Nodes</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{nodeCount}</Text>
              <Text style={styles.statIncrease}>NX={meshInfo.nx || '-'}</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Elements (Quads)</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{elementCount}</Text>
              <Text style={styles.statStable}>NY={meshInfo.ny || '-'}</Text>
            </View>
          </View>
        </View>

        {/* QUALITY CHECK */}
        <View style={styles.qualitySection}>
          <Text style={styles.sectionTitle}>Quality Check</Text>
          
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.switchLabel}>Highlight bad elements</Text>
              <Text style={styles.switchDesc}>Mark distorted or non-standard proportion surfaces</Text>
            </View>
            <Switch 
              trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }} 
              thumbColor={highlightBad ? '#1A56DB' : '#9CA3AF'} 
              onValueChange={setHighlightBad} 
              value={highlightBad} 
            />
          </View>

          <View style={styles.stabilityRow}>
            <Text style={styles.stabilityLabel}>Mesh Stability</Text>
            <Text style={styles.stabilityPercent}>94.2%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '94.2%' }]} />
          </View>

          {highlightBad && (
            <View style={styles.warningBox}>
              <Feather name="alert-triangle" size={20} color="#DC2626" style={{ marginTop: 2 }} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.warningTitle}>12 self-intersections detected</Text>
                <Text style={styles.warningDesc}>Check areas around the main axis</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* BOTTOM NAVIGATION */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.navItem} onPress={onBack}>
          <Feather name="folder" size={24} color="#9CA3AF" />
          <Text style={styles.navText}>Projects</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="edit-2" size={24} color="#9CA3AF" />
          <Text style={styles.navText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="zoom-in" size={24} color="#1D4ED8" />
          <Text style={[styles.navText, styles.navActive]}>Inspect</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setShowExportModal(true)}>
          <Feather name="upload" size={24} color="#9CA3AF" />
          <Text style={styles.navText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* EXPORT & SHARE MODAL */}
      <Modal visible={showExportModal} transparent={true} animationType="slide" onRequestClose={() => setShowExportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Export & Share</Text>
                <Text style={styles.sheetSubtitle}>Choose a format or sharing method</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.shareOptionBtn}>
              <View style={[styles.shareIconBox, { backgroundColor: '#1D4ED8' }]}>
                <Feather name="code" size={20} color="#fff" />
              </View>
              <View style={styles.shareOptionContent}>
                <Text style={styles.shareOptionTitle}>Export JSON file</Text>
                <Text style={styles.shareOptionDesc}>Lưu dữ liệu dưới dạng tệp .json cấu trúc</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareOptionBtn}>
              <View style={[styles.shareIconBox, { backgroundColor: '#1D4ED8' }]}>
                <Feather name="mail" size={20} color="#fff" />
              </View>
              <View style={styles.shareOptionContent}>
                <Text style={styles.shareOptionTitle}>Send via Email</Text>
                <Text style={styles.shareOptionDesc}>Gửi đính kèm qua hộp thư điện tử</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.shareOptionBtn}>
              <View style={[styles.shareIconBox, { backgroundColor: '#1D4ED8' }]}>
                <Feather name="message-circle" size={20} color="#fff" />
              </View>
              <View style={styles.shareOptionContent}>
                <Text style={styles.shareOptionTitle}>Share via Zalo</Text>
                <Text style={styles.shareOptionDesc}>Chia sẻ nhanh cho liên hệ trên Zalo</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowExportModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827', flex: 1, lineHeight: 20 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  shareIconBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 8, marginRight: 8 },
  exportBtn: { backgroundColor: '#1D4ED8', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  exportBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  
  canvasContainer: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  canvasWrapper: { height: 280, width: '100%', position: 'relative', backgroundColor: '#EFF6FF' },
  badgeView: { position: 'absolute', top: 12, left: 16, backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, elevation: 3, shadowColor: '#000', shadowOffset:{width:0, height:2}, shadowOpacity:0.1, shadowRadius:2 },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#4B5563', letterSpacing: 0.5 },
  zoomControls: { position: 'absolute', top: 16, right: 16, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset:{width:0, height:2}, shadowOpacity:0.1, shadowRadius:2 },
  zoomBtn: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  statLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginBottom: 8 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#111827', marginRight: 8 },
  statIncrease: { fontSize: 13, fontWeight: '700', color: '#059669' },
  statStable: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  
  qualitySection: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 30, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 16 },
  
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  switchLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  switchDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  
  stabilityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stabilityLabel: { fontSize: 14, color: '#4B5563', fontWeight: '600' },
  stabilityPercent: { fontSize: 14, fontWeight: '800', color: '#1D4ED8' },
  progressBarBg: { height: 8, backgroundColor: '#EFF6FF', borderRadius: 4, overflow: 'hidden', marginBottom: 20 },
  progressBarFill: { height: '100%', backgroundColor: '#1D4ED8', borderRadius: 4 },
  
  warningBox: { flexDirection: 'row', backgroundColor: '#FEF2F2', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' },
  warningTitle: { fontSize: 14, fontWeight: '800', color: '#991B1B', marginBottom: 4 },
  warningDesc: { fontSize: 13, color: '#DC2626' },

  bottomBar: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 12, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#E5E7EB', justifyContent: 'space-around' },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', marginTop: 4 },
  navActive: { color: '#1D4ED8' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  sheetHeader: { marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sheetSubtitle: { fontSize: 14, color: '#6B7280' },
  
  shareOptionBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 12 },
  shareIconBox: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  shareOptionContent: { flex: 1 },
  shareOptionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  shareOptionDesc: { fontSize: 13, color: '#6B7280' },
  cancelBtn: { marginTop: 24, paddingVertical: 16, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: '#374151' }
});