// pH đọc qua ADS1115
// Công thức chuyển đổi: tùy module pH, thường là pH = slope * voltage + offset
// Cần hiệu chuẩn bằng dung dịch chuẩn pH 4.0 và pH 7.0

const Ads1x15 = require('ads1x15');

const ADS1115 = 1;
const CHANNEL = parseInt(process.env.PH_CHANNEL || '1', 10);
const GAIN = 4096; // ±4.096V
const SPS = parseInt(process.env.PH_SPS || '128', 10);
const SAMPLE_COUNT = parseInt(process.env.PH_SAMPLE_COUNT || '5', 10);
const SAMPLE_DELAY_MS = parseInt(process.env.PH_SAMPLE_DELAY_MS || '100', 10);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function readPH(address = 0x48, busNumber = 1, offset = 0.0, slope = 1.0) {
  const adc = new Ads1x15(ADS1115, address);
  await adc.openBus(busNumber);

  let sumMv = 0;
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const mv = await adc.readADCSingleEnded(CHANNEL, GAIN, SPS);
    if (!Number.isFinite(mv)) {
      throw new Error(`ADC trả về giá trị không hợp lệ: ${mv}`);
    }

    sumMv += mv;
    if (i < SAMPLE_COUNT - 1) {
      await sleep(SAMPLE_DELAY_MS);
    }
  }

  const voltage = (sumMv / SAMPLE_COUNT) / 1000;

  // Công thức tham khảo module SEN0161: pH = 3.5 * voltage + offset
  const ph = parseFloat((slope * voltage + offset).toFixed(2));

  return { ph: Math.max(0, Math.min(14, ph)) };
}

module.exports = { readPH };
