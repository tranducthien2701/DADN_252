import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Switch, Modal, Platform, StatusBar } from 'react-native';
import Svg, { Polygon, Circle, Text as SvgText, Line } from 'react-native-svg';
import Feather from 'react-native-vector-icons/Feather';

export default function MeshQualityView({ onBack, meshingData }) {
  const [highlightBad, setHighlightBad] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Get data mapped from API result
  const nodes = meshingData?.result?.nodes || [];
  const elements = meshingData?.result?.elements || [];
  const nodeCount = meshingData?.result?.nodeCount || 0;
  const elementCount = meshingData?.result?.elementCount || 0;

  const renderMockMesh = () => {
    if (!nodes.length || !elements.length) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6B7280' }}>No meshing data available.</Text>
        </View>
      );
    }

    // Lấy max X và max Y để tính scale chuẩn
    const maxX = Math.max(...nodes.map(n => n.x)) || 1;
    const maxY = Math.max(...nodes.map(n => n.y)) || 1;

    return (
      <Svg height="100%" width="100%" viewBox={`-10 -10 120 120`} preserveAspectRatio="xMidYMid meet">
        {/* Draw Quadrilateral Elements */}
        {elements.map((el, i) => {
          const p = el.nodes.map(nId => {
            const node = nodes.find(n => n.id === nId);
            const sy = ((node.y / maxY) * 100);
            const sx = ((node.x / maxX) * 100);
            return `${sx},${sy}`;
          });
          return (
            <Polygon 
              key={i} 
              points={p.join(' ')} 
              fill={highlightBad && i % 2 !== 0 ? "rgba(220, 38, 38, 0.3)" : "rgba(29, 78, 216, 0.1)"} 
              stroke={highlightBad && i % 2 !== 0 ? "#DC2626" : "#1D4ED8"} 
              strokeWidth="0.5" 
            />
          );
        })}

        {/* Draw Nodes */}
        {nodes.map((node) => {
          const sy = ((node.y / maxY) * 100);
          const sx = ((node.x / maxX) * 100);
          return (
            <React.Fragment key={node.id}>
              <Circle cx={sx} cy={sy} r="2" fill="#111827" />
              <SvgText x={sx + 3} y={sy - 3} fontSize="5" fill="#374151" fontWeight="bold">
                N{node.id}({node.x},{node.y})
              </SvgText>
            </React.Fragment>
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
            <View style={styles.badgeView}>
              <Text style={styles.badgeText}>VIEW: WIREFRAME</Text>
            </View>
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
              <Text style={styles.statIncrease}>Valid</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Elements (Quads)</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{elementCount}</Text>
              <Text style={styles.statStable}>Stable</Text>
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
  badgeView: { position: 'absolute', bottom: 16, left: 16, backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, elevation: 3, shadowColor: '#000', shadowOffset:{width:0, height:2}, shadowOpacity:0.1, shadowRadius:2 },
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