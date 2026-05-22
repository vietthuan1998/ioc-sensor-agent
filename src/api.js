const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const TIMEZONE = process.env.TIMEZONE || 'Asia/Ho_Chi_Minh';

// Hàm để lấy thời gian hiện tại theo định dạng ISO 8601 với múi giờ Việt Nam
function nowIso8601() {
  const now = new Date();
  const vietnamTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vietnamTime.toISOString().replace('Z', '+07:00');
}

// Hàm tạo idempotency key duy nhất cho mỗi quan sát
function makeIdempotencyKey(deviceId, parameterCode, time) {
  return `${deviceId}-${parameterCode}-${time.replace(/[^0-9]/g, '')}`;
}

async function sendObservation(deviceId, parameterCode, valueNumeric, unit) {
  const observationTime = nowIso8601();
  const payload = {
    deviceId,
    parameterCode,
    valueNumeric,
    unit,
    observationTime,
    timezone: TIMEZONE,
    idempotencyKey: makeIdempotencyKey(deviceId, parameterCode, observationTime),
    rawPayload: JSON.stringify({ source: 'raspberry-pi', deviceId, parameterCode, valueNumeric }),
  };

  const res = await axios.post(`${API_BASE_URL}/api/iotobservation/push`, payload, {
    timeout: 15000,
  });
  return res.data;
}

async function sendBatch(deviceId, observations) {
  const batchPayload = {
    deviceId,
    observations: observations.map(({ parameterCode, valueNumeric, unit }) => ({
      parameterCode,
      valueNumeric,
      unit,
      observationTime: nowIso8601(),
      timezone: TIMEZONE,
    })),
  };

  const res = await axios.post(`${API_BASE_URL}/api/iotobservation/batch`, batchPayload, {
    timeout: 15000,
  });
  return res.data;
}

module.exports = { sendObservation, sendBatch };
