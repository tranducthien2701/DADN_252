import React, { useState } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import MyProjects from './src/screen/MyProjects';
import GeometryEditor from './src/screen/GeometryEditor';
import ProcessingStatus from './src/screen/ProcessingStatus';
import MeshQualityView from './src/screen/MeshQualityView';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('MY_PROJECTS');
  const [meshingData, setMeshingData] = useState(null);

  const navigateTo = (screenName, data = null) => {
    if (data) setMeshingData(data);
    setCurrentScreen(screenName);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'MY_PROJECTS':
        return <MyProjects onNavigate={() => navigateTo('GEOMETRY_EDITOR')} />;
      case 'GEOMETRY_EDITOR':
        return (
          <GeometryEditor 
            onBack={() => navigateTo('MY_PROJECTS')} 
            onNext={(data) => navigateTo('PROCESSING', data)} 
          />
        );
      case 'PROCESSING':
        return (
          <ProcessingStatus 
            onBack={() => navigateTo('MY_PROJECTS')}
            onFixGeometry={() => navigateTo('GEOMETRY_EDITOR')}
            onComplete={(result) => navigateTo('QUALITY_VIEW', { ...meshingData, result })} 
            meshingData={meshingData}
          />
        );
      case 'QUALITY_VIEW':
        return <MeshQualityView onBack={() => navigateTo('MY_PROJECTS')} meshingData={meshingData} />;
      default:
        return <MyProjects onNavigate={() => navigateTo('GEOMETRY_EDITOR')} />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      {renderScreen()}
    </SafeAreaView>
  );
}