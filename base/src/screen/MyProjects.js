import React from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, SafeAreaView, Platform, StatusBar 
} from 'react-native';

export default function MyProjects({ onNavigate }) {
  // Dữ liệu giả lập cho danh sách dự án
  const recentProjects = [
    {
      id: '1',
      name: 'Bracket Design',
      date: 'Oct 12, 2023',
      tags: ['Tetrahedral', '2.4M nodes'],
      imageColor: '#374151', 
      statusColor: '#10B981' // Xanh lá
    },
    {
      id: '2',
      name: 'Plate with Hole',
      date: 'Oct 10, 2023',
      tags: ['Hex-dominant'],
      imageColor: '#0369A1',
      statusColor: 'transparent'
    },
    {
      id: '3',
      name: 'Engine Block Segment',
      date: 'Oct 05, 2023',
      tags: ['CFD Optimized'],
      imageColor: '#6B7280',
      statusColor: 'transparent'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 12 : 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconText}>㗊</Text>
          </View>
          <Text style={styles.headerTitle}>My Projects</Text>
        </View>
        <TouchableOpacity style={styles.searchBtn}>
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* OVERVIEW CARD */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Overview</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Total Projects</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: '#10B981'}]}>4</Text>
              <Text style={styles.statLabel}>Active Meshes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, {color: '#1A56DB'}]}>2.5 TB</Text>
              <Text style={styles.statLabel}>Cloud Storage</Text>
            </View>
          </View>
        </View>

        {/* RECENT PROJECTS */}
        <Text style={styles.sectionTitle}>Recent Projects</Text>
        {recentProjects.map((project) => (
          <TouchableOpacity 
            key={project.id} 
            style={styles.projectItem}
            onPress={onNavigate} // Click vào để chuyển sang màn hình Editor
          >
            <View style={styles.projectImageContainer}>
              <View style={[styles.projectImagePlaceholder, {backgroundColor: project.imageColor}]} />
              {project.statusColor !== 'transparent' && (
                <View style={[styles.statusDot, {backgroundColor: project.statusColor}]} />
              )}
            </View>
            
            <View style={styles.projectInfo}>
              <Text style={styles.projectName}>{project.name}</Text>
              <Text style={styles.projectDate}>Created: {project.date}</Text>
              <View style={styles.tagRow}>
                {project.tags.map((tag, index) => (
                  <View key={index} style={styles.tagBadge}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            <Text style={styles.arrowIcon}>❯</Text>
          </TouchableOpacity>
        ))}
        <View style={{height: 100}} /> {/* Space for FAB and Bottom Bar */}
      </ScrollView>

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity style={styles.fab} onPress={onNavigate}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* BOTTOM NAVIGATION BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navIcon, styles.navActive]}>📁</Text>
          <Text style={[styles.navText, styles.navActive]}>Projects</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>☁️</Text>
          <Text style={styles.navText}>Cloud</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navText}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  appIcon: { width: 32, height: 32, backgroundColor: '#1A56DB', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  appIconText: { color: '#FFF', fontSize: 18 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  searchBtn: { padding: 8 },
  searchIcon: { fontSize: 20, color: '#6B7280' },

  content: { paddingHorizontal: 20 },

  // Overview Card
  overviewCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: '#F1F5F9' },
  overviewTitle: { fontSize: 14, color: '#1A56DB', fontWeight: '600', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: '#E2E8F0' },

  // Recent Projects
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  projectItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  projectImageContainer: { position: 'relative', marginRight: 16 },
  projectImagePlaceholder: { width: 56, height: 56, borderRadius: 12 },
  statusDot: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FFF' },
  
  projectInfo: { flex: 1 },
  projectName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  projectDate: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  tagText: { fontSize: 10, color: '#4B5563', fontWeight: '500' },
  
  arrowIcon: { fontSize: 16, color: '#9CA3AF', marginLeft: 10 },

  // FAB
  fab: { position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#1A56DB', justifyContent: 'center', alignItems: 'center', shadowColor: '#1A56DB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  fabIcon: { color: '#FFF', fontSize: 32, fontWeight: '300', marginTop: -4 },

  // Bottom Navigation Bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#FFF', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingBottom: 20 },
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { fontSize: 22, color: '#9CA3AF', marginBottom: 4 },
  navText: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  navActive: { color: '#1A56DB' }
});