import React, { useState, useRef } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  Alert, ScrollView, Dimensions 
} from 'react-native';
import Svg, { Polygon, Polyline, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HIT_RADIUS = 20; // Tăng radius cho thao tác chạm trên mobile

export default function App() {
  // --- STATE MANAGEMENT ---
  const [projectInfo, setProjectInfo] = useState({ id: Date.now().toString(), name: '', description: '', version: 1 });
  const [outerBoundary, setOuterBoundary] = useState([]);
  const [holes, setHoles] = useState([]);
  const [currentHole, setCurrentHole] = useState([]);
  const [mode, setMode] = useState('OUTER'); // 'OUTER', 'HOLE', 'EDIT'
  const [isOuterClosed, setIsOuterClosed] = useState(false);
  
  const [selectedPointInfo, setSelectedPointInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --- GEOMETRY MATH ALGORITHMS ---
  const isPointInPolygon = (point, polygon) => {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      let xi = polygon[i].x, yi = polygon[i].y;
      let xj = polygon[j].x, yj = polygon[j].y;
      let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // --- PROJECT ACTIONS ---
  const saveProject = async () => {
    const updatedProject = { ...projectInfo, name: projectInfo.name || 'Untitled', version: projectInfo.version + 1 };
    setProjectInfo(updatedProject);
    const dataToSave = JSON.stringify({ projectInfo: updatedProject, geometry: { outerBoundary, holes, isOuterClosed } });
    
    try {
      await AsyncStorage.setItem('meshingProject', dataToSave);
      showSuccess("Đã lưu project!");
    } catch (e) {
      setErrorMsg("Lỗi khi lưu dữ liệu.");
    }
  };

  const loadProject = async () => {
    try {
      const saved = await AsyncStorage.getItem('meshingProject');
      if (saved) {
        const data = JSON.parse(saved);
        setProjectInfo(data.projectInfo);
        setOuterBoundary(data.geometry.outerBoundary);
        setHoles(data.geometry.holes);
        setIsOuterClosed(data.geometry.isOuterClosed);
        setCurrentHole([]);
        setMode(data.geometry.isOuterClosed ? 'HOLE' : 'OUTER');
        showSuccess("Đã tải project!");
      } else {
        setErrorMsg("Không tìm thấy dữ liệu đã lưu.");
      }
    } catch (e) {
      setErrorMsg("Lỗi khi tải dữ liệu.");
    }
  };

  // --- INTERACTION LOGIC ---
  const getHitPoint = (point) => {
    const arraysToCheck = [
      { arr: outerBoundary, ref: 'outer', setter: setOuterBoundary },
      { arr: currentHole, ref: 'currentHole', setter: setCurrentHole },
      ...holes.map((h, i) => ({ arr: h, ref: `hole_${i}`, index: i }))
    ];

    for (let item of arraysToCheck) {
      for (let i = 0; i < item.arr.length; i++) {
        const p = item.arr[i];
        const dist = Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2));
        if (dist < HIT_RADIUS) return { arrayRef: item.arr, pointIndex: i, type: item.ref, holeIndex: item.index };
      }
    }
    return null;
  };

  const handleTouchStart = (e) => {
    const { locationX: x, locationY: y } = e.nativeEvent;
    const point = { x, y };
    setErrorMsg('');

    if (mode === 'EDIT') {
      const hit = getHitPoint(point);
      setSelectedPointInfo(hit);
      return;
    }

    if (mode === 'OUTER') {
      if (isOuterClosed) return setErrorMsg("Outer Boundary đã đóng.");
      setOuterBoundary([...outerBoundary, point]);
    } else if (mode === 'HOLE') {
      setCurrentHole([...currentHole, point]);
    }
  };

  const handleTouchMove = (e) => {
    if (mode === 'EDIT' && selectedPointInfo) {
      const { locationX: x, locationY: y } = e.nativeEvent;
      const { type, pointIndex, holeIndex } = selectedPointInfo;
      
      if (type === 'outer') {
        const newArr = [...outerBoundary];
        newArr[pointIndex] = { x, y };
        setOuterBoundary(newArr);
      } else if (type === 'currentHole') {
        const newArr = [...currentHole];
        newArr[pointIndex] = { x, y };
        setCurrentHole(newArr);
      } else if (type.startsWith('hole_')) {
        const newHoles = [...holes];
        newHoles[holeIndex][pointIndex] = { x, y };
        setHoles(newHoles);
      }
    }
  };

  const closeCurrentLoop = () => {
    if (mode === 'OUTER' && !isOuterClosed) {
      if (outerBoundary.length < 3) return setErrorMsg("Cần ít nhất 3 điểm.");
      setIsOuterClosed(true);
      setMode('HOLE');
    } else if (mode === 'HOLE') {
      if (currentHole.length < 3) return setErrorMsg("Lỗ cần ít nhất 3 điểm.");
      let isInside = currentHole.every(p => isPointInPolygon(p, outerBoundary));
      if (!isInside) return setErrorMsg("LỖI: Lỗ phải nằm HOÀN TOÀN bên trong Outer Boundary!");
      
      setHoles([...holes, currentHole]);
      setCurrentHole([]);
    }
    setErrorMsg('');
  };

  const clearCanvas = () => {
    setOuterBoundary([]); setHoles([]); setCurrentHole([]); 
    setIsOuterClosed(false); setMode('OUTER'); setSelectedPointInfo(null);
  };

  // --- RENDER HELPERS ---
  const formatPoints = (pointsArr) => pointsArr.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meshing App</Text>
        <Text style={styles.headerStatus}>{successMsg || `v${projectInfo.version}`}</Text>
      </View>

      <ScrollView style={styles.panel} keyboardShouldPersistTaps="handled">
        <TextInput 
          style={styles.input} placeholder="Tên Project" 
          value={projectInfo.name} onChangeText={t => setProjectInfo({...projectInfo, name: t})}
        />
        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.successBtn]} onPress={saveProject}><Text style={styles.btnText}>Lưu</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.secondaryBtn]} onPress={loadProject}><Text style={styles.btnText}>Tải</Text></TouchableOpacity>
        </View>

        <View style={styles.toolbar}>
          <TouchableOpacity style={[styles.toolBtn, mode === 'OUTER' && styles.activeTool]} onPress={() => setMode('OUTER')}>
            <Text style={styles.btnText}>1. Outer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolBtn, mode === 'HOLE' && styles.activeTool, !isOuterClosed && styles.disabledBtn]} disabled={!isOuterClosed} onPress={() => setMode('HOLE')}>
            <Text style={styles.btnText}>2. Hole</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolBtn, mode === 'EDIT' && styles.activeTool]} onPress={() => setMode('EDIT')}>
            <Text style={styles.btnText}>3. Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.successBtn]} onPress={closeCurrentLoop}><Text style={styles.btnText}>Đóng Vòng</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.dangerBtn]} onPress={clearCanvas}><Text style={styles.btnText}>Xóa Tất Cả</Text></TouchableOpacity>
        </View>
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      </ScrollView>

      {/* CANVAS AREA */}
      <View 
        style={styles.canvasContainer}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <Svg height="100%" width="100%">
          {/* Outer Boundary */}
          {isOuterClosed ? (
            <Polygon points={formatPoints(outerBoundary)} fill="rgba(0, 85, 170, 0.1)" stroke="#0055AA" strokeWidth="3" />
          ) : (
            <Polyline points={formatPoints(outerBoundary)} fill="none" stroke="#0055AA" strokeWidth="3" />
          )}
          {outerBoundary.map((p, i) => <Circle key={`o-${i}`} cx={p.x} cy={p.y} r="6" fill="#333" />)}

          {/* Completed Holes */}
          {holes.map((hole, hIndex) => (
            <React.Fragment key={`h-${hIndex}`}>
              <Polygon points={formatPoints(hole)} fill="white" stroke="#DC3545" strokeWidth="3" />
              {hole.map((p, i) => <Circle key={`hp-${hIndex}-${i}`} cx={p.x} cy={p.y} r="6" fill="#333" />)}
            </React.Fragment>
          ))}

          {/* Current Drawing Hole */}
          {currentHole.length > 0 && (
             <React.Fragment>
               <Polyline points={formatPoints(currentHole)} fill="none" stroke="#FFC107" strokeWidth="3" />
               {currentHole.map((p, i) => <Circle key={`c-${i}`} cx={p.x} cy={p.y} r="6" fill="#333" />)}
             </React.Fragment>
          )}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f6', paddingTop: 40 },
  header: { backgroundColor: '#0055AA', padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerStatus: { color: '#FFC107', fontSize: 14 },
  panel: { padding: 15, maxHeight: 250 },
  input: { backgroundColor: 'white', padding: 10, borderRadius: 5, borderWidth: 1, borderColor: '#ccc', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 10 },
  btn: { flex: 1, padding: 12, borderRadius: 6, alignItems: 'center' },
  successBtn: { backgroundColor: '#28A745' },
  secondaryBtn: { backgroundColor: '#6c757d' },
  dangerBtn: { backgroundColor: '#DC3545' },
  btnText: { color: 'white', fontWeight: 'bold' },
  toolbar: { flexDirection: 'row', gap: 5, marginBottom: 10 },
  toolBtn: { flex: 1, backgroundColor: '#0055AA', padding: 10, borderRadius: 6, alignItems: 'center' },
  activeTool: { backgroundColor: '#FFC107' },
  disabledBtn: { backgroundColor: '#cccccc' },
  canvasContainer: { flex: 1, backgroundColor: 'white', borderWidth: 2, borderColor: '#a0aec0', margin: 10, borderRadius: 8 },
  errorText: { color: '#DC3545', fontWeight: 'bold', textAlign: 'center', marginVertical: 5 }
});