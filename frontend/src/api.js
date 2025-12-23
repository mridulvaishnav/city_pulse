const API_BASE = '/api';

export async function uploadFile(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 50);
        onProgress(percent, 'Uploading...');
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error('Invalid response'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('POST', `${API_BASE}/upload`);
    xhr.send(formData);
  });
}

export async function getAllIncidents() {
  const res = await fetch(`${API_BASE}/incident/all`);
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
}

export async function getIncidentStats() {
  const res = await fetch(`${API_BASE}/incident/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function getIncidentById(id) {
  const res = await fetch(`${API_BASE}/incident/${id}`);
  if (!res.ok) throw new Error('Incident not found');
  return res.json();
}

export async function getIncidentsByStatus(status) {
  const res = await fetch(`${API_BASE}/incident/status/${status}`);
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
}
