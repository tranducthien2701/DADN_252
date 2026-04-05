import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Modal, Switch, TextInput, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';

export default function GeometryEditor({ onBack, onNext }) {
  const [meshingModalVisible, setMeshingModalVisible] = useState(false);
  const [meshingLevel, setMeshingLevel] = useState('Medium');
  const [minAngle, setMinAngle] = useState('28.5');
  const [maxArea, setMaxArea] = useState('0.05');
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  // New States for Shape and physics variables
  const [isDrawingRect, setIsDrawingRect] = useState(true);
  const [isShapeCreated, setIsShapeCreated] = useState(false);
  const [rectWidth, setRectWidth] = useState('2.0');
  const [rectHeight, setRectHeight] = useState('1.0');
  const [coordinates, setCoordinates] = useState([]);
  
  const [youngModulus, setYoungModulus] = useState('20e9');
  const [poissonRatio, setPoissonRatio] = useState('0.3');
  const [thickness, setThickness] = useState('0.1');
  const [pressure, setPressure] = useState('10000');

  // Submit handled -> Go to next screen
  const handleStartMeshing = () => {
    // Thu thập toàn bộ các state thông số:
    const meshingData = {
      shape: 'Rectangle',
      dimensions: { width: parseFloat(rectWidth), height: parseFloat(rectHeight) },
      coordinates: coordinates,
      physics: {
        youngModulus: parseFloat(youngModulus),
        poissonRatio: parseFloat(poissonRatio),
        thickness: parseFloat(thickness),
        pressure: parseFloat(pressure)
      },
      meshingConfig: {
        level: meshingLevel,
        minAngle: parseFloat(minAngle),
        maxArea: parseFloat(maxArea)
      }
    };
    
    console.log("Send to API: ", meshingData);
    setMeshingModalVisible(false);
    onNext(meshingData);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 12 : 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Geometry Editor</Text>
          <Text style={styles.headerSubtitle}>STEP 2: DEFINE PROFILES</Text>
        </View>
        <TouchableOpacity style={styles.inspectButton}>
          <Feather name="check-circle" size={16} color="#333" />
          <Text style={styles.inspectText}>Inspect</Text>
        </TouchableOpacity>
      </View>

      {/* Rulers and Workspace */}
      <View style={styles.workspaceContainer}>
        {/* Top Ruler Placeholder */}
        <View style={styles.topRuler}>
          <Text style={styles.rulerText}>0</Text>
          <Text style={styles.rulerText}>100</Text>
          <Text style={styles.rulerText}>200</Text>
          <Text style={styles.rulerText}>300</Text>
        </View>
        <View style={styles.workspaceBody}>
          {/* Left Ruler Placeholder */}
          <View style={styles.leftRuler}>
            <Text style={styles.rulerTextVertical}>0</Text>
            <Text style={styles.rulerTextVertical}>100</Text>
            <Text style={styles.rulerTextVertical}>200</Text>
            <Text style={styles.rulerTextVertical}>300</Text>
            <Text style={styles.rulerTextVertical}>400</Text>
            <Text style={styles.rulerTextVertical}>500</Text>
          </View>
          
          {/* Main Drawing Area */}
          <View style={styles.drawingArea}>
            <View style={styles.canvasBoundary}>
              
              {isDrawingRect ? (
                !isShapeCreated ? (
                  <View style={styles.centerPromptBox}>
                    <MaterialCommunityIcons name="shape-rectangle-plus" size={36} color="#1D4ED8" style={{ alignSelf: 'center', marginBottom: 12 }} />
                    <Text style={styles.promptTitle}>Rectangle Dimensions</Text>
                    <Text style={styles.promptDesc}>Enter the width and height of your rectangle surface.</Text>
                    
                    <View style={styles.dimRow}>
                      <View style={styles.dimInputWrapper}>
                          <Text style={styles.dimLabel}>Width (W)</Text>
                          <View style={styles.dimInputContainer}>
                            <TextInput style={styles.dimInput} value={rectWidth} onChangeText={setRectWidth} keyboardType="numeric" />
                            <Text style={styles.dimUnit}>m</Text>
                          </View>
                      </View>
                      <View style={{width: 16}} />
                      <View style={styles.dimInputWrapper}>
                          <Text style={styles.dimLabel}>Height (H)</Text>
                          <View style={styles.dimInputContainer}>
                            <TextInput style={styles.dimInput} value={rectHeight} onChangeText={setRectHeight} keyboardType="numeric" />
                            <Text style={styles.dimUnit}>m</Text>
                          </View>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={styles.createShapeBtn} 
                      onPress={() => {
                        const w = parseFloat(rectWidth);
                        const h = parseFloat(rectHeight);
                        setCoordinates([
                          [0, 0],
                          [w, 0],
                          [w, h],
                          [0, h]
                        ]);
                        setIsShapeCreated(true);
                      }}
                    >
                      <Text style={styles.createShapeBtnText}>Create Rectangle</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.drawnShapeContainer}>
                    <View style={[styles.drawnRectangle, {
                      width: 160 * (Math.min(parseFloat(rectWidth) / parseFloat(rectHeight), 2) || 1),
                      height: 160 * (Math.min(parseFloat(rectHeight) / parseFloat(rectWidth), 2) || 1),
                    }]} />
                    <View style={styles.drawnDimensions}>
                      <Text style={styles.drawnDimText}>W: {rectWidth}m</Text>
                      <Text style={styles.drawnDimText}>H: {rectHeight}m</Text>
                    </View>
                    <View style={{ backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8, marginBottom: 16, width: '100%' }}>
                      <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: 'bold', marginBottom: 4 }}>Generated Node Coordinates:</Text>
                      <Text style={{ fontSize: 12, color: '#374151', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                        P1: (0, 0)        P2: ({rectWidth}, 0)
                      </Text>
                      <Text style={{ fontSize: 12, color: '#374151', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                        P3: ({rectWidth}, {rectHeight})    P4: (0, {rectHeight})
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.resetShapeBtn} onPress={() => setIsShapeCreated(false)}>
                      <Feather name="refresh-cw" size={14} color="#6B7280" />
                      <Text style={styles.resetShapeText}>Reset Shape</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.mainNextButton} 
                      onPress={() => setMeshingModalVisible(true)}
                    >
                      <Text style={styles.mainNextText}>Next: Physical Parameters</Text>
                      <Feather name="arrow-right" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                <View style={styles.centerPromptBox}>
                  <Ionicons name="compass-outline" size={32} color="#1D4ED8" style={{ alignSelf: 'center', marginBottom: 12 }} />
                  <Text style={styles.promptTitle}>Workspace</Text>
                  <Text style={styles.promptDesc}>Scale: 1 unit = 1mm. Select a tool from the toolbar below to start drawing your geometry.</Text>
                  <Text style={styles.coordinates}>X:  0.00    Y:  0.00</Text>
                </View>
              )}

            </View>
          </View>
        </View>
      </View>

      {/* Bottom Toolbar */}
      <View style={styles.bottomToolbar}>
        <TouchableOpacity style={styles.toolbarAction} onPress={() => setIsDrawingRect(true)}>
          <MaterialCommunityIcons name="shape-rectangle-plus" size={24} color={isDrawingRect ? "#1D4ED8" : "#666"} />
          <Text style={[styles.toolbarText, isDrawingRect && { color: '#1D4ED8', fontWeight: 'bold' }]}>Rectangle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarAction} onPress={() => setIsDrawingRect(false)}>
          <MaterialCommunityIcons name="circle-outline" size={24} color={!isDrawingRect ? "#1D4ED8" : "#666"} />
          <Text style={[styles.toolbarText, !isDrawingRect && { color: '#1D4ED8', fontWeight: 'bold' }]}>Circle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarAction}>
          <Feather name="file-plus" size={24} color="#666" />
          <Text style={styles.toolbarText}>Import Data</Text>
        </TouchableOpacity>
      </View>

      {/* Meshing Parameters Modal (Slide Up) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={meshingModalVisible}
        onRequestClose={() => setMeshingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Meshing & Physics Parameters</Text>
              <TouchableOpacity onPress={() => setMeshingModalVisible(false)}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 20 }}>
            
              {/* Physics Parameters */}
              <View style={styles.physicsSection}>
                <Text style={styles.sectionLabel}>Material & Load</Text>
                
                <View style={styles.physicsGrid}>
                  <View style={styles.physicsItem}>
                    <Text style={styles.physicsLabel}>Young's Modulus (E)</Text>
                    <View style={styles.physicsInputBox}>
                      <TextInput style={styles.physicsInput} value={youngModulus} onChangeText={setYoungModulus} keyboardType="numeric" />
                      <Text style={styles.physicsUnit}>Pa</Text>
                    </View>
                  </View>
                  <View style={styles.physicsItem}>
                    <Text style={styles.physicsLabel}>Poisson's Ratio (ν)</Text>
                    <View style={styles.physicsInputBox}>
                      <TextInput style={styles.physicsInput} value={poissonRatio} onChangeText={setPoissonRatio} keyboardType="numeric" />
                    </View>
                  </View>
                </View>

                <View style={styles.physicsGrid}>
                  <View style={styles.physicsItem}>
                    <Text style={styles.physicsLabel}>Thickness (t)</Text>
                    <View style={styles.physicsInputBox}>
                      <TextInput style={styles.physicsInput} value={thickness} onChangeText={setThickness} keyboardType="numeric" />
                      <Text style={styles.physicsUnit}>m</Text>
                    </View>
                  </View>
                  <View style={styles.physicsItem}>
                    <Text style={styles.physicsLabel}>Pressure Load (p)</Text>
                    <View style={styles.physicsInputBox}>
                      <TextInput style={styles.physicsInput} value={pressure} onChangeText={setPressure} keyboardType="numeric" />
                      <Text style={styles.physicsUnit}>N</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.levelSelector}>
                <Text style={styles.sectionLabel}>Meshing Level</Text>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity 
                    style={[styles.segment, meshingLevel === 'Coarse' && styles.segmentActive]}
                    onPress={() => setMeshingLevel('Coarse')}
                  >
                    <Text style={[styles.segmentText, meshingLevel === 'Coarse' && styles.segmentTextActive]}>Coarse</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.segment, meshingLevel === 'Medium' && styles.segmentActive]}
                    onPress={() => setMeshingLevel('Medium')}
                  >
                    <Text style={[styles.segmentText, meshingLevel === 'Medium' && styles.segmentTextActive]}>Medium</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.segment, meshingLevel === 'Fine' && styles.segmentActive]}
                    onPress={() => setMeshingLevel('Fine')}
                  >
                    <Text style={[styles.segmentText, meshingLevel === 'Fine' && styles.segmentTextActive]}>Fine</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.advancedConfig}>
                <TouchableOpacity 
                  style={styles.advancedHeader}
                  onPress={() => setAdvancedExpanded(!advancedExpanded)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="settings" size={16} color="#1D4ED8" />
                    <Text style={styles.advancedHeaderText}>Advanced Meshing Config</Text>
                  </View>
                  <Feather name={advancedExpanded ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                </TouchableOpacity>

                {advancedExpanded && (
                  <View style={styles.advancedBody}>
                    <View style={styles.inputGroup}>
                      <View style={styles.inputHeader}>
                        <Text style={styles.inputLabel}>Minimum Angle (minAngleDeg)</Text>
                        <Text style={styles.inputValueHighlight}>{minAngle}°</Text>
                      </View>
                      <View style={styles.sliderTrack}>
                        <View style={[styles.sliderFill, { width: '60%' }]} />
                        <View style={[styles.sliderThumb, { left: '60%' }]} />
                      </View>
                      <View style={styles.sliderLabels}>
                        <Text style={styles.sliderRange}>20°</Text>
                        <Text style={styles.sliderRange}>33°</Text>
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Maximum Area (maxArea)</Text>
                      <View style={styles.textInputContainer}>
                        <TextInput 
                          style={styles.textInput} 
                          value={maxArea} 
                          onChangeText={setMaxArea}
                          keyboardType="numeric"
                        />
                        <Text style={styles.unitText}>m²</Text>
                      </View>
                      <Text style={styles.helperText}>Lower values result in denser meshes but longer processing times.</Text>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.startButton} onPress={handleStartMeshing}>
              <Feather name="play-circle" size={20} color="#fff" />
              <Text style={styles.startButtonText}>Start Generation</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
    zIndex: 10,
    elevation: 3,
  },
  backButton: { marginRight: 16 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginTop: 2 },
  inspectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 10,
  },
  inspectText: { fontSize: 14, marginLeft: 6, color: '#374151', fontWeight: '500' },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  nextText: { fontSize: 14, color: '#1D4ED8', fontWeight: '600', marginRight: 4 },
  
  workspaceContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  topRuler: {
    height: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 40,
    justifyContent: 'space-between',
    paddingRight: 50,
    paddingBottom: 4,
  },
  rulerText: { fontSize: 10, color: '#9CA3AF' },
  workspaceBody: { flex: 1, flexDirection: 'row' },
  leftRuler: {
    width: 40,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    alignItems: 'flex-end',
    paddingRight: 6,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  rulerTextVertical: { fontSize: 10, color: '#9CA3AF' },
  
  drawingArea: { flex: 1, padding: 20 },
  canvasBoundary: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPromptBox: {
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    alignItems: 'center'
  },
  promptTitle: { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 },
  promptDesc: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 18, marginBottom: 24 },
  coordinates: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', fontFamily: 'monospace' },
  
  dimRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  dimInputWrapper: { flex: 1 },
  dimLabel: { fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 6 },
  dimInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, height: 44, backgroundColor: '#F9FAFB' },
  dimInput: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  dimUnit: { fontSize: 14, color: '#9CA3AF', fontWeight: '500', marginLeft: 8 },

  bottomToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingBottom: 24,
  },
  toolbarAction: { alignItems: 'center' },
  toolbarText: { fontSize: 12, color: '#6B7280', marginTop: 6, fontWeight: '500' },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    height: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  
  physicsSection: { marginBottom: 12 },
  physicsGrid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  physicsItem: { flex: 1 },
  physicsLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  physicsInputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, height: 40, backgroundColor: '#F9FAFB' },
  physicsInput: { flex: 1, fontSize: 14, color: '#111827' },
  physicsUnit: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginLeft: 4 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },

  levelSelector: { marginBottom: 24 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  segmentTextActive: { color: '#1D4ED8', fontWeight: '600' },

  advancedConfig: { marginBottom: 30 },
  advancedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  advancedHeaderText: { fontSize: 14, fontWeight: '600', color: '#111827', marginLeft: 8 },
  advancedBody: { paddingTop: 12 },
  
  inputGroup: { marginBottom: 20 },
  inputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  inputLabel: { fontSize: 14, color: '#374151', marginBottom: 8 },
  inputValueHighlight: { fontSize: 14, color: '#1D4ED8', fontWeight: '600' },
  
  sliderTrack: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, position: 'relative', marginVertical: 12 },
  sliderFill: { position: 'absolute', height: '100%', backgroundColor: '#D1D5DB', borderRadius: 2 },
  sliderThumb: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', borderWidth: 2, borderColor: '#1D4ED8', top: -8, marginLeft: -10 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderRange: { fontSize: 12, color: '#9CA3AF' },
  
  textInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12 },
  textInput: { flex: 1, height: 44, fontSize: 16, color: '#111827' },
  unitText: { fontSize: 14, color: '#6B7280' },
  helperText: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  
  startButton: { backgroundColor: '#1D4ED8', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 8, marginTop: 'auto' },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  createShapeBtn: {
    backgroundColor: '#1D4ED8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  createShapeBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  drawnShapeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  drawnRectangle: {
    borderWidth: 2,
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    marginBottom: 16,
    minHeight: 100,
    minWidth: 100,
  },
  drawnDimensions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  drawnDimText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  resetShapeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 16,
  },
  resetShapeText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  hintBox: {
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  hintText: {
    color: '#065F46',
    fontSize: 14,
    textAlign: 'center',
  },
  mainNextButton: {
    backgroundColor: '#1D4ED8',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
    width: '100%',
    justifyContent: 'center',
    gap: 8,
  },
  mainNextText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});