require('dotenv').config();

const ads1x15 = require('ads1x15');

const ADS1115 = 1;
const I2C_BUS = parseInt(process.env.I2C_BUS || '1', 10);
const ADS1115_ADDRESS = parseInt(process.env.ADS1115_ADDRESS || '0x48', 16);
const CHANNEL = parseInt(process.env.PH_CHANNEL || '1', 10);
const GAIN = parseInt(process.env.PH_GAIN || '4096', 10);
const SPS = parseInt(process.env.PH_SPS || '128', 10);
const READ_INTERVAL_MS = parseInt(process.env.PH_READ_INTERVAL_MS || '1000', 10);
const SAMPLE_COUNT = parseInt(process.env.PH_SAMPLE_COUNT || '5', 10);
const SAMPLE_DELAY_MS = parseInt(process.env.PH_SAMPLE_DELAY_MS || '100', 10);
const PH_OFFSET = parseFloat(process.env.PH_CALIBRATION_OFFSET || '0');
const PH_SLOPE = parseFloat(process.env.PH_CALIBRATION_SLOPE || '1');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function calculatePH(voltage) {
  const ph = PH_SLOPE * (3.5 * voltage) + PH_OFFSET;
  return Math.max(0, Math.min(14, parseFloat(ph.toFixed(2))));
}

async function readAverageMv(adc) {
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

  return sumMv / SAMPLE_COUNT;
}

async function main() {
  const adc = new ads1x15(ADS1115, ADS1115_ADDRESS);
  await adc.openBus(I2C_BUS);

  console.log(`ADS1115 OK: address=0x${ADS1115_ADDRESS.toString(16)}, bus=${I2C_BUS}, channel=A${CHANNEL}`);

  setInterval(async () => {
    try {
      const mv = await readAverageMv(adc);

      console.log(`Average mV (${SAMPLE_COUNT} samples):`, mv.toFixed(2));
      const voltage = mv / 1000;
      const ph = calculatePH(voltage);

      console.log('Voltage:', voltage.toFixed(3), 'V');
      console.log('pH:', ph);
    } catch (err) {
      adc.busy = false;
      console.error('Lỗi đọc ADS1115:', err.message || err);
    }
  }, READ_INTERVAL_MS);
}

main().catch(console.error);
