import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Animated, Easing, Platform, StatusBar } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ProcessingStatus({ onBack, onFixGeometry, onComplete, meshingData }) {
  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Init...');
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation for the spinner
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Make Real API Call via fetch
    const processMeshAPI = async () => {
      try {
        setStatusMessage('Sending Meshing Config to Server...');
        setProgress(15);
        
        let result;
        const response = await fetch('http://10.0.2.2:8000/api/process-mesh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(meshingData || {})
        });
        
        if (!response.ok) {
          throw new Error('API Response Error');
        }
        
        result = await response.json();
        
        setProgress(70);
        setStatusMessage('Refining Meshes...');
        
        await new Promise(r => setTimeout(r, 1000));
        
        if (result.status === 'success') {
          setProgress(100);
          setStatusMessage(result.message || 'Complete!');
          // Delay briefly to show 100% completion before moving entirely
          setTimeout(() => onComplete(result), 1000);
        } else {
          setHasError(true);
        }

      } catch (error) {
        console.error("API Call error:", error);
        setStatusMessage('Server Unreachable!');
        setProgress(0);
        setHasError(true);
      }
    };

    if (!hasError && progress === 0) {
      processMeshAPI();
    }
  }, [hasError]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 12 : 12 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Processing Status</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Feather name="more-vertical" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* GRAPHIC AREA */}
        <View style={styles.graphicContainer}>
          <Animated.View style={[styles.outerCircle, { transform: [{ rotate: spin }] }]} />
          <View style={styles.innerCircleContainer}>
            <View style={styles.innerCircle}>
              <Feather name="box" size={32} color="#1D4ED8" />
            </View>
          </View>
        </View>

        {/* STATUS TEXT */}
        <Text style={styles.titleText}>{progress < 100 ? 'Meshing in progress...' : 'Complete!'}</Text>
        <Text style={styles.subText}>{statusMessage || 'Running: Generating meshes for shape design...'}</Text>

        {/* PROGRESS BAR */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Processing geometry...</Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: hasError ? '#EF4444' : '#1D4ED8' }]} />
          </View>
          <View style={styles.timeContainer}>
            <Feather name="clock" size={14} color="#6B7280" />
            <Text style={styles.estimatedTime}>ESTIMATED TIME: 2 MINS</Text>
          </View>
        </View>

        {/* ERROR CARD */}
        {hasError && (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <Feather name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.errorTitle}>Connection Failed</Text>
            </View>
            <Text style={styles.errorDesc}>
              Unable to reach the Meshing Python Server. Please make sure the 'uvicorn' API is running locally on port 8000.
            </Text>
            <View style={styles.errorActions}>
              <TouchableOpacity style={styles.retryBtn} onPress={() => { setHasError(false); setProgress(0); }}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fixBtn} onPress={onFixGeometry}>
                <Text style={styles.fixBtnText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* BOTTOM TAB BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.navItem} onPress={onBack}>
          <Feather name="folder" size={24} color="#9CA3AF" />
          <Text style={styles.navText}>PROJECTS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="more-horizontal" size={24} color="#1D4ED8" />
          <Text style={[styles.navText, styles.navActive]}>PROCESS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="database" size={24} color="#9CA3AF" />
          <Text style={styles.navText}>LIBRARY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="settings" size={24} color="#9CA3AF" />
          <Text style={styles.navText}>SETTINGS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40, alignItems: 'center' },
  graphicContainer: { position: 'relative', width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  outerCircle: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: '#3B82F6', borderStyle: 'dashed', borderDashArray: [10, 10] },
  innerCircleContainer: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width:0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, justifyContent: 'center', alignItems: 'center' },
  innerCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  
  titleText: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subText: { fontSize: 14, color: '#6B7280', marginBottom: 40, textAlign: 'center' },

  progressContainer: { width: '100%', marginBottom: 30 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressLabel: { fontSize: 14, color: '#1D4ED8', fontWeight: '700' },
  progressPercent: { fontSize: 14, fontWeight: '800', color: '#111827' },
  progressBarBg: { height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden', marginBottom: 16 },
  progressBarFill: { height: '100%', borderRadius: 5 },
  timeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  estimatedTime: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginLeft: 6 },

  errorCard: { width: '100%', backgroundColor: '#FEF2F2', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#FECACA' },
  errorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  errorTitle: { fontSize: 16, fontWeight: '800', color: '#991B1B', marginLeft: 8 },
  errorDesc: { fontSize: 14, color: '#991B1B', marginBottom: 20, lineHeight: 22 },
  errorActions: { flexDirection: 'row', gap: 12 },
  retryBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center', backgroundColor: '#fff' },
  retryBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '700' },
  fixBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#1D4ED8', alignItems: 'center', shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  fixBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },

  bottomBar: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 12, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#E5E7EB', justifyContent: 'space-around' },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', marginTop: 4 },
  navActive: { color: '#1D4ED8' }
});


// Ví dụ hàm gửi request từ JS/React Native lên Python Server
const sendDataToMeshingServer = async (fileUri) => {
  try {
    // Lưu ý: Đổi IP bên dưới thành IPv4 IPv4 của máy tính bạn (dùng lệnh ipconfig)
    // VD: http://192.168.1.5:8000/api/process-mesh
    const SERVER_URL = "http://10.0.2.2:8000/api/process-mesh"; // 10.0.2.2 là localhost đối với máy ảo Android Studio
    
    // Tạo form data chứa file cần gửi
    let formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: 'input_data.json',
      type: 'application/json' 
    });

    console.log("Đang bắt đầu gửi dữ liệu sang thuật toán Meshing...");

    // Gọi API
    const response = await fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data",
      },
      body: formData,
    });

    const result = await response.json();
    
    if (result.status === "success") {
      console.log("Tính toán xong, chất lượng lưới:", result.quality);
      // Ở đây bạn điều hướng sang màn hình MeshQualityView.js và truyền result vào
    } else {
      console.log("Lỗi tính toán:", result.message);
    }

  } catch (error) {
    console.error("Không thể kết nối đến server python:", error);
  }
};