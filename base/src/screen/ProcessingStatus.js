import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Animated, Easing, Platform, StatusBar } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { runSimulation } from '../services/feaApi';

export default function ProcessingStatus({ onBack, onFixGeometry, onComplete, meshingData }) {
  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Init...');
  const [errorTitle, setErrorTitle] = useState('Connection Failed');
  const [errorDescription, setErrorDescription] = useState(
    "Unable to reach the Meshing Python Server. Please make sure the 'uvicorn' API is running locally on port 8000."
  );
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    const processMeshAPI = async () => {
      try {
        setHasError(false);
        setErrorTitle('Connection Failed');
        setErrorDescription("Unable to reach the Meshing Python Server. Please make sure the 'uvicorn' API is running locally on port 8000.");

        setStatusMessage('Validating input...');
        setProgress(15);

        const result = await runSimulation(meshingData || {});

        setProgress(45);
        setStatusMessage('Generating mesh and assembling system...');

        await new Promise(r => setTimeout(r, 400));

        setProgress(75);
        setStatusMessage('Solving and post-processing results...');

        await new Promise(r => setTimeout(r, 400));

        setProgress(100);
        setStatusMessage('Complete!');
        setTimeout(() => onComplete(result), 700);
      } catch (error) {
        console.error('API Call error:', error);
        setErrorTitle(error.code || 'Server Unreachable');
        setErrorDescription(error.message || error.suggestedAction || 'Unable to reach the FEA backend server.');
        setStatusMessage('Simulation failed.');
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
        <View style={styles.graphicContainer}>
          <Animated.View style={[styles.outerCircle, { transform: [{ rotate: spin }] }]} />
          <View style={styles.innerCircleContainer}>
            <View style={styles.innerCircle}>
              <Feather name="box" size={32} color="#1D4ED8" />
            </View>
          </View>
        </View>

        <Text style={styles.titleText}>{progress < 100 ? 'Meshing in progress...' : 'Complete!'}</Text>
        <Text style={styles.subText}>{statusMessage || 'Running simulation pipeline...'}</Text>

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
            <Text style={styles.estimatedTime}>TARGET TIME: 3–5 SECONDS</Text>
          </View>
        </View>

        <View style={styles.pipelineCard}>
          {['Validating Input', 'Generating Mesh', 'Assembling Matrix', 'Solving System', 'Post-processing'].map((step, index) => {
            const stepProgress = [15, 35, 55, 75, 95][index];
            const isDone = progress >= stepProgress;
            return (
              <View key={step} style={styles.pipelineRow}>
                <Feather name={isDone ? 'check-circle' : 'circle'} size={16} color={isDone ? '#10B981' : '#9CA3AF'} />
                <Text style={[styles.pipelineText, isDone && styles.pipelineTextDone]}>{step}</Text>
              </View>
            );
          })}
        </View>

        {hasError && (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <Feather name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.errorTitle}>{errorTitle}</Text>
            </View>
            <Text style={styles.errorDesc}>{errorDescription}</Text>
            <View style={styles.errorActions}>
              <TouchableOpacity style={styles.retryBtn} onPress={() => { setHasError(false); setProgress(0); }}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fixBtn} onPress={onFixGeometry}>
                <Text style={styles.fixBtnText}>Edit Input</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.navItem} onPress={onBack}>
          <Feather name="folder" size={24} color="#9CA3AF" />
          <Text style={styles.navText}>PROJECTS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Feather name="more-horizontal" size={24} color="#1D4ED8" />
          <Text style={[styles.navText, styles.navActive]}>PROCESS</Text>
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
  subText: { fontSize: 14, color: '#6B7280', marginBottom: 28, textAlign: 'center' },
  progressContainer: { width: '100%', marginBottom: 18 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressLabel: { fontSize: 14, color: '#1D4ED8', fontWeight: '700' },
  progressPercent: { fontSize: 14, fontWeight: '800', color: '#111827' },
  progressBarBg: { height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, overflow: 'hidden', marginBottom: 16 },
  progressBarFill: { height: '100%', borderRadius: 5 },
  timeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  estimatedTime: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginLeft: 6 },
  pipelineCard: { width: '100%', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, marginBottom: 20 },
  pipelineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pipelineText: { marginLeft: 10, fontSize: 13, color: '#6B7280', fontWeight: '600' },
  pipelineTextDone: { color: '#111827' },
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
  navItem: { flex: 1, alignItems: 'center' },
  navText: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', marginTop: 4 },
  navActive: { color: '#1D4ED8' }
});
