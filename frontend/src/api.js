const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
}

export const api = {
  request: apiRequest,

  get(path, options = {}) {
    return apiRequest(path, { ...options, method: "GET" });
  },

  post(path, body, options = {}) {
    return apiRequest(path, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  put(path, body, options = {}) {
    return apiRequest(path, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  delete(path, options = {}) {
    return apiRequest(path, { ...options, method: "DELETE" });
  },
};
