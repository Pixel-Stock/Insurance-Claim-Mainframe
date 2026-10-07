const API_BASE = 'http://localhost:3000/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export async function apiFetch(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...getHeaders(), ...options?.headers },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

export const api = {
  batches: {
    list: () => apiFetch('/batches'),
    get: (id: number) => apiFetch(`/batches/${id}`),
    upload: (formData: FormData) => 
      fetch(`${API_BASE}/batches`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      }).then(r => r.json()),
    submit: (id: number) => apiFetch(`/batches/${id}/submit`, { method: 'POST' }),
    addDemo: () => apiFetch('/batches/demo', { method: 'POST' }),
  },
  
  summary: {
    get: (batchId: number) => apiFetch(`/summary/${batchId}`),
  },
  
  jobs: {
    status: (jobId: string) => apiFetch(`/jobs/${jobId}/status`),
    log: (jobId: string) => apiFetch(`/jobs/${jobId}/log`),
  },
  
  claims: {
    list: (params: Record<string, any>) => {
      const query = new URLSearchParams(params).toString();
      return apiFetch(`/claims?${query}`);
    },
    get: (id: number) => apiFetch(`/claims/${id}`),
    action: (id: number, action: string, note?: string) =>
      apiFetch(`/claims/${id}/actions`, { method: 'POST', body: JSON.stringify({ action, note }) }),
  },
  
  rules: {
    list: () => apiFetch('/rules'),
  },

  audit: {
    list: () => apiFetch('/audit'),
  },
};
