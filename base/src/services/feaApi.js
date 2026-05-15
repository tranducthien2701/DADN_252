const DEFAULT_API_BASE_URL = 'http://10.0.2.2:8000';

export const API_BASE_URL = DEFAULT_API_BASE_URL;

export class FeaApiError extends Error {
  constructor(errorPayload) {
    const message = errorPayload?.message || 'The backend could not complete the simulation.';
    super(message);
    this.name = 'FeaApiError';
    this.code = errorPayload?.code || 'SIMULATION_FAILED';
    this.details = errorPayload?.details || {};
    this.suggestedAction = errorPayload?.suggestedAction || 'Review the input and retry.';
  }
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    throw new FeaApiError({
      code: 'INVALID_RESPONSE',
      message: 'The backend returned an invalid JSON response.',
      details: { status: response.status },
      suggestedAction: 'Check the FastAPI server logs and retry.',
    });
  }
}

export async function runSimulation(simulationRequest, options = {}) {
  const baseUrl = options.baseUrl || API_BASE_URL;

  let response;
  try {
    response = await fetch(`${baseUrl}/api/process-mesh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simulationRequest || {}),
    });
  } catch (error) {
    throw new FeaApiError({
      code: 'SERVER_UNREACHABLE',
      message: 'Unable to reach the FEA backend server.',
      details: { baseUrl, originalError: String(error?.message || error) },
      suggestedAction: 'Make sure the FastAPI server is running on port 8000.',
    });
  }

  const payload = await parseJsonResponse(response);

  if (!response.ok || payload.status === 'error') {
    throw new FeaApiError(payload.error || {
      code: 'SIMULATION_FAILED',
      message: 'The simulation request failed.',
      details: { status: response.status },
      suggestedAction: 'Review the input and retry.',
    });
  }

  return payload;
}
