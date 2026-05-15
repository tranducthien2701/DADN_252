export function buildSimulationExportPackage(meshingData) {
  const result = meshingData?.result || {};
  const metadata = result?.metadata || {};
  const dimensions = meshingData?.dimensions || {};
  const geometry = meshingData?.geometry || buildFallbackGeometry(meshingData);
  const material = meshingData?.material || buildFallbackMaterial(meshingData);
  const physics = meshingData?.physics || {};
  const meshConfig = meshingData?.meshConfig || buildFallbackMeshConfig(meshingData, metadata);
  const boundaryConditions = meshingData?.boundaryConditions || buildFallbackBoundaryConditions(meshingData, physics);
  const solverSettings = meshingData?.solverSettings || {
    analysisType: 'linear_static',
    scaleFactor: metadata.scaleFactor || 200,
  };

  return {
    exportVersion: '1.1',
    createdAt: new Date().toISOString(),
    project: {
      name: buildExportProjectName(meshingData, metadata),
      description: buildExportProjectDescription(metadata, meshConfig, geometry),
      lastSimulationStatus: result.status || 'unknown',
    },
    input: {
      shape: meshingData?.shape || resolveShapeName(geometry),
      dimensions,
      coordinates: meshingData?.coordinates || geometry?.polygon?.points || [],
      geometry,
      material,
      boundaryConditions,
      meshConfig,
      solverSettings,
    },
    output: result?.data || {},
    metadata: {
      ...metadata,
      source: 'Mobile-based FEA Meshing System',
      accuracyLevel: 'educational_demo',
      supportedElements: ['quad', 't3'],
      supportedAlgorithms: ['structured', 'delaunay'],
    },
  };
}

export function stringifySimulationExport(meshingData) {
  return JSON.stringify(buildSimulationExportPackage(meshingData), null, 2);
}

function resolveShapeName(geometry) {
  if (geometry?.type === 'polygon') return 'Custom Polygon';
  return 'Rectangle';
}

function buildFallbackGeometry(meshingData) {
  const dimensions = meshingData?.dimensions || {};
  const coordinates = meshingData?.coordinates || [];
  if (meshingData?.shape === 'Custom Polygon' || coordinates.length > 4) {
    return {
      type: 'polygon',
      polygon: { points: coordinates },
    };
  }
  return {
    type: 'rectangle',
    rectangle: {
      width: dimensions.width,
      height: dimensions.height,
    },
  };
}

function buildFallbackMaterial(meshingData) {
  const physics = meshingData?.physics || {};
  return {
    name: 'Custom Material',
    model: 'linear_elastic_isotropic',
    youngModulus: physics.youngModulus,
    poissonRatio: physics.poissonRatio,
    thickness: physics.thickness,
    unitSystem: 'SI',
  };
}

function buildFallbackMeshConfig(meshingData, metadata) {
  const meshingConfig = meshingData?.meshingConfig || {};
  return {
    algorithm: metadata?.algorithm || meshingConfig.algorithm || 'structured',
    elementType: metadata?.elementType || meshingConfig.elementType || 'quad',
    nx: metadata?.meshInfo?.nx ?? meshingConfig.nx,
    ny: metadata?.meshInfo?.ny ?? meshingConfig.ny,
    minAngleDeg: metadata?.meshInfo?.minAngleDeg ?? meshingConfig.minAngle,
    maxArea: metadata?.meshInfo?.maxArea ?? meshingConfig.maxArea,
  };
}

function buildFallbackBoundaryConditions(meshingData, physics) {
  const dimensions = meshingData?.dimensions || {};
  const coordinates = meshingData?.coordinates || [];
  const isPolygon = meshingData?.shape === 'Custom Polygon' || meshingData?.geometry?.type === 'polygon';
  const loadCoordinate = isPolygon
    ? coordinates[coordinates.length - 1] || [0, 0]
    : [dimensions.width, dimensions.height];

  return {
    constraints: [
      {
        type: 'fixed',
        target: 'edge',
        selector: { edge: 'left' },
        dof: ['u', 'v'],
      },
    ],
    loads: [
      {
        type: 'point_load',
        target: 'coordinate',
        coordinate: loadCoordinate,
        force: [0, -Math.abs(Number(physics.pressure || 0))],
      },
    ],
  };
}

function buildExportProjectName(meshingData, metadata) {
  const geometry = meshingData?.geometry || {};
  const dimensions = meshingData?.dimensions || {};
  const elementType = String(metadata?.elementType || meshingData?.meshConfig?.elementType || meshingData?.meshingConfig?.elementType || 'quad').toUpperCase();

  if (geometry.type === 'polygon' || meshingData?.shape === 'Custom Polygon') {
    const pointCount = geometry?.polygon?.points?.length || meshingData?.coordinates?.length || 0;
    return `Custom Polygon ${elementType} (${pointCount} points)`;
  }

  const width = dimensions?.width ?? geometry?.rectangle?.width ?? '-';
  const height = dimensions?.height ?? geometry?.rectangle?.height ?? '-';
  return `Rectangle ${width}m × ${height}m ${elementType}`;
}

function buildExportProjectDescription(metadata, meshConfig, geometry) {
  const elementType = metadata?.elementType || meshConfig?.elementType || 'quad';
  const algorithm = metadata?.algorithm || meshConfig?.algorithm || 'structured';
  const nx = metadata?.meshInfo?.nx ?? meshConfig?.nx ?? '-';
  const ny = metadata?.meshInfo?.ny ?? meshConfig?.ny ?? '-';
  const geometryType = metadata?.geometryType || geometry?.type || 'rectangle';

  if (geometryType === 'polygon') {
    return `${String(algorithm).toUpperCase()} ${String(elementType).toUpperCase()} custom polygon mesh`;
  }

  return `${String(algorithm).toUpperCase()} ${String(elementType).toUpperCase()} mesh, NX=${nx}, NY=${ny}`;
}
