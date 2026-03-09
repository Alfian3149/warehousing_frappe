// src/services/frappeService.js

const BASE_URL = 'http://103.195.191.72:8000';

/**
 * Fungsi POST Reusable
 * @param {string} method - Path ke fungsi Python (misal: 'myapp.api.create_task')
 * @param {object} payload - Data yang akan dikirim
 */
export const postToFrappe = async (method, payload) => {
  const apiKey = localStorage.getItem('api_key');
  const apiSecret = localStorage.getItem('api_secret');

  try {
    const response = await fetch(`/api/method/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        //'Authorization': `token ${apiKey}:${apiSecret}`
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      // Menangani error dari Frappe (seperti 403 atau 500)
      throw new Error(result._server_messages 
        ? JSON.parse(result._server_messages)[0] 
        : 'Terjadi kesalahan pada server');
    }

    return result.message || result.data;
  } catch (error) {
    console.error(`API Error (${method}):`, error);
    throw error;
  }
};