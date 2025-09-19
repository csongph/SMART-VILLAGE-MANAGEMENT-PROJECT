// api.js
// ฟังก์ชันกลางสำหรับเรียกใช้งาน API

const API_BASE = "http://localhost:5000/api";

// ฟังก์ชัน fetch API
async function apiRequest(endpoint, method = "GET", data = null) {
  try {
    const options = {
      method,
      headers: { "Content-Type": "application/json" }
    };
    if (data) options.body = JSON.stringify(data);

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (err) {
    console.error("API Request Failed:", err);
    showNotification("เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์", "error");
    return null;
  }
}

// helper สำหรับ API method
async function apiGet(endpoint) {
  return apiRequest(endpoint, "GET");
}
async function apiPost(endpoint, data) {
  return apiRequest(endpoint, "POST", data);
}
async function apiPut(endpoint, data) {
  return apiRequest(endpoint, "PUT", data);
}
async function apiDelete(endpoint) {
  return apiRequest(endpoint, "DELETE");
}
