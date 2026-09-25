/**
 * script.js - PranaFit Standalone Holistic Health & Pan-India Lifestyle Engine
 * Completely self-contained: works in standard VS Code, Live Server, or browser with 0 external dependencies.
 */

// --- STATE MANAGEMENT ---
const state = {
  activeTab: 'today',
  userGender: localStorage.getItem('prana_gender') || 'female',
  userRegion: localStorage.getItem('prana_region') || 'north',
  greenPoints: parseInt(localStorage.getItem('prana_points') || '420', 10),
  dailyStreak: parseInt(localStorage.getItem('prana_streak') || '14', 10),
  isVoiceActive: localStorage.getItem('prana_voice') !== 'false',
  isAudioSynthPlaying: false,
  activeSynthType: null,
  activeMicroTimer: null,
  microTimerRemaining: 0,
  sosCountdown: 10,
  sosTimerId: null,
  todayAnswers: {
    energy: 'moderate',
    soreness: 'neck_shoulders',
    sleep: '6_7',
    stress: 'work_stress',
    time: '20'
  },
  yogaTime: (() => {
    try {
      return localStorage.getItem('prana_yoga_time') || '20';
    } catch(e) { return '20'; }
  })(),
  yogaCompletedToday: (() => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      return localStorage.getItem('prana_yoga_completed_date') === todayStr;
    } catch(e) { return false; }
  })(),
  foodPlanLoggedToday: (() => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      return localStorage.getItem('prana_food_logged_date') === todayStr;
    } catch(e) { return false; }
  })(),
  completedYogaPoseIds: [],
  femaleCycle: 'follicular',
  currentUser: null,
  isAuthRemembered: false,
  userProfile: (() => {
    try {
      const saved = localStorage.getItem('prana_profile');
      return saved ? JSON.parse(saved) : { age: '', height: '', weight: '', activity: 'moderate', goal: 'energy', diet: 'veg', fastingType: 'intermittent' };
    } catch (e) {
      return { age: '', height: '', weight: '', activity: 'moderate', goal: 'energy', diet: 'veg', fastingType: 'intermittent' };
    }
  })(),
  userDiet: localStorage.getItem('prana_diet') || 'veg',
  userFastingType: localStorage.getItem('prana_fasting_type') || 'intermittent',
  vitals: {
    hr: 74,
    steps: 7340,
    calories: 460,
    hrv: 62
  },
  activeModalPose: null,
  activeModalRoutine: null,
  activeModalPoseIndex: 0,
  activeProblemPreset: 'back_pain',
  problemDuration: 'chronic',
  problemSeverity: 'moderate',
  problemTriggers: ['sitting', 'stress'],
  problemDietContext: localStorage.getItem('prana_diet') || 'veg',
  problemFastingType: localStorage.getItem('prana_fasting_type') || 'intermittent',
  lastProblemAnalysis: null,
  problemHealingLoggedToday: false
};

// --- AUDIO SYNTHESIZER (Pure Web Audio API, Zero external audio files needed) ---
class PureAudioSynth {
  constructor() {
    this.ctx = null;
    this.activeNodes = [];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  stopAll() {
    this.activeNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];
    state.isAudioSynthPlaying = false;
    state.activeSynthType = null;
    updateSynthUI();
  }

  playSuccessChime() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.6);
    });
  }

  playTimerTick() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playEmergencySiren() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.4);
    osc.frequency.linearRampToValueAtTime(440, now + 0.8);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.9);
  }

  startThetaDrone() {
    this.init();
    if (!this.ctx) return;
    this.stopAll();

    // 432 Hz healing fundamental + 438 Hz binaural beat (6 Hz theta difference)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(432, this.ctx.currentTime);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(438, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start();
    osc2.start();

    this.activeNodes.push(osc1, osc2, gain);
    state.isAudioSynthPlaying = true;
    state.activeSynthType = 'theta';
    updateSynthUI();
  }

  startRainPinkNoise() {
    this.init();
    if (!this.ctx) return;
    this.stopAll();

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start();
    this.activeNodes.push(whiteNoise, filter, gain);
    state.isAudioSynthPlaying = true;
    state.activeSynthType = 'rain';
    updateSynthUI();
  }

  playSingingBowlTone(baseFreq = 260, duration = 1.5) {
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Singing bowl acoustic profile: fundamental + overtone (~2.76x) + shimmer (~5.4x)
      const partials = [
        { mult: 1.0, gain: 0.16, decay: duration * 1.2 },
        { mult: 2.76, gain: 0.08, decay: duration * 0.9 },
        { mult: 5.40, gain: 0.03, decay: duration * 0.6 }
      ];

      partials.forEach(p => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * p.mult, now);
        osc.frequency.linearRampToValueAtTime((baseFreq * p.mult) * 0.998, now + p.decay);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(p.gain, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + p.decay + 0.1);
      });
    } catch (e) {
      console.warn('Audio tone could not play:', e);
    }
  }
}

const synth = new PureAudioSynth();

// --- VOICE COACH (Web Speech API) ---
function speakCoach(text, lang = 'en-IN') {
  if (!state.isVoiceActive) return;
  if (!window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis error:', e);
  }
}

// --- PAN-INDIA REGIONAL NUTRITION & CULTURAL DATA ---
const REGIONS_DATA = {
  north: {
    id: 'north',
    name: 'North India (Delhi/NCR, Punjab, Haryana, UP)',
    tagline: 'High-fiber slow carbs, anti-inflammatory mustard greens & sprouted lentils',
    climateHydration: 'Roasted Jeera Masala Chaas & Lemon Sattu namkeen water',
    superfoods: ['Makhana (Foxnuts)', 'Sarson & Methi Greens', 'Kala Chana', 'Chaulai (Amaranth)'],
    swaps: [
      {
        dish: 'Amritsari Chole Bhature',
        streetCal: '740 kcal (32g saturated fat, refined maida)',
        healthyName: 'Amritsari Kala Chana with Baked Sprouted Millet Kulcha',
        healthyCal: '360 kcal (22g protein, 11g fiber, 6g fat)',
        benefit: 'Replaces deep-fried maida with gut-fermented millet and antioxidant-rich black chickpeas.'
      },
      {
        dish: 'Aloo Paratha with Heavy Butter',
        streetCal: '580 kcal (excess white butter & vegetable oil)',
        healthyName: 'Sprouted Moong & Paneer Tandoori Paratha with Mint Curd',
        healthyCal: '310 kcal (19g protein, low glycemic index)',
        benefit: 'Sprouted green gram releases enzymes that flatten post-meal glucose spikes.'
      },
      {
        dish: 'Dal Makhani & Butter Naan',
        streetCal: '820 kcal (heavy hydrogenated cream & butter)',
        healthyName: 'Slow-Cooked Sabut Urad with Greek Yogurt & Garlic Tadka',
        healthyCal: '380 kcal (24g plant protein, zero heavy cream)',
        benefit: 'Delivers full creamy mouthfeel using whisked low-fat dahi and prebiotic garlic.'
      }
    ],
    recommendedDay: {
      breakfast: 'Sprouted Moong & Paneer Cheela with roasted cumin curd',
      lunch: 'Kala Chana Rassa with 2 Multi-millet rotis (Jowar-Bajra) + cucumber tomato kachumber',
      snack: 'Roasted dry-roasted Makhana seasoned with turmeric & black salt',
      dinner: 'Light Yellow Dal Tadka with steamed brown rice and stir-fried fenugreek (Methi)'
    }
  },
  west: {
    id: 'west',
    name: 'West India (Maharashtra, Gujarat, Rajasthan, Goa)',
    tagline: 'Millet-based stamina, cooling kokum elixirs & sprouted legume usals',
    climateHydration: 'Kokum Sharbat (sugar-free, high Garcinol) & Solkadhi',
    superfoods: ['Jowar & Bajra', 'Kokum', 'Sprouted Moth Beans (Matki)', 'Roasted Flaxseed (Jawas)'],
    swaps: [
      {
        dish: 'Mumbai Vada Pav',
        streetCal: '390 kcal (deep-fried besan potato dumpling, sweet chutney)',
        healthyName: 'Air-Crisped Sprouted Oats & Potato Vada with Baked Whole-Wheat Pav',
        healthyCal: '195 kcal (8g protein, 7g fiber, 3g fat)',
        benefit: 'Reduces oil absorption by 80% while raw garlic-chili peanut thecha provides monounsaturated fats.'
      },
      {
        dish: 'Misal Pav with Oily Tarri',
        streetCal: '620 kcal (fried farsan topping, palm oil floating gravy)',
        healthyName: 'Sprouted Matki Usal topped with Roasted Chana & Chopped Onions',
        healthyCal: '310 kcal (21g bioavailable plant protein)',
        benefit: 'Sprouted moth beans elevate folates and reduce lectins, supporting sustained muscle recovery.'
      },
      {
        dish: 'Rajasthani Dal Baati Churma',
        streetCal: '950 kcal (ghee-soaked wheat balls and sugared crumble)',
        healthyName: 'Baked Bajra-Oats Bafla with Panchmel Dal & 1 Tsp Desi Ghee',
        healthyCal: '440 kcal (18g protein, low GI complex millets)',
        benefit: 'Panchmel lentils furnish complete essential amino acids with low glycemic impact.'
      }
    ],
    recommendedDay: {
      breakfast: 'Steamed Sprouted Moong Dhokla with green coriander chutney',
      lunch: 'Sprouted Matki Usal with Jowar Bhakri, raw onion, and roasted flaxseed chutney',
      snack: 'Roasted Chana Jor Garam with lime and chopped tomatoes',
      dinner: 'Gujarati Khichdi made with Brown Rice, Yellow Moong, and Moringa drumsticks'
    }
  },
  south: {
    id: 'south',
    name: 'South India (Karnataka, Tamil Nadu, Telangana, Kerala, AP)',
    tagline: 'Bioavailable fermented probiotics, polyphenol curry leaves & ragi calcium',
    climateHydration: 'Neer Mor (spiced buttermilk with fresh curry leaves) & Pepper Rasam',
    superfoods: ['Ragi (Finger Millet)', 'Moringa Leaves', 'Horse Gram (Kollu)', 'Curry Leaves'],
    swaps: [
      {
        dish: 'Butter Masala Dosa & Deep-Fried Medu Vada',
        streetCal: '680 kcal (hydrogenated dalda, deep-fried urad dal batter)',
        healthyName: 'Fermented Ragi-Oats Dosa with Flaxseed-Coconut Chutney',
        healthyCal: '280 kcal (14g protein, exceptional calcium for bone density)',
        benefit: 'Fermentation enriches B-vitamins and active probiotic lactobacilli for gut health.'
      },
      {
        dish: 'Hyderabadi Mutton Dum Biryani',
        streetCal: '840 kcal (ghee layers, high saturated fat cuts)',
        healthyName: 'Soya Chunks & Brown Basmati Hyderabadi Dum Pulao with Mint Raita',
        healthyCal: '410 kcal (29g lean complete protein, high fiber)',
        benefit: 'Textured soy protein absorbs Hyderabadi aromatic spices with zero dietary cholesterol.'
      },
      {
        dish: 'White Rice Idli with Sugary Coconut Paste',
        streetCal: '420 kcal (high glycemic index polished white rice)',
        healthyName: 'Steamed Red Rice & Methi Idli with Drumstick Sambhar',
        healthyCal: '240 kcal (12g protein, high iron and antioxidants)',
        benefit: 'Red rice anthocyanins combat cardiovascular oxidative stress and regulate insulin.'
      }
    ],
    recommendedDay: {
      breakfast: 'Ragi Idli with hot Vegetable Sambhar loaded with drumsticks & tomatoes',
      lunch: 'Steamed Brown Rice with Horse Gram (Kollu) Rasam and Keerai (Spinach) Kootu',
      snack: 'Sundal (steamed seasoned chickpeas with mustard seeds & grated coconut)',
      dinner: 'Appam made with unpolished rice paired with light Vegetable Coconut Stew'
    }
  },
  east: {
    id: 'east',
    name: 'East & North-East (Bengal, Odisha, Assam, Bihar)',
    tagline: 'High-protein river fish, roasted sattu power, and gut-soothing dalma broths',
    climateHydration: 'Chilled Roasted Sattu Lemon Water with roasted cumin',
    superfoods: ['Sattu (Roasted Gram)', 'Nigella Seeds (Kalonji)', 'Raw Papaya', 'Macha (Freshwater Fish)'],
    swaps: [
      {
        dish: 'Bihari Fried Litti with Ghee Dip',
        streetCal: '690 kcal (deep-fried or dipped in melted butter fat)',
        healthyName: 'Charcoal-Baked Sattu Litti with Smoked Baingan & Tomato Chokha',
        healthyCal: '330 kcal (19g plant protein, high potassium and dietary fiber)',
        benefit: 'Roasted sattu has an ultra-low glycemic index that promotes sustained satiety.'
      },
      {
        dish: 'Rich Fish Kalia & Sugary Rosogolla',
        streetCal: '780 kcal (deep-fried fish in oily gravy with 40g sugar dessert)',
        healthyName: 'Steamed Rohu/Bhetki in Mustard & Kalonji Broth + Steamed Chenna Sandesh',
        healthyCal: '340 kcal (28g high-quality Omega-3 protein, stevia-sweetened)',
        benefit: 'Light steaming preserves vital EPA/DHA Omega-3 fatty acids for heart longevity.'
      },
      {
        dish: 'Kolkata Kathi Roll',
        streetCal: '580 kcal (maida laccha paratha fried with egg and heavy sauces)',
        healthyName: 'Whole-Wheat Paneer/Chicken Tikka Roll wrapped in an egg-white crepe',
        healthyCal: '290 kcal (25g protein, 5g fat)',
        benefit: 'Delivers authentic smoky Kolkata spices with 100% whole grains and clean lean protein.'
      }
    ],
    recommendedDay: {
      breakfast: 'Glass of savory roasted Sattu Sharbat with lemon, pink salt, and green chili',
      lunch: 'Odia Dalma (lentils simmered with raw papaya, pumpkin, potatoes) + Brown Rice',
      snack: 'Puffed Rice (Muri) with sprouted green gram, mustard oil drops, and chopped cucumber',
      dinner: 'Steamed Fish or Tofu in ginger-mustard stew with steamed seasonal vegetables'
    }
  },
  central: {
    id: 'central',
    name: 'Central India (Madhya Pradesh / Indore, Bhopal, Malwa)',
    tagline: 'Sprouted poha breakfast alchemy, anti-inflammatory amla & roasted garadu',
    climateHydration: 'Mint Jaljeera & Spiced Amla Chaas with rock salt',
    superfoods: ['Sprouted Moong', 'Amla (Indian Gooseberry)', 'Makka (Sweet Corn)', 'Garadu (Purple Yam)'],
    swaps: [
      {
        dish: 'Indori Poha & Sugar Jalebi',
        streetCal: '590 kcal (fried sev topping, deep-fried sugar-soaked jalebi)',
        healthyName: 'Steamed Poha with Sprouted Moong, Pomegranate & Roasted Peanuts',
        healthyCal: '260 kcal (14g protein, high iron and polyphenols)',
        benefit: 'Sprouted legumes provide steady amino acid delivery while pomegranate adds vitamin C to boost iron absorption.'
      },
      {
        dish: 'Bhutte Ka Kees (Street Style)',
        streetCal: '480 kcal (heavy whole milk, excess refined oil and coconut)',
        healthyName: 'Skimmed Milk & Cottage Cheese Bhutte Ka Kees with Fresh Green Chilies',
        healthyCal: '230 kcal (13g protein, zero added oil)',
        benefit: 'Sweet corn lutein protects retina health while cottage cheese maximizes leucine for muscle synthesis.'
      },
      {
        dish: 'Deep Fried Garadu with Spicy Masala',
        streetCal: '460 kcal (double deep-fried yam in re-used oil)',
        healthyName: 'Air-Baked Garadu Cubes tossed in Lemon, Pink Salt & Jeeravan Masala',
        healthyCal: '190 kcal (complex slow-burning root carbohydrate, zero trans fats)',
        benefit: 'Baking preserves resistant starch which nourishes beneficial bifidobacteria in the gut.'
      }
    ],
    recommendedDay: {
      breakfast: 'Steamed Poha fortified with Sprouted Moong and fresh lemon juice',
      lunch: 'Malwi Dal Bafla baked without oil, served with Panchkuti dal and tomato cucumber salad',
      snack: 'Roasted Makka or Boiled Chana with chopped onions and jeeravan spices',
      dinner: 'Yellow Moong Khichdi with Amla pickle and roasted papad'
    }
  }
};

// --- GEOLOCATION DETECTION ---
function detectUserLocation() {
  const badge = document.getElementById('location-badge-text');
  if (badge) badge.innerText = 'Detecting GPS...';
  showToast('Connecting to device GPS location...');

  if (!navigator.geolocation) {
    showToast('Geolocation not supported. Switched to manual region selection.');
    setRegion('north');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      let detected = 'north';

      // Heuristic coordinate bounding box for Indian zones
      if (lat > 25.5 && lon < 82.0) {
        detected = 'north'; // Delhi, Punjab, Haryana, UP, HP, J&K
      } else if (lat < 16.5) {
        detected = 'south'; // Karnataka, TN, Kerala, AP
      } else if (lon > 83.5) {
        detected = 'east'; // Bengal, Odisha, Assam, Bihar
      } else if (lat >= 16.5 && lat <= 24.5 && lon < 76.5) {
        detected = 'west'; // Maharashtra, Gujarat, Rajasthan
      } else if (lat >= 21.0 && lat <= 26.0 && lon >= 74.0 && lon <= 83.0) {
        detected = 'central'; // MP, Indore, Bhopal, Chhattisgarh
      } else {
        detected = 'north';
      }

      setRegion(detected);
      showToast(`📍 Auto-Detected Location: ${REGIONS_DATA[detected].name}!`);
    },
    error => {
      console.warn('Geolocation denied or unavailable:', error);
      showToast('GPS unavailable. You can click any region button to set your location.');
      setRegion(state.userRegion);
    },
    { timeout: 8000 }
  );
}

function setRegion(regionId) {
  if (!REGIONS_DATA[regionId]) return;
  state.userRegion = regionId;
  localStorage.setItem('prana_region', regionId);

  // Update header badge
  const badge = document.getElementById('location-badge-text');
  if (badge) {
    badge.innerText = REGIONS_DATA[regionId].name.split('(')[0].trim();
  }

  // Update buttons
  document.querySelectorAll('.region-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.region === regionId);
  });

  renderLocationNutrition();
  renderTodayDiagnostic();
}

// --- RENDER LOCATION & NUTRITION SECTION ---
function renderLocationNutrition() {
  const region = REGIONS_DATA[state.userRegion];
  if (!region) return;

  const container = document.getElementById('location-nutrition-content');
  if (!container) return;

  let html = `
    <div class="card" style="margin-bottom: 24px; border-left: 4px solid #1e40af;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
        <div>
          <span class="tag-badge tag-blue">Active Location Strategy</span>
          <h3 style="font-family: var(--font-heading); font-size: 20px; font-weight: 800; color: #0f172a;">${region.name}</h3>
          <p style="font-size: 13px; color: var(--text-muted);">${region.tagline}</p>
        </div>
        <button class="btn-secondary" onclick="detectUserLocation()">
          <span>📍 Re-Detect via GPS</span>
        </button>
      </div>

      <div class="grid-2" style="margin-top: 16px;">
        <div style="background: #f8fafc; border: 1px solid var(--border); padding: 14px; border-radius: var(--radius-md);">
          <strong style="font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Regional Hydration Remedy</strong>
          <p style="font-size: 13px; font-weight: 700; color: #0f172a;">${region.climateHydration}</p>
        </div>
        <div style="background: #f8fafc; border: 1px solid var(--border); padding: 14px; border-radius: var(--radius-md);">
          <strong style="font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Native Superfoods</strong>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px;">
            ${region.superfoods.map(item => `<span style="background: #e2e8f0; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">${item}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Street Food Re-Engineering Matrix -->
    <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 800; margin-bottom: 14px; color: #0f172a;">
      Regional Street Food Re-Engineering Matrix (${region.name.split('(')[0].trim()})
    </h3>
    <div style="margin-bottom: 24px;">
      ${region.swaps.map(swap => `
        <div class="food-compare-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="font-size: 15px; color: #0f172a;">${swap.dish}</strong>
            <span style="font-size: 11px; font-weight: 800; color: #059669; background: #ecfdf5; padding: 3px 8px; border-radius: 6px;">Clinically Re-engineered</span>
          </div>
          <div class="compare-grid">
            <div class="side-street">
              <strong style="color: #9f1239; display: block; margin-bottom: 2px;">Traditional Street / Restaurant:</strong>
              <div style="font-weight: 700; color: #be123c;">${swap.streetCal}</div>
            </div>
            <div class="side-healthy">
              <strong style="color: #047857; display: block; margin-bottom: 2px;">PranaFit Healthy Swap:</strong>
              <div style="font-weight: 800; color: #059669;">${swap.healthyName}</div>
              <div style="font-size: 11px; font-weight: 700; color: #047857; margin-top: 2px;">${swap.healthyCal}</div>
            </div>
          </div>
          <p style="font-size: 12px; color: #475569; margin-top: 8px;">💡 <em>${swap.benefit}</em></p>
        </div>
      `).join('')}
    </div>

    <!-- Personalized Daily Meal Plan -->
    <div class="card" style="background: linear-gradient(135deg, #f0fdf4, #ffffff); border: 1px solid #bbf7d0;">
      <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">
        Optimal 1-Day Regional Nutrition Blueprint
      </h3>
      <div class="grid-4">
        <div style="background: white; padding: 12px; border-radius: 10px; border: 1px solid var(--border);">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #059669;">🌅 Breakfast</span>
          <p style="font-size: 12px; font-weight: 700; color: #1e293b; margin-top: 4px;">${region.recommendedDay.breakfast}</p>
        </div>
        <div style="background: white; padding: 12px; border-radius: 10px; border: 1px solid var(--border);">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0284c7;">☀️ Lunch</span>
          <p style="font-size: 12px; font-weight: 700; color: #1e293b; margin-top: 4px;">${region.recommendedDay.lunch}</p>
        </div>
        <div style="background: white; padding: 12px; border-radius: 10px; border: 1px solid var(--border);">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #d97706;">🍵 Evening Snack</span>
          <p style="font-size: 12px; font-weight: 700; color: #1e293b; margin-top: 4px;">${region.recommendedDay.snack}</p>
        </div>
        <div style="background: white; padding: 12px; border-radius: 10px; border: 1px solid var(--border);">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #7c3aed;">🌙 Dinner</span>
          <p style="font-size: 12px; font-weight: 700; color: #1e293b; margin-top: 4px;">${region.recommendedDay.dinner}</p>
        </div>
      </div>
      <button class="btn-primary" style="margin-top: 14px;" onclick="logMealPlan()">
        <span>✓ Log Daily Cultural Nutrition (+25 Green Pts)</span>
      </button>
    </div>
  `;

  container.innerHTML = html;
}

// --- OPTIONAL HEALTH PROFILE & BIOMETRIC COMPUTATION ---
function calculateBMI(w, h) {
  if (!w || !h || w <= 0 || h <= 0) return null;
  const hMeter = h / 100;
  const bmi = parseFloat((w / (hMeter * hMeter)).toFixed(1));
  let category = 'Normal';
  let color = '#059669';
  let tagClass = 'tag-emerald';

  if (bmi < 18.5) {
    category = 'Underweight';
    color = '#d97706';
    tagClass = 'tag-amber';
  } else if (bmi <= 24.9) {
    category = 'Normal Range';
    color = '#059669';
    tagClass = 'tag-emerald';
  } else if (bmi <= 29.9) {
    category = 'Overweight';
    color = '#d97706';
    tagClass = 'tag-amber';
  } else {
    category = 'Obese Range';
    color = '#e11d48';
    tagClass = 'tag-rose';
  }

  const minHealthyWeight = parseFloat((18.5 * hMeter * hMeter).toFixed(1));
  const maxHealthyWeight = parseFloat((24.9 * hMeter * hMeter).toFixed(1));

  return { bmi, category, color, tagClass, minHealthyWeight, maxHealthyWeight };
}

function calculateBMR(w, h, age, gender) {
  if (!w || !h || !age || w <= 0 || h <= 0 || age <= 0) return null;
  let bmr = 10 * w + 6.25 * h - 5 * age;
  if (gender === 'male') {
    bmr += 5;
  } else if (gender === 'female') {
    bmr -= 161;
  } else {
    bmr -= 78;
  }
  return Math.round(bmr);
}

function calculateTDEE(bmr, activity) {
  if (!bmr) return null;
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725
  };
  const mult = multipliers[activity] || 1.55;
  return Math.round(bmr * mult);
}

function cmToFtIn(cm) {
  if (!cm || cm <= 0) return '-- ft -- in';
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet} ft ${inches} in`;
}

function updateProfileBadge() {
  const badge = document.getElementById('header-profile-badge');
  const badgeText = document.getElementById('profile-badge-text');
  if (!badge || !badgeText) return;

  const { age, height, weight } = state.userProfile;
  const numW = parseFloat(weight);
  const numH = parseFloat(height);

  if (age || height || weight) {
    badge.classList.add('has-data');
    let parts = [];
    if (age) parts.push(`${age}y`);
    if (numW) parts.push(`${numW}kg`);
    if (numW && numH) {
      const bmiData = calculateBMI(numW, numH);
      if (bmiData) parts.push(`BMI ${bmiData.bmi}`);
    }
    badgeText.innerText = parts.length > 0 ? parts.join(' • ') : 'Vitals Active';
  } else {
    badge.classList.remove('has-data');
    badgeText.innerText = 'Profile (Optional)';
  }
}

function populateProfileForms() {
  const p = state.userProfile;
  
  // Inline inputs
  const inAge = document.getElementById('profile-age');
  const inH = document.getElementById('profile-height');
  const inW = document.getElementById('profile-weight');
  const inAct = document.getElementById('profile-activity');
  const inGoal = document.getElementById('profile-goal');
  const ftPrev = document.getElementById('height-ft-preview');

  if (inAge) inAge.value = p.age || '';
  if (inH) inH.value = p.height || '';
  if (inW) inW.value = p.weight || '';
  if (inAct) inAct.value = p.activity || 'moderate';
  if (inGoal) inGoal.value = p.goal || 'energy';
  if (ftPrev) ftPrev.innerText = p.height ? cmToFtIn(parseFloat(p.height)) : '-- ft -- in';

  const inDiet = document.getElementById('profile-diet');
  const inFast = document.getElementById('profile-fasting-type');
  const inFastGrp = document.getElementById('profile-fasting-group');
  if (inDiet) inDiet.value = p.diet || state.userDiet || 'veg';
  if (inFast) inFast.value = p.fastingType || state.userFastingType || 'intermittent';
  if (inFastGrp) inFastGrp.style.display = (inDiet && inDiet.value === 'fasting') ? 'block' : 'none';

  // Modal inputs
  const mAge = document.getElementById('modal-age');
  const mH = document.getElementById('modal-height');
  const mW = document.getElementById('modal-weight');
  const mAct = document.getElementById('modal-activity');
  const mGoal = document.getElementById('modal-goal');
  const mFtPrev = document.getElementById('modal-height-ft-preview');

  if (mAge) mAge.value = p.age || '';
  if (mH) mH.value = p.height || '';
  if (mW) mW.value = p.weight || '';
  if (mAct) mAct.value = p.activity || 'moderate';
  if (mGoal) mGoal.value = p.goal || 'energy';
  if (mFtPrev) mFtPrev.innerText = p.height ? cmToFtIn(parseFloat(p.height)) : '-- ft -- in';

  const mDiet = document.getElementById('modal-diet');
  const mFast = document.getElementById('modal-fasting-type');
  const mFastGrp = document.getElementById('modal-fasting-group');
  if (mDiet) mDiet.value = p.diet || state.userDiet || 'veg';
  if (mFast) mFast.value = p.fastingType || state.userFastingType || 'intermittent';
  if (mFastGrp) mFastGrp.style.display = (mDiet && mDiet.value === 'fasting') ? 'block' : 'none';

  renderLiveMetricTiles('profile-live-metrics', p.weight, p.height, p.age, p.activity, p.goal);
  renderLiveMetricTiles('modal-live-metrics', p.weight, p.height, p.age, p.activity, p.goal);
  syncHealerDietUI();
}

function getFastingLabel(type) {
  switch (type) {
    case 'vrat_ekadashi': return 'Sacred Vrat / Ekadashi (Phalahari)';
    case 'navratri_phalahar': return 'Fruit Fast (Alkaline Phalahar)';
    case 'water_detox': return 'Liquid & Water Detox';
    case 'intermittent':
    default:
      return '16:8 Intermittent Fasting';
  }
}

function setDiet(dietType, fastingType = null) {
  state.userDiet = dietType || 'veg';
  if (fastingType) {
    state.userFastingType = fastingType;
    localStorage.setItem('prana_fasting_type', fastingType);
  }
  localStorage.setItem('prana_diet', state.userDiet);
  state.userProfile.diet = state.userDiet;
  state.userProfile.fastingType = state.userFastingType;
  try {
    localStorage.setItem('prana_profile', JSON.stringify(state.userProfile));
  } catch (e) {}

  // Sync inputs
  const inDiet = document.getElementById('profile-diet');
  const inFast = document.getElementById('profile-fasting-type');
  const inFastGrp = document.getElementById('profile-fasting-group');
  if (inDiet) inDiet.value = state.userDiet;
  if (inFast) inFast.value = state.userFastingType;
  if (inFastGrp) inFastGrp.style.display = state.userDiet === 'fasting' ? 'block' : 'none';

  const mDiet = document.getElementById('modal-diet');
  const mFast = document.getElementById('modal-fasting-type');
  const mFastGrp = document.getElementById('modal-fasting-group');
  if (mDiet) mDiet.value = state.userDiet;
  if (mFast) mFast.value = state.userFastingType;
  if (mFastGrp) mFastGrp.style.display = state.userDiet === 'fasting' ? 'block' : 'none';

  syncHealerDietUI();
  renderDailyFoodPlan();
  renderLocationNutrition();

  if (state.lastProblemAnalysis) {
    renderProblemHealingProtocol(state.lastProblemAnalysis);
  }

  const dietLabels = {
    veg: 'Vegetarian (Plant-rich, Dals & Dairy)',
    nonveg: 'Non-Vegetarian (Lean Poultry, Fish & Eggs)',
    vegan: '100% Plant-Based Vegan (Dairy-Free)',
    fasting: `Fasting / Vrat Mode (${getFastingLabel(state.userFastingType)})`
  };
  showToast(`🥗 Dietary protocol set to ${dietLabels[state.userDiet] || state.userDiet}. Plans recalibrated!`);
}

function syncHealerDietUI() {
  const currentDiet = state.problemDietContext || state.userDiet || 'veg';
  const currentFasting = state.problemFastingType || state.userFastingType || 'intermittent';

  const badge = document.getElementById('healer-diet-badge');
  if (badge) {
    const dietLabels = {
      veg: 'Active: Vegetarian',
      nonveg: 'Active: Non-Vegetarian',
      vegan: 'Active: 100% Plant-Based Vegan',
      fasting: `Active: Fasting (${getFastingLabel(currentFasting)})`
    };
    badge.innerText = dietLabels[currentDiet] || `Active: ${currentDiet}`;
  }

  const chips = document.querySelectorAll('#healer-diet-chips .diet-tab-btn');
  chips.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diet === currentDiet);
  });

  const fastContainer = document.getElementById('healer-fasting-subtypes');
  if (fastContainer) {
    fastContainer.style.display = currentDiet === 'fasting' ? 'flex' : 'none';
  }

  const fastBtns = document.querySelectorAll('#healer-fasting-subtypes .fasting-subtype-btn');
  fastBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.fasting === currentFasting);
  });
}

function setHealerDiet(diet) {
  state.problemDietContext = diet;
  syncHealerDietUI();

  if (state.lastProblemAnalysis) {
    state.lastProblemAnalysis.activeDiet = diet;
    renderProblemHealingProtocol(state.lastProblemAnalysis);
  }

  const dietLabels = {
    veg: 'Vegetarian healing foods',
    nonveg: 'Non-Vegetarian lean broths & fish proteins',
    vegan: '100% Plant-based anti-inflammatory foods',
    fasting: `Fasting-compatible remedies (${getFastingLabel(state.problemFastingType || state.userFastingType)})`
  };
  showToast(`🥗 Healer prescription updated for: ${dietLabels[diet] || diet}`);
}

function setHealerFastingType(fastingType) {
  state.problemFastingType = fastingType;
  syncHealerDietUI();

  if (state.lastProblemAnalysis) {
    state.lastProblemAnalysis.activeFastingType = fastingType;
    renderProblemHealingProtocol(state.lastProblemAnalysis);
  }
  showToast(`🪔 Fasting protocol set to: ${getFastingLabel(fastingType)}`);
}

function setProblemDuration(duration) {
  state.problemDuration = duration;
  document.querySelectorAll('#problem-duration-chips .context-chip-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.duration === duration);
  });
  if (state.lastProblemAnalysis) {
    state.lastProblemAnalysis.duration = duration;
    renderProblemHealingProtocol(state.lastProblemAnalysis);
  }
}

function setProblemSeverity(severity) {
  state.problemSeverity = severity;
  document.querySelectorAll('#problem-severity-chips .context-chip-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.severity === severity);
  });
  if (state.lastProblemAnalysis) {
    state.lastProblemAnalysis.severity = severity;
    renderProblemHealingProtocol(state.lastProblemAnalysis);
  }
}

function toggleProblemTrigger(triggerKey) {
  if (!state.problemTriggers) state.problemTriggers = [];
  const idx = state.problemTriggers.indexOf(triggerKey);
  if (idx !== -1) {
    state.problemTriggers.splice(idx, 1);
  } else {
    state.problemTriggers.push(triggerKey);
  }
  document.querySelectorAll('#problem-trigger-chips .context-chip-btn').forEach(btn => {
    btn.classList.toggle('active', state.problemTriggers.includes(btn.dataset.trigger));
  });
  if (state.lastProblemAnalysis) {
    state.lastProblemAnalysis.activeTriggers = [...state.problemTriggers];
    renderProblemHealingProtocol(state.lastProblemAnalysis);
  }
}

function onProfileDietChanged(source) {
  const select = source === 'inline' ? document.getElementById('profile-diet') : document.getElementById('modal-diet');
  const diet = select ? select.value : 'veg';
  setDiet(diet);
}

function onProfileFastingTypeChanged(source) {
  const select = source === 'inline' ? document.getElementById('profile-fasting-type') : document.getElementById('modal-fasting-type');
  const fastingType = select ? select.value : 'intermittent';
  setDiet('fasting', fastingType);
}

function onProfileInputChanged(source) {
  let age, height, weight, activity, goal;

  if (source === 'inline') {
    age = document.getElementById('profile-age')?.value || '';
    height = document.getElementById('profile-height')?.value || '';
    weight = document.getElementById('profile-weight')?.value || '';
    activity = document.getElementById('profile-activity')?.value || 'moderate';
    goal = document.getElementById('profile-goal')?.value || 'energy';

    // sync to modal
    const mAge = document.getElementById('modal-age');
    const mH = document.getElementById('modal-height');
    const mW = document.getElementById('modal-weight');
    const mAct = document.getElementById('modal-activity');
    const mGoal = document.getElementById('modal-goal');
    if (mAge) mAge.value = age;
    if (mH) mH.value = height;
    if (mW) mW.value = weight;
    if (mAct) mAct.value = activity;
    if (mGoal) mGoal.value = goal;
  } else {
    age = document.getElementById('modal-age')?.value || '';
    height = document.getElementById('modal-height')?.value || '';
    weight = document.getElementById('modal-weight')?.value || '';
    activity = document.getElementById('modal-activity')?.value || 'moderate';
    goal = document.getElementById('modal-goal')?.value || 'energy';

    // sync to inline
    const inAge = document.getElementById('profile-age');
    const inH = document.getElementById('profile-height');
    const inW = document.getElementById('profile-weight');
    const inAct = document.getElementById('profile-activity');
    const inGoal = document.getElementById('profile-goal');
    if (inAge) inAge.value = age;
    if (inH) inH.value = height;
    if (inW) inW.value = weight;
    if (inAct) inAct.value = activity;
    if (inGoal) inGoal.value = goal;
  }

  // Update height previews
  const ftStr = height ? cmToFtIn(parseFloat(height)) : '-- ft -- in';
  const ftPrev = document.getElementById('height-ft-preview');
  const mFtPrev = document.getElementById('modal-height-ft-preview');
  if (ftPrev) ftPrev.innerText = ftStr;
  if (mFtPrev) mFtPrev.innerText = ftStr;

  renderLiveMetricTiles('profile-live-metrics', weight, height, age, activity, goal);
  renderLiveMetricTiles('modal-live-metrics', weight, height, age, activity, goal);
}

function renderLiveMetricTiles(containerId, weight, height, age, activity, goal) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const w = parseFloat(weight);
  const h = parseFloat(height);
  const a = parseInt(age, 10);

  if (!w && !h && !a) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'grid';

  const bmiData = (w && h) ? calculateBMI(w, h) : null;
  const bmr = (w && h && a) ? calculateBMR(w, h, a, state.userGender) : null;
  const tdee = bmr ? calculateTDEE(bmr, activity || 'moderate') : null;
  const hydration = w ? (w * 0.035).toFixed(1) : null;
  const proteinMin = w ? Math.round(w * 1.2) : null;
  const proteinMax = w ? Math.round(w * 1.6) : null;

  let tiles = '';

  if (bmiData) {
    tiles += `
      <div class="metric-tile" style="border-top: 3px solid ${bmiData.color};">
        <span class="metric-tile-label">Body Mass Index</span>
        <div class="metric-tile-val" style="color: ${bmiData.color};">${bmiData.bmi}</div>
        <div class="metric-tile-sub">${bmiData.category}</div>
      </div>
    `;
  }

  if (hydration) {
    tiles += `
      <div class="metric-tile" style="border-top: 3px solid #0284c7;">
        <span class="metric-tile-label">💧 Daily Water</span>
        <div class="metric-tile-val">${hydration} L</div>
        <div class="metric-tile-sub">35ml / kg body wt</div>
      </div>
    `;
  }

  if (bmr) {
    tiles += `
      <div class="metric-tile" style="border-top: 3px solid #7c3aed;">
        <span class="metric-tile-label">🔥 Basal Burn (BMR)</span>
        <div class="metric-tile-val">${bmr} kcal</div>
        <div class="metric-tile-sub">Resting expenditure</div>
      </div>
    `;
  }

  if (tdee) {
    tiles += `
      <div class="metric-tile" style="border-top: 3px solid #d97706;">
        <span class="metric-tile-label">⚡ Daily TDEE</span>
        <div class="metric-tile-val">~${tdee} kcal</div>
        <div class="metric-tile-sub">Maintenance calories</div>
      </div>
    `;
  }

  if (proteinMin && proteinMax) {
    tiles += `
      <div class="metric-tile" style="border-top: 3px solid #059669;">
        <span class="metric-tile-label">🥩 Protein Target</span>
        <div class="metric-tile-val">${proteinMin}–${proteinMax}g</div>
        <div class="metric-tile-sub">Daily recovery baseline</div>
      </div>
    `;
  }

  container.innerHTML = tiles;
}

function saveProfileFromUI(source) {
  let age, height, weight, activity, goal, diet, fastingType;

  if (source === 'inline') {
    age = document.getElementById('profile-age')?.value.trim() || '';
    height = document.getElementById('profile-height')?.value.trim() || '';
    weight = document.getElementById('profile-weight')?.value.trim() || '';
    activity = document.getElementById('profile-activity')?.value || 'moderate';
    goal = document.getElementById('profile-goal')?.value || 'energy';
    diet = document.getElementById('profile-diet')?.value || 'veg';
    fastingType = document.getElementById('profile-fasting-type')?.value || 'intermittent';
  } else {
    age = document.getElementById('modal-age')?.value.trim() || '';
    height = document.getElementById('modal-height')?.value.trim() || '';
    weight = document.getElementById('modal-weight')?.value.trim() || '';
    activity = document.getElementById('modal-activity')?.value || 'moderate';
    goal = document.getElementById('modal-goal')?.value || 'energy';
    diet = document.getElementById('modal-diet')?.value || 'veg';
    fastingType = document.getElementById('modal-fasting-type')?.value || 'intermittent';
  }

  const wasEmpty = !state.userProfile.age && !state.userProfile.height && !state.userProfile.weight;

  state.userDiet = diet;
  state.userFastingType = fastingType;
  localStorage.setItem('prana_diet', diet);
  localStorage.setItem('prana_fasting_type', fastingType);

  state.userProfile = { age, height, weight, activity, goal, diet, fastingType };
  localStorage.setItem('prana_profile', JSON.stringify(state.userProfile));

  if (state.currentUser) {
    state.currentUser.profile = { ...state.userProfile };
    updateUserInDB(state.currentUser);
  }

  if (wasEmpty && (age || height || weight)) {
    addGreenPoints(20);
    synth.playSuccessChime();
    showToast('🎉 Vitals logged! +20 Green Points awarded for calibrating your health.');
  } else {
    synth.playSuccessChime();
    showToast('✓ Health vitals successfully updated!');
  }

  updateProfileBadge();
  populateProfileForms();
  renderTodayDiagnostic();
  renderDashboardProfile();

  const statusMsg = document.getElementById('profile-status-message');
  if (statusMsg) {
    statusMsg.innerText = '✓ Vitals saved to browser storage!';
    statusMsg.style.color = '#059669';
    setTimeout(() => {
      statusMsg.innerText = 'Data is stored securely in your browser\'s local storage.';
      statusMsg.style.color = 'var(--text-muted)';
    }, 4000);
  }

  if (source === 'modal') {
    setTimeout(closeProfileModal, 400);
  }
}

function clearProfileData() {
  state.userProfile = { age: '', height: '', weight: '', activity: 'moderate', goal: 'energy' };
  localStorage.removeItem('prana_profile');

  populateProfileForms();
  updateProfileBadge();
  renderTodayDiagnostic();
  renderDashboardProfile();

  showToast('Optional vitals cleared. Caloric metrics reset to universal baseline.');
}

function openProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) {
    populateProfileForms();
    modal.classList.add('open');
  }
}

function closeProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) {
    modal.classList.remove('open');
  }
}

function toggleProfileCardCollapse() {
  const wrapper = document.getElementById('profile-fields-wrapper');
  const indicator = document.getElementById('profile-collapse-indicator');
  if (!wrapper || !indicator) return;

  if (wrapper.style.display === 'none') {
    wrapper.style.display = 'block';
    indicator.innerText = 'Collapse Form';
  } else {
    wrapper.style.display = 'none';
    indicator.innerText = 'Expand Form';
  }
}

function renderDashboardProfile() {
  const container = document.getElementById('dashboard-biometrics-card');
  if (!container) return;

  const { age, height, weight, activity, goal } = state.userProfile;
  const numW = parseFloat(weight);
  const numH = parseFloat(height);
  const numA = parseInt(age, 10);

  if (!numW && !numH && !numA) {
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="tag-badge tag-indigo">Physical Vitals & Body Metrics</span>
          <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px;">
            Optional Health Profile (Age, Height, Weight)
          </h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
            Not compulsory — enter your metrics anytime to see your personalized Body Mass Index (BMI), Basal Metabolic Rate, and water intake.
          </p>
        </div>
        <button class="btn-primary" onclick="openProfileModal()">
          <span>+ Add Optional Vitals (+20 Pts)</span>
        </button>
      </div>
    `;
    return;
  }

  const bmiData = (numW && numH) ? calculateBMI(numW, numH) : null;
  const bmr = (numW && numH && numA) ? calculateBMR(numW, numH, numA, state.userGender) : null;
  const tdee = bmr ? calculateTDEE(bmr, activity) : null;
  const hydration = numW ? (numW * 0.035).toFixed(1) : null;
  const proteinMin = numW ? Math.round(numW * 1.2) : null;
  const proteinMax = numW ? Math.round(numW * 1.6) : null;

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
      <div>
        <span class="tag-badge tag-emerald">Biometrics Active</span>
        <h3 style="font-family: var(--font-heading); font-size: 19px; font-weight: 800; color: #0f172a; margin-top: 4px;">
          Your Physical Biometrics & Metabolic Profile
        </h3>
        <p style="font-size: 12px; color: var(--text-muted);">
          Age: ${age || '--'} yrs • Height: ${height ? height + ' cm (' + cmToFtIn(numH) + ')' : '--'} • Weight: ${weight ? weight + ' kg' : '--'}
        </p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn-secondary" onclick="openProfileModal()">
          <span>✏️ Edit Profile</span>
        </button>
        <button class="btn-secondary" onclick="clearProfileData()">
          <span>Clear</span>
        </button>
      </div>
    </div>

    <div class="grid-4">
      <div style="background: #f8fafc; border: 1px solid var(--border); padding: 14px; border-radius: var(--radius-md);">
        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #059669;">⚖️ Body Mass Index</span>
        <div style="font-family: var(--font-heading); font-size: 22px; font-weight: 800; color: ${bmiData ? bmiData.color : '#0f172a'}; margin-top: 4px;">
          ${bmiData ? bmiData.bmi : '--'}
        </div>
        <span style="font-size: 11px; color: var(--text-muted);">${bmiData ? bmiData.category : 'Needs height & weight'}</span>
      </div>

      <div style="background: #f8fafc; border: 1px solid var(--border); padding: 14px; border-radius: var(--radius-md);">
        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0284c7;">💧 Daily Water Need</span>
        <div style="font-family: var(--font-heading); font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px;">
          ${hydration ? hydration + ' L' : '--'}
        </div>
        <span style="font-size: 11px; color: var(--text-muted);">35ml per kg body wt</span>
      </div>

      <div style="background: #f8fafc; border: 1px solid var(--border); padding: 14px; border-radius: var(--radius-md);">
        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #7c3aed;">🔥 Basal Rate (BMR)</span>
        <div style="font-family: var(--font-heading); font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px;">
          ${bmr ? bmr + ' kcal' : '--'}
        </div>
        <span style="font-size: 11px; color: var(--text-muted);">Resting cellular expenditure</span>
      </div>

      <div style="background: #f8fafc; border: 1px solid var(--border); padding: 14px; border-radius: var(--radius-md);">
        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #d97706;">⚡ Daily TDEE Burn</span>
        <div style="font-family: var(--font-heading); font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px;">
          ${tdee ? '~' + tdee + ' kcal' : '--'}
        </div>
        <span style="font-size: 11px; color: var(--text-muted);">Maintenance energy</span>
      </div>
    </div>

    ${bmiData ? `
      <div style="margin-top: 14px; padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-md); font-size: 12px; color: #166534;">
        🌿 <strong>Healthy weight range for your height (${height} cm):</strong> ${bmiData.minHealthyWeight} kg – ${bmiData.maxHealthyWeight} kg. Protein baseline: ${proteinMin}–${proteinMax}g / day.
      </div>
    ` : ''}
  `;
}

// --- USER AUTHENTICATION & SESSION PERSISTENCE (LOGIN / SIGN UP / REMEMBER ME) ---
const DEFAULT_USERS_SEED = [
  {
    id: 'user_aarav',
    name: 'Aarav Sharma',
    email: 'aarav@pranafit.in',
    password: 'password123',
    gender: 'male',
    region: 'north',
    profile: {
      age: '27',
      height: '175',
      weight: '72',
      activity: 'moderate',
      goal: 'energy'
    },
    greenPoints: 480,
    dailyStreak: 14,
    createdAt: '2026-08-10'
  }
];

function getUsersDB() {
  try {
    const raw = localStorage.getItem('prana_users');
    if (!raw) {
      localStorage.setItem('prana_users', JSON.stringify(DEFAULT_USERS_SEED));
      return [...DEFAULT_USERS_SEED];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem('prana_users', JSON.stringify(DEFAULT_USERS_SEED));
      return [...DEFAULT_USERS_SEED];
    }
    return parsed;
  } catch (e) {
    return [...DEFAULT_USERS_SEED];
  }
}

function saveUsersDB(users) {
  try {
    localStorage.setItem('prana_users', JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users database', e);
  }
}

function updateUserInDB(user) {
  const users = getUsersDB();
  const idx = users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...user };
    saveUsersDB(users);
  }
}

function initAuthSystem() {
  const users = getUsersDB();

  // Check 1: LocalStorage session (Remembered / Persistent)
  let session = null;
  let isFromLocalStorage = false;

  try {
    const localRaw = localStorage.getItem('prana_auth_session');
    if (localRaw) {
      session = JSON.parse(localRaw);
      isFromLocalStorage = true;
    }
  } catch (e) {}

  // Check 2: SessionStorage session (Temporary browser-session only)
  if (!session) {
    try {
      const sessionRaw = sessionStorage.getItem('prana_auth_session');
      if (sessionRaw) {
        session = JSON.parse(sessionRaw);
        isFromLocalStorage = false;
      }
    } catch (e) {}
  }

  if (session && session.email) {
    const matchedUser = users.find(u => 
      u.email.toLowerCase() === session.email.toLowerCase() || 
      u.id === session.userId
    );

    if (matchedUser) {
      state.currentUser = matchedUser;
      state.isAuthRemembered = isFromLocalStorage || !!session.remembered;

      // Sync user profile & data
      if (matchedUser.profile && (matchedUser.profile.age || matchedUser.profile.height || matchedUser.profile.weight)) {
        state.userProfile = { ...matchedUser.profile };
        localStorage.setItem('prana_profile', JSON.stringify(state.userProfile));
      }
      if (matchedUser.gender) {
        state.userGender = matchedUser.gender;
        localStorage.setItem('prana_gender', state.userGender);
      }
      if (matchedUser.greenPoints) {
        state.greenPoints = matchedUser.greenPoints;
        localStorage.setItem('prana_points', state.greenPoints.toString());
      }
      if (matchedUser.dailyStreak) {
        state.dailyStreak = matchedUser.dailyStreak;
        localStorage.setItem('prana_streak', state.dailyStreak.toString());
      }
    }
  }

  updateAuthHeaderBadge();
  updateAuthModalUI();
}

function updateAuthHeaderBadge() {
  const badge = document.getElementById('header-auth-badge');
  const icon = document.getElementById('auth-badge-icon');
  const text = document.getElementById('auth-badge-text');
  if (!badge || !text) return;

  if (state.currentUser) {
    badge.classList.add('is-logged-in');
    const firstName = state.currentUser.name.split(' ')[0] || 'User';
    if (icon) icon.innerHTML = '<span class="user-status-dot"></span>';
    text.innerHTML = `<span>${firstName}</span> <span style="font-size: 10px; color: ${state.isAuthRemembered ? '#15803d' : '#64748b'}; font-weight: 600;">(${state.isAuthRemembered ? 'Auto-Logged In' : 'Session'})</span>`;
    badge.title = `Signed in as ${state.currentUser.name} (${state.isAuthRemembered ? 'Auto-login active: No need to log in again' : 'Session active'}). Click to manage account.`;
  } else {
    badge.classList.remove('is-logged-in');
    if (icon) icon.innerText = '🔑';
    text.innerText = 'Sign In / Sign Up';
    badge.title = 'Sign in or create account with Remember Me persistence';
  }
}

function updateAuthModalUI() {
  const navTabs = document.getElementById('auth-nav-tabs');
  const signinPane = document.getElementById('auth-signin-pane');
  const signupPane = document.getElementById('auth-signup-pane');
  const profilePane = document.getElementById('auth-profile-pane');
  const modalTitle = document.getElementById('auth-modal-title');
  const modalSubtitle = document.getElementById('auth-modal-subtitle');
  const modalIcon = document.getElementById('auth-modal-header-icon');

  if (!signinPane || !signupPane || !profilePane) return;

  if (state.currentUser) {
    if (navTabs) navTabs.style.display = 'none';
    signinPane.style.display = 'none';
    signupPane.style.display = 'none';
    profilePane.style.display = 'block';

    if (modalTitle) modalTitle.innerText = 'My PranaFit Account';
    if (modalSubtitle) modalSubtitle.innerText = 'Manage your login credentials, persistence & biometrics';
    if (modalIcon) modalIcon.innerText = '👤';

    // Populate profile details
    const nameEl = document.getElementById('auth-profile-name');
    const emailEl = document.getElementById('auth-profile-email');
    const avatarEl = document.getElementById('auth-user-avatar-text');
    const pointsEl = document.getElementById('auth-profile-points');
    const streakEl = document.getElementById('auth-profile-streak');
    const vitalsEl = document.getElementById('auth-profile-vitals-status');

    if (nameEl) nameEl.innerText = state.currentUser.name;
    if (emailEl) emailEl.innerText = state.currentUser.email;
    if (avatarEl) {
      const initials = state.currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'PF';
      avatarEl.innerText = initials;
    }
    if (pointsEl) pointsEl.innerText = state.greenPoints.toString();
    if (streakEl) streakEl.innerText = `${state.dailyStreak} Days`;
    if (vitalsEl) {
      const hasVitals = state.userProfile.age || state.userProfile.weight || state.userProfile.height;
      vitalsEl.innerText = hasVitals ? 'Calibrated' : 'Pending';
      vitalsEl.style.color = hasVitals ? '#059669' : '#d97706';
    }

    // Remember Me toggle status in account modal
    const rememberStatusEl = document.getElementById('auth-device-remember-status');
    const rememberSubEl = document.getElementById('auth-device-remember-sub');
    const btnToggleRemember = document.getElementById('btn-toggle-remember-active');

    if (rememberStatusEl && rememberSubEl && btnToggleRemember) {
      if (state.isAuthRemembered) {
        rememberStatusEl.innerHTML = '🟢 Auto-Login Active (Remembered)';
        rememberStatusEl.style.color = '#15803d';
        rememberSubEl.innerText = 'You will not need to log in again on this device. Your session is preserved.';
        btnToggleRemember.innerText = 'Switch to Session-Only';
      } else {
        rememberStatusEl.innerHTML = '⚪ Session-Only (Not Remembered)';
        rememberStatusEl.style.color = '#475569';
        rememberSubEl.innerText = 'You will be asked to sign in again when this browser session is closed.';
        btnToggleRemember.innerText = 'Turn ON Remember Me';
      }
    }
  } else {
    if (navTabs) navTabs.style.display = 'flex';
    profilePane.style.display = 'none';

    if (modalTitle) modalTitle.innerText = 'PranaFit Account';
    if (modalSubtitle) modalSubtitle.innerText = 'Sign in or create your profile to sync your health journey';
    if (modalIcon) modalIcon.innerText = '🔐';
  }
}

function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  updateAuthModalUI();

  if (!state.currentUser) {
    switchAuthTab('signin');
  }

  modal.classList.add('open');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.remove('open');
  }
}

function switchAuthTab(tab) {
  const btnSignin = document.getElementById('tab-btn-signin');
  const btnSignup = document.getElementById('tab-btn-signup');
  const paneSignin = document.getElementById('auth-signin-pane');
  const paneSignup = document.getElementById('auth-signup-pane');
  const paneProfile = document.getElementById('auth-profile-pane');
  const navTabs = document.getElementById('auth-nav-tabs');

  if (tab === 'signin') {
    if (btnSignin) btnSignin.classList.add('active');
    if (btnSignup) btnSignup.classList.remove('active');
    if (paneSignin) paneSignin.style.display = 'block';
    if (paneSignup) paneSignup.style.display = 'none';
    if (paneProfile) paneProfile.style.display = 'none';
    if (navTabs) navTabs.style.display = 'flex';
  } else if (tab === 'signup') {
    if (btnSignin) btnSignin.classList.remove('active');
    if (btnSignup) btnSignup.classList.add('active');
    if (paneSignin) paneSignin.style.display = 'none';
    if (paneSignup) paneSignup.style.display = 'block';
    if (paneProfile) paneProfile.style.display = 'none';
    if (navTabs) navTabs.style.display = 'flex';
  } else if (tab === 'profile') {
    if (paneSignin) paneSignin.style.display = 'none';
    if (paneSignup) paneSignup.style.display = 'none';
    if (paneProfile) paneProfile.style.display = 'block';
    if (navTabs) navTabs.style.display = 'none';
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input || !btn) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerText = '🙈';
    btn.title = 'Hide password';
  } else {
    input.type = 'password';
    btn.innerText = '👁️';
    btn.title = 'Show password';
  }
}

function quickFillDemoLogin() {
  const emailInput = document.getElementById('signin-email');
  const passInput = document.getElementById('signin-password');
  const remInput = document.getElementById('signin-remember');
  if (emailInput) emailInput.value = 'aarav@pranafit.in';
  if (passInput) passInput.value = 'password123';
  if (remInput) remInput.checked = true;

  handleAuthSignIn(new Event('submit'));
}

function handleAuthSignIn(e) {
  if (e && e.preventDefault) e.preventDefault();

  const emailInput = document.getElementById('signin-email');
  const passInput = document.getElementById('signin-password');
  const rememberInput = document.getElementById('signin-remember');

  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  const pass = passInput ? passInput.value.trim() : '';
  const remember = rememberInput ? rememberInput.checked : true;

  if (!email || !pass) {
    showToast('⚠️ Please enter both email/username and password.');
    return;
  }

  const users = getUsersDB();
  const matchedUser = users.find(u => 
    (u.email.toLowerCase() === email || u.name.toLowerCase() === email) && 
    u.password === pass
  );

  if (!matchedUser) {
    showToast('❌ Invalid credentials. Try demo: aarav@pranafit.in / password123');
    return;
  }

  // Set current user & persistence flag
  state.currentUser = matchedUser;
  state.isAuthRemembered = remember;

  // Session persistence based on user's Remember Me choice
  const sessionData = {
    userId: matchedUser.id,
    email: matchedUser.email,
    name: matchedUser.name,
    remembered: remember,
    loginTime: Date.now()
  };

  if (remember) {
    localStorage.setItem('prana_auth_session', JSON.stringify(sessionData));
    sessionStorage.removeItem('prana_auth_session');
  } else {
    sessionStorage.setItem('prana_auth_session', JSON.stringify(sessionData));
    localStorage.removeItem('prana_auth_session');
  }

  // Restore user vitals and points
  if (matchedUser.profile) {
    state.userProfile = { ...matchedUser.profile };
    localStorage.setItem('prana_profile', JSON.stringify(state.userProfile));
  }
  if (matchedUser.greenPoints) {
    state.greenPoints = matchedUser.greenPoints;
    localStorage.setItem('prana_points', state.greenPoints.toString());
  }

  synth.playSuccessChime();
  updatePointsUI();
  populateProfileForms();
  updateProfileBadge();
  updateAuthHeaderBadge();
  renderTodayDiagnostic();
  renderDashboardProfile();

  const remText = remember 
    ? 'Auto-login active: you won\'t need to log in again.' 
    : 'Session active for this browser window.';
  showToast(`🎉 Welcome back, ${matchedUser.name}! ${remText}`);

  closeAuthModal();
}

function handleAuthSignUp(e) {
  if (e && e.preventDefault) e.preventDefault();

  const nameInput = document.getElementById('signup-name');
  const emailInput = document.getElementById('signup-email');
  const passInput = document.getElementById('signup-password');
  const ageInput = document.getElementById('signup-age');
  const heightInput = document.getElementById('signup-height');
  const weightInput = document.getElementById('signup-weight');
  const rememberInput = document.getElementById('signup-remember');

  const name = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  const pass = passInput ? passInput.value.trim() : '';
  const age = ageInput ? ageInput.value.trim() : '';
  const height = heightInput ? heightInput.value.trim() : '';
  const weight = weightInput ? weightInput.value.trim() : '';
  const remember = rememberInput ? rememberInput.checked : true;

  if (!name || !email || !pass) {
    showToast('⚠️ Please provide your name, email, and password.');
    return;
  }

  if (pass.length < 4) {
    showToast('⚠️ Password must be at least 4 characters long.');
    return;
  }

  const users = getUsersDB();
  const existing = users.find(u => u.email.toLowerCase() === email);
  if (existing) {
    showToast('⚠️ An account with this email already exists. Please Sign In.');
    switchAuthTab('signin');
    return;
  }

  const newUser = {
    id: 'user_' + Date.now(),
    name: name,
    email: email,
    password: pass,
    gender: state.userGender || 'female',
    region: state.userRegion || 'north',
    profile: {
      age: age || state.userProfile.age || '',
      height: height || state.userProfile.height || '',
      weight: weight || state.userProfile.weight || '',
      activity: state.userProfile.activity || 'moderate',
      goal: state.userProfile.goal || 'energy'
    },
    greenPoints: state.greenPoints + 50, // +50 bonus sign-up points!
    dailyStreak: 1,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsersDB(users);

  // Set current user
  state.currentUser = newUser;
  state.isAuthRemembered = remember;
  state.greenPoints = newUser.greenPoints;
  state.userProfile = { ...newUser.profile };

  localStorage.setItem('prana_points', state.greenPoints.toString());
  localStorage.setItem('prana_profile', JSON.stringify(state.userProfile));

  // Persistence
  const sessionData = {
    userId: newUser.id,
    email: newUser.email,
    name: newUser.name,
    remembered: remember,
    loginTime: Date.now()
  };

  if (remember) {
    localStorage.setItem('prana_auth_session', JSON.stringify(sessionData));
    sessionStorage.removeItem('prana_auth_session');
  } else {
    sessionStorage.setItem('prana_auth_session', JSON.stringify(sessionData));
    localStorage.removeItem('prana_auth_session');
  }

  synth.playSuccessChime();
  updatePointsUI();
  populateProfileForms();
  updateProfileBadge();
  updateAuthHeaderBadge();
  renderTodayDiagnostic();
  renderDashboardProfile();

  showToast(`✨ Welcome to PranaFit, ${name}! +50 Bonus Green Points added to your account.`);
  closeAuthModal();
}

function toggleActiveUserRememberStatus() {
  if (!state.currentUser) return;

  state.isAuthRemembered = !state.isAuthRemembered;

  const sessionData = {
    userId: state.currentUser.id,
    email: state.currentUser.email,
    name: state.currentUser.name,
    remembered: state.isAuthRemembered,
    loginTime: Date.now()
  };

  if (state.isAuthRemembered) {
    localStorage.setItem('prana_auth_session', JSON.stringify(sessionData));
    sessionStorage.removeItem('prana_auth_session');
    showToast('✓ Auto-Login enabled! You will not need to log in again when you return.');
  } else {
    sessionStorage.setItem('prana_auth_session', JSON.stringify(sessionData));
    localStorage.removeItem('prana_auth_session');
    showToast('ℹ️ Auto-Login turned off. You will be asked to sign in next time.');
  }

  updateAuthHeaderBadge();
  updateAuthModalUI();
}

function handleAuthLogout() {
  localStorage.removeItem('prana_auth_session');
  sessionStorage.removeItem('prana_auth_session');

  const previousName = state.currentUser ? state.currentUser.name.split(' ')[0] : 'User';
  state.currentUser = null;
  state.isAuthRemembered = false;

  updateAuthHeaderBadge();
  updateAuthModalUI();
  closeAuthModal();

  showToast(`👋 Signed out successfully. See you next time, ${previousName}!`);
}

// Global window exposure for inline event handlers
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.togglePasswordVisibility = togglePasswordVisibility;
window.quickFillDemoLogin = quickFillDemoLogin;
window.handleAuthSignIn = handleAuthSignIn;
window.handleAuthSignUp = handleAuthSignUp;
window.toggleActiveUserRememberStatus = toggleActiveUserRememberStatus;
window.handleAuthLogout = handleAuthLogout;

// --- TODAY DIAGNOSTIC COMPUTATION ---
function renderTodayDiagnostic() {
  const container = document.getElementById('today-prescription-output');
  if (!container) return;

  const { energy, soreness, sleep, stress, time } = state.todayAnswers;
  const region = REGIONS_DATA[state.userRegion];

  let workoutTitle = '';
  let workoutDetails = '';
  let intensity = '';

  if (energy === 'low' || sleep === 'less_5') {
    workoutTitle = 'Gentle Restorative Yin Mobility & Parasympathetic Breathwork';
    workoutDetails = '4 rounds of Cat-Cow spinal waves, 90-second Child’s Pose, and 4-7-8 diaphragmatic breathing to lower elevated cortisol without depleting adrenal glands.';
    intensity = 'Low Impact (Recovery)';
  } else if (soreness === 'neck_shoulders') {
    workoutTitle = 'Tech-Neck Thoracic Spine Decompression & Wall Angels';
    workoutDetails = 'Wall angels, chin tucks, seated thoracic rotations, and scapular wall slides designed specifically for desk fatigue and forward head posture.';
    intensity = 'Targeted Physical Therapy';
  } else if (stress === 'work_stress') {
    workoutTitle = 'Kinetic Stress-Relief Cardio Burst & Dynamic Isometric Holds';
    workoutDetails = 'High-velocity shadow boxing, mountain climbers, and isometric hollow body holds to trigger rapid endorphin release and clear mental fatigue.';
    intensity = 'Moderate High Energy';
  } else {
    workoutTitle = 'Functional Full-Body Kettlebell / Bodyweight Compound Circuit';
    workoutDetails = 'Goblet squats, push-up progressions, reverse lunges, and plank walkouts calibrated for your available time window.';
    intensity = 'Optimal Performance';
  }

  const mealSuggestion = region ? region.recommendedDay.lunch : 'Sprouted Moong and multi-millet khichdi with roasted cumin curd';
  const baseHydration = region ? region.climateHydration : 'Spiced buttermilk with fresh mint and pink salt';

  // Check personal biometrics
  const { age, height, weight, activity } = state.userProfile;
  const numW = parseFloat(weight);
  const numH = parseFloat(height);
  const numA = parseInt(age, 10);
  const hasVitals = numW || numH || numA;

  let vitalsCalibrationHtml = '';
  let personalHydrationText = `${baseHydration}. Complete 500ml before starting movement.`;

  if (hasVitals) {
    const bmiData = (numW && numH) ? calculateBMI(numW, numH) : null;
    const bmr = (numW && numH && numA) ? calculateBMR(numW, numH, numA, state.userGender) : null;
    const tdee = bmr ? calculateTDEE(bmr, activity || 'moderate') : null;
    const hydrationLiters = numW ? (numW * 0.035).toFixed(1) : null;
    const proteinMin = numW ? Math.round(numW * 1.2) : null;
    const proteinMax = numW ? Math.round(numW * 1.6) : null;

    if (hydrationLiters) {
      personalHydrationText = `${baseHydration}. Your calibrated daily hydration target is ${hydrationLiters} Liters (${numW} kg × 35 ml). Complete 500ml before your session.`;
    }

    vitalsCalibrationHtml = `
      <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <span style="font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase;">⚡ Personalized Bio-Metrics Calibration</span>
            <p style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">
              ${numA ? numA + ' yrs' : ''} ${numW ? '• ' + numW + ' kg' : ''} ${numH ? '• ' + numH + ' cm (' + cmToFtIn(numH) + ')' : ''}
              ${bmiData ? `• BMI: <span style="color:${bmiData.color}; font-weight:800;">${bmiData.bmi} (${bmiData.category})</span>` : ''}
            </p>
          </div>
          <button class="btn-secondary" onclick="openProfileModal()" style="padding: 4px 10px; font-size: 11px;">
            <span>Edit Vitals</span>
          </button>
        </div>
        <div style="display: flex; gap: 14px; flex-wrap: wrap; margin-top: 8px; font-size: 12px; color: #1e293b;">
          ${hydrationLiters ? `<span>💧 <strong>Water Target:</strong> ${hydrationLiters} Liters/day</span>` : ''}
          ${tdee ? `<span>🔥 <strong>Maintenance Energy:</strong> ~${tdee} kcal/day (BMR: ${bmr})</span>` : ''}
          ${proteinMin ? `<span>🥩 <strong>Target Protein:</strong> ${proteinMin}–${proteinMax}g / day</span>` : ''}
        </div>
      </div>
    `;
  } else {
    vitalsCalibrationHtml = `
      <div style="background: #faf5ff; border: 1px dashed #d8b4fe; border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <span style="font-size: 12px; color: #6b21a8;">
          💡 <em>Optional:</em> Want tailored water liters, daily calorie burn, and BMI calculated for your body? You can add your age, height, and weight above anytime.
        </span>
        <button class="btn-secondary" onclick="openProfileModal()" style="padding: 4px 8px; font-size: 11px;">
          <span>+ Add Vitals</span>
        </button>
      </div>
    `;
  }

  const authBannerHtml = state.currentUser ? `
    <div style="display: flex; justify-content: space-between; align-items: center; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 16px; font-size: 12px; flex-wrap: wrap; gap: 8px;">
      <div>
        <strong style="color: #1e3a8a;">👋 Welcome back, ${state.currentUser.name}!</strong> 
        <span style="color: #2563eb; margin-left: 6px;">• ${state.isAuthRemembered ? '✓ Auto-login active (Remembered on this device)' : 'Session active'}</span>
      </div>
      <div style="display: flex; gap: 6px;">
        <button class="btn-secondary" onclick="openAuthModal()" style="padding: 4px 10px; font-size: 11px;">
          <span>👤 My Account</span>
        </button>
      </div>
    </div>
  ` : `
    <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 16px; font-size: 12px; flex-wrap: wrap; gap: 8px;">
      <div>
        <strong style="color: #334155;">🌱 Guest Mode:</strong> 
        <span style="color: #64748b; margin-left: 4px;">Sign in with <strong>"Remember Me"</strong> to preserve your vitals, streaks, and earn +50 Green Points bonus.</span>
      </div>
      <button class="btn-primary" onclick="openAuthModal()" style="padding: 5px 12px; font-size: 11px;">
        <span>🔑 Sign In / Sign Up</span>
      </button>
    </div>
  `;

  const html = `
    ${authBannerHtml}

    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
      <div>
        <span class="tag-badge tag-emerald">${intensity}</span>
        <h3 style="font-family: var(--font-heading); font-size: 20px; font-weight: 800; color: #0f172a;">${workoutTitle}</h3>
        <p style="font-size: 13px; color: var(--text-muted);">Calibrated for ${time} minutes • Tailored to ${region ? region.name.split('(')[0] : 'your region'}</p>
      </div>
      <button class="btn-secondary" onclick="speakTodayPlan('${workoutTitle.replace(/'/g, "\\'")}')">
        <span>🔊 Listen to Audio Coach</span>
      </button>
    </div>

    ${vitalsCalibrationHtml}

    <div class="grid-3" style="margin-bottom: 18px;">
      <div style="background: white; border: 1px solid var(--border); padding: 14px; border-radius: var(--radius-md);">
        <strong style="font-size: 11px; text-transform: uppercase; color: #059669; display: block; margin-bottom: 4px;">🏋️ Physical Prescription</strong>
        <p style="font-size: 12px; color: #334155; line-height: 1.5;">${workoutDetails}</p>
        <button class="btn-secondary" onclick="openExerciseAnimationByKeywords('${workoutTitle.replace(/'/g, "\\'")}')" style="margin-top: 8px; padding: 4px 10px; font-size: 11px;">
          <span>▶ View Movement Animation</span>
        </button>
      </div>
      <div style="background: white; border: 1px solid var(--border); padding: 14px; border-radius: var(--radius-md);">
        <strong style="font-size: 11px; text-transform: uppercase; color: #0284c7; display: block; margin-bottom: 4px;">🥗 Regional Nutrition Pairing</strong>
        <p style="font-size: 12px; color: #334155; line-height: 1.5;">${mealSuggestion}</p>
      </div>
      <div style="background: white; border: 1px solid var(--border); padding: 14px; border-radius: var(--radius-md);">
        <strong style="font-size: 11px; text-transform: uppercase; color: #7c3aed; display: block; margin-bottom: 4px;">💧 Hydration & Recovery</strong>
        <p style="font-size: 12px; color: #334155; line-height: 1.5;">${personalHydrationText}</p>
      </div>
    </div>

    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
      <button class="btn-primary" onclick="completeTodayRoutine()">
        <span>✓ Complete & Log Today's Plan (+30 Green Pts)</span>
      </button>
      <button class="btn-secondary" onclick="startMicroGoal('neck_angels', 60, 'Wall Angels Tech-Neck Decompression')">
        <span>⏱️ Start 60s Guided Timer</span>
      </button>
    </div>
  `;

  container.innerHTML = html;

  // Trigger next-step guidance, inline daily yoga plan, and synchronized eating plan
  renderWhatToDoNext();
  renderDailyYogaPlan();
  renderDailyFoodPlan();
}

function speakTodayPlan(title) {
  const msg = `Today's customized plan: ${title}. Hydrate with regional fluids and breathe deeply as you move.`;
  speakCoach(msg);
  showToast('Audio Coach started speaking.');
}

function completeTodayRoutine() {
  addGreenPoints(30);
  synth.playSuccessChime();
  showToast('🎉 Routine completed! +30 Green Points awarded & streak maintained.');
}

function logMealPlan() {
  addGreenPoints(25);
  synth.playSuccessChime();
  showToast('🥗 Regional nutrition logged! +25 Green Points added to your wallet.');
}

// --- COMPREHENSIVE YOGA EXERCISE ROUTINES (10, 20, 30, 45, 60 MINS) ---
const YOGA_ROUTINES_DATA = {
  '10': {
    time: 10,
    title: '10-Min Micro-Flow: Rapid Spine Decompression & Prana Reset',
    subtitle: '4 Essential Asanas • Calibrated for desk workers, tight necks, and limited time',
    intensity: 'Gentle Decompression',
    calories: '~45 kcal',
    targetFocus: 'Thoracic Extension, Psoas Opening & Diaphragmatic Breath',
    points: 40,
    poses: [
      {
        id: 'pose_10_cat_cow',
        name: 'Cat-Cow Spinal Waves',
        sanskrit: 'Marjaryasana - Bitilasana',
        duration: '2.0 min (8-10 cycles)',
        target: 'Thoracic & Lumbar Spine',
        cue: 'Inhale, drop belly down, pull collarbones wide and gaze gently up. Exhale, press palms flat, dome the upper spine and tuck chin.',
        icon: '🐱',
        benefit: 'Restores synovial fluid between vertebrae and relieves chronic desk hunch.'
      },
      {
        id: 'pose_10_downward_dog',
        name: 'Downward-Facing Dog',
        sanskrit: 'Adho Mukha Svanasana',
        duration: '2.5 min',
        target: 'Hamstrings, Calves & Shoulders',
        cue: 'Spread fingers wide, press chest toward shins, lift sitting bones high. Pedal heels slowly to release tight calves and Achilles tendons.',
        icon: '🐕',
        benefit: 'Mild inversion that increases cranial oxygenation and reverses thoracic slump.'
      },
      {
        id: 'pose_10_low_lunge',
        name: 'Low Lunge Crescent',
        sanskrit: 'Anjaneyasana',
        duration: '3.0 min (1.5m each side)',
        target: 'Psoas, Quads & Anterior Hip',
        cue: 'Step right foot forward, drop back knee gently. Inhale sweep arms up, let hips sink forward and down while keeping core lightly engaged.',
        icon: '🌙',
        benefit: 'Directly opens tight hip flexors shortened by prolonged sitting.'
      },
      {
        id: 'pose_10_childs_pose',
        name: 'Extended Child’s Pose',
        sanskrit: 'Balasana',
        duration: '2.5 min',
        target: 'Sacrum, Spine & Vagus Nerve',
        cue: 'Big toes touch, knees open wide. Rest forehead to mat, reach fingertips forward, and take 8 slow, grounding diaphragmatic breaths.',
        icon: '🌸',
        benefit: 'Down-regulates sympathetic nervous system and triggers relaxation response.'
      }
    ]
  },
  '20': {
    time: 20,
    title: '20-Min Daily Prana Rebalance & Kinetic Grounding',
    subtitle: '6 Structured Asanas • Harmonizes joint mobility, pelvic alignment, and mental calm',
    intensity: 'Balanced Vitality',
    calories: '~95 kcal',
    targetFocus: 'Spinal Mobility, Pelvic Alignment & Posterior Chain Strength',
    points: 40,
    poses: [
      {
        id: 'pose_20_cat_cow',
        name: 'Cat-Cow Spinal Warmup',
        sanskrit: 'Marjaryasana - Bitilasana',
        duration: '2.5 min',
        target: 'Full Spine Mobility',
        cue: 'Inhale to arch spine and lift gaze; exhale to tuck tailbone and dome upper back with breath synchronization.',
        icon: '🐱',
        benefit: 'Warms the central nervous system and lubricates all 24 articulating vertebrae.'
      },
      {
        id: 'pose_20_downward_dog',
        name: 'Downward Dog to Plank Waves',
        sanskrit: 'Adho Mukha Svanasana to Phalakasana',
        duration: '3.5 min',
        target: 'Shoulders, Core & Calves',
        cue: 'Ripple forward into high plank on inhale; press hips up and back into downward dog on exhale. Keep core tight.',
        icon: '🐕',
        benefit: 'Awakens transverse abdominis stability while decompressing shoulder blades.'
      },
      {
        id: 'pose_20_warrior2',
        name: 'Warrior II (Virabhadrasana II)',
        sanskrit: 'Virabhadrasana II',
        duration: '4.0 min (2m each side)',
        target: 'Quadriceps, Groin & Mental Focus',
        cue: 'Sink front thigh parallel to ground. Open arms wide at shoulder height. Gaze steadily past front middle finger.',
        icon: '⚔️',
        benefit: 'Builds isometric endurance in lower body, stabilizes knees, and clears anxiety.'
      },
      {
        id: 'pose_20_triangle',
        name: 'Extended Triangle Pose',
        sanskrit: 'Utthita Trikonasana',
        duration: '3.5 min (1.75m each side)',
        target: 'Hamstrings & Lateral Ribcage',
        cue: 'Hinge sideways from hip crease. Rest hand on shin or ankle. Rotate upper ribs toward sky and reach top arm straight up.',
        icon: '📐',
        benefit: 'Expands intercostal respiratory muscles and massages internal digestive organs.'
      },
      {
        id: 'pose_20_bridge',
        name: 'Bridge Pose (Setu Bandhasana)',
        sanskrit: 'Setu Bandhasana',
        duration: '3.5 min',
        target: 'Glutes, Hamstrings & Chest',
        cue: 'Lie on back, bend knees hip-width. Press heels firmly, lift pelvis toward sky, interlace fingers beneath and roll shoulders under.',
        icon: '🌉',
        benefit: 'Strengthens posterior chain, corrects anterior pelvic tilt, and relieves thoracic tightness.'
      },
      {
        id: 'pose_20_twist_child',
        name: 'Reclining Twist to Restorative Savasana',
        sanskrit: 'Supta Matsyendrasana & Savasana',
        duration: '3.0 min',
        target: 'Spinal Decompression & Integration',
        cue: 'Drop knees softly to right for 90 seconds, then left for 90 seconds. Finish lying flat with palms upturned.',
        icon: '🌀',
        benefit: 'Rinses residual muscular tension and seals the restorative benefits of your practice.'
      }
    ]
  },
  '30': {
    time: 30,
    title: '30-Min Classical Vinyasa Flow & Metabolic Agni',
    subtitle: '8 Dynamic Asanas • Enhances cardiovascular endurance, metabolic fire, and muscular tone',
    intensity: 'Moderate Dynamic Flow',
    calories: '~155 kcal',
    targetFocus: 'Full-Body Conditioning, Digestive Fire (Agni) & Deep Flexibility',
    points: 40,
    poses: [
      {
        id: 'pose_30_surya_a',
        name: 'Surya Namaskar A (Sun Salutations)',
        sanskrit: 'Surya Namaskara A (3 Rounds)',
        duration: '5.0 min',
        target: 'Full Body Cardiovascular Warmup',
        cue: 'Continuous flow linking breath and movement: Inhale upward salute, exhale fold, inhale flat back, exhale chaturanga, inhale upward dog, exhale downward dog.',
        icon: '☀️',
        benefit: 'Elevates core body temperature, oxygenates tissues, and regulates circadian hormones.'
      },
      {
        id: 'pose_30_three_dog',
        name: 'Three-Legged Dog to Low Lunge',
        sanskrit: 'Tri Pada Adho Mukha Svanasana',
        duration: '3.5 min',
        target: 'Glutes, Hip Mobility & Hamstrings',
        cue: 'Lift right leg high keeping hips level, step foot between hands, rise into high lunge, hold for 5 breaths. Repeat left.',
        icon: '🐕',
        benefit: 'Opens deep hip capsular tissues and stabilizes pelvic girdle.'
      },
      {
        id: 'pose_30_warriors',
        name: 'Warrior I to Warrior II Flow',
        sanskrit: 'Virabhadrasana I & II',
        duration: '4.5 min',
        target: 'Leg Strength, Hip Abductors & Core',
        cue: 'Square hips forward for Warrior I, then spin open into Warrior II. Hold each for 5 deep, intentional breaths per side.',
        icon: '🏹',
        benefit: 'Builds isometric stamina in lower body while decompressing thoracic spine.'
      },
      {
        id: 'pose_30_side_angle',
        name: 'Extended Side Angle Pose',
        sanskrit: 'Utthita Parsvakonasana',
        duration: '3.5 min',
        target: 'Obliques, Groin & Chest Expansion',
        cue: 'Rest front forearm on thigh or hand outside front foot. Sweep top arm over ear in one continuous diagonal line.',
        icon: '⚡',
        benefit: 'Strengthens ankles and knees while toning lateral abdominal core.'
      },
      {
        id: 'pose_30_cobra',
        name: 'Bhujangasana (Classical Cobra Pose)',
        sanskrit: 'Bhujangasana',
        duration: '3.5 min',
        target: 'Erector Spinae & Adrenal Balance',
        cue: 'Lie prone, palms by ribs. Lift chest using back muscles first, then press lightly with hands. Keep neck long and shoulders down.',
        icon: '🐍',
        benefit: 'Strengthens entire spinal column and stimulates thymus and adrenal glands.'
      },
      {
        id: 'pose_30_chair',
        name: 'Chair Pose with Prayer Twist',
        sanskrit: 'Utkatasana & Parivrtta Utkatasana',
        duration: '3.0 min',
        target: 'Glutes, Thighs & Visceral Organs',
        cue: 'Sit hips low and back. Bring hands to heart center, hook left elbow outside right knee and press palms together. Repeat left.',
        icon: '🪑',
        benefit: 'Massages digestive organs, activates internal Agni, and boosts lymphatic drainage.'
      },
      {
        id: 'pose_30_forward_fold',
        name: 'Seated Forward Fold',
        sanskrit: 'Paschimottanasana',
        duration: '3.5 min',
        target: 'Hamstrings, Calves & Nervous System',
        cue: 'Sit tall, flex toes back. Inhale reach tall, exhale hinge from hips leading with chest. Hold feet or shins comfortably.',
        icon: '🧘',
        benefit: 'Profoundly calms mental chatter, relieves mild anxiety, and decompresses lower back.'
      },
      {
        id: 'pose_30_savasana',
        name: 'Deep Savasana with Diaphragmatic Breath',
        sanskrit: 'Savasana (Corpse Pose)',
        duration: '3.5 min',
        target: 'Nervous System Integration',
        cue: 'Lie completely flat, legs and arms spread comfortably. Close eyes, let go of conscious control, and relax deeply.',
        icon: '🕊️',
        benefit: 'Locks in neuro-muscular adaptation and promotes deep autonomic cellular healing.'
      }
    ]
  },
  '45': {
    time: 45,
    title: '45-Min Deep Hatha Mastery & Decompression',
    subtitle: '10 Comprehensive Asanas • Restores structural balance, deep fascial lines, and autonomic equilibrium',
    intensity: 'Deep Functional Flow & Restoration',
    calories: '~225 kcal',
    targetFocus: 'Full Endocrine Modulation, Deep Hip Openers & Restorative Inversions',
    points: 40,
    poses: [
      {
        id: 'pose_45_pranayama',
        name: 'Nadi Shodhana (Alternate Nostril Breath)',
        sanskrit: 'Nadi Shodhana Pranayama',
        duration: '4.0 min',
        target: 'Autonomic Nervous System & Brain Balance',
        cue: 'Sit tall. Close right nostril with thumb, inhale left for 4s. Close left nostril, exhale right for 4s. Inhale right 4s, exhale left 4s.',
        icon: '🌬️',
        benefit: 'Balances sympathetic and parasympathetic branches of the autonomic nervous system.'
      },
      {
        id: 'pose_45_surya_b',
        name: 'Surya Namaskar B (Sun Salutations)',
        sanskrit: 'Surya Namaskara B (3 Rounds)',
        duration: '5.5 min',
        target: 'Full Body Conditioning & Core Heat',
        cue: 'Move through Utkatasana chair, forward fold, chaturanga, upward dog, and Warrior I stepping right and left.',
        icon: '☀️',
        benefit: 'Builds comprehensive kinetic chain strength and burns stored glycogen.'
      },
      {
        id: 'pose_45_eagle',
        name: 'Eagle Pose Balance',
        sanskrit: 'Garudasana',
        duration: '4.0 min (2m each side)',
        target: 'Shoulders, Hips & Proprioception',
        cue: 'Wrap right arm under left, wrap right leg over left thigh. Sink hips low into balance. Squeeze limbs toward midline.',
        icon: '🦅',
        benefit: 'Compresses and flushes major lymphatic and circulatory junctions in the hips and shoulder girdle.'
      },
      {
        id: 'pose_45_halfmoon',
        name: 'Half Moon Balancing Pose',
        sanskrit: 'Ardha Chandrasana',
        duration: '4.0 min (2m each side)',
        target: 'Ankle Stability, Core & Pelvis',
        cue: 'From triangle, place right fingertips 10 inches ahead on mat. Float left leg parallel to floor, stack hips and open top arm high.',
        icon: '🦩',
        benefit: 'Develops deep vestibular balance, unilateral hip stability, and lateral core resilience.'
      },
      {
        id: 'pose_45_camel',
        name: 'Camel Pose Heart Opener',
        sanskrit: 'Ustrasana',
        duration: '4.5 min',
        target: 'Thoracic Extension, Pectorals & Neck',
        cue: 'Kneel with knees hip-width. Hands on lower back, press hips forward, lift chest toward ceiling and reach back for heels if comfortable.',
        icon: '🐪',
        benefit: 'Dramatically reverses desk-slouch kyphosis and expands respiratory lung volume.'
      },
      {
        id: 'pose_45_pigeon',
        name: 'Sleeping Pigeon / Swan Pose',
        sanskrit: 'Eka Pada Rajakapotasana',
        duration: '6.0 min (3m each side)',
        target: 'Piriformis, IT Band & Deep Hip Rotators',
        cue: 'Slide right knee behind right wrist, extend left leg straight back. Inhale lengthen spine, exhale fold forward over front shin.',
        icon: '🕊️',
        benefit: 'Releases deep emotional somatic tension and relieves sciatic nerve impingement.'
      },
      {
        id: 'pose_45_boat',
        name: 'Navasana (Boat Pose Core Hold)',
        sanskrit: 'Paripurna Navasana',
        duration: '4.0 min',
        target: 'Transverse Abdominis & Hip Flexors',
        cue: 'Balance on sit bones, lift bent or straight shins parallel to ceiling. Extend arms forward, draw navel in tight, and hold for 5 breaths.',
        icon: '⛵',
        benefit: 'Strengthens deep abdominal wall and lumbar stabilizer muscles.'
      },
      {
        id: 'pose_45_twist',
        name: 'Half Lord of the Fishes Seated Twist',
        sanskrit: 'Ardha Matsyendrasana',
        duration: '4.5 min',
        target: 'Spinal Rotation & Visceral Health',
        cue: 'Sit tall, bend right knee and step right foot outside left thigh. Hug knee with left arm, place right hand behind and gently twist on exhale.',
        icon: '🌀',
        benefit: 'Aids liver and kidney detoxification and relieves chronic lumbar tension.'
      },
      {
        id: 'pose_45_inversion',
        name: 'Legs-Up-The-Wall / Supported Inversion',
        sanskrit: 'Viparita Karani',
        duration: '4.5 min',
        target: 'Circulation & Lymphatic Drainage',
        cue: 'Lie on back, elevate legs vertically against wall or supported by hands under pelvis. Let arms relax wide.',
        icon: '🕯️',
        benefit: 'Reverses gravitational venous pooling, cools tired leg muscles, and reduces heart strain.'
      },
      {
        id: 'pose_45_savasana',
        name: 'Restorative Savasana Surrender',
        sanskrit: 'Mritasana (Deep Restoration)',
        duration: '4.5 min',
        target: 'Neuromuscular Integration',
        cue: 'Lie back, cover eyes if possible, surrender all muscular holding, and allow the body to absorb the benefits of practice.',
        icon: '🪷',
        benefit: 'Cellular recovery and deep brainwave shift into theta regenerative state.'
      }
    ]
  },
  '60': {
    time: 60,
    title: '60-Min Master Sadhana, Flow & Soundscape Integration',
    subtitle: '12 Master Asanas • Complete classical practice unifying pranayama, strength, flexibility & meditation',
    intensity: 'Master Comprehensive Sadhana',
    calories: '~310 kcal',
    targetFocus: 'Complete Endocrine Harmony, Structural Alignment & Deep Meditation',
    points: 40,
    poses: [
      {
        id: 'pose_60_pranayama',
        name: 'Kapalabhati & Anulom Vilom Cleansing',
        sanskrit: 'Kapalabhati & Anulom Vilom',
        duration: '6.0 min',
        target: 'Respiratory Detoxification & Cranial Clarity',
        cue: '3 rounds of 30 active forceful exhales with passive inhales, followed by 3 minutes of smooth alternate nostril breathing.',
        icon: '🌬️',
        benefit: 'Clears nasal sinuses, oxygenates prefrontal cortex, and purifies energetic nadis.'
      },
      {
        id: 'pose_60_surya',
        name: 'Classical Surya Namaskara (5 Complete Cycles)',
        sanskrit: 'Surya Namaskara (12 Steps)',
        duration: '8.0 min',
        target: 'Total Body Cardiovascular Integration',
        cue: 'Breathe smoothly through each classical posture: Pranamasana, Hastauttanasana, Padahastasana, Ashwa Sanchalanasana, Dandasana, Ashtanga Namaskara, Bhujangasana, Parvatasana.',
        icon: '☀️',
        benefit: 'Harmonizes solar plexus energy, enhances metabolic burn, and flexes every major joint.'
      },
      {
        id: 'pose_60_dancing_warrior',
        name: 'Dancing Warrior Flow Sequence',
        sanskrit: 'Virabhadrasana Vinyasa Flow',
        duration: '6.5 min',
        target: 'Leg Stamina, Hip Opening & Lat Stretch',
        cue: 'Seamlessly flow: Warrior II to Peaceful Reverse Warrior, Extended Side Angle, into Humble Warrior with hands interlaced behind back.',
        icon: '⚔️',
        benefit: 'Builds physical poise, endurance, and opens deep shoulder and chest fascia.'
      },
      {
        id: 'pose_60_tree',
        name: 'Tree Pose with Heart Anjali Mudra',
        sanskrit: 'Vrikshasana',
        duration: '4.0 min (2m each side)',
        target: 'Rooting, Ankle Stability & Focus',
        cue: 'Root left foot like tree roots into soil. Place right sole against inner calf or inner thigh. Hands press at heart center. Gaze at one steady point.',
        icon: '🌲',
        benefit: 'Cultivates unwavering Dharana (mental concentration) and strengthens stabilizer muscles.'
      },
      {
        id: 'pose_60_dancer',
        name: 'Natarajasana (Lord of the Dance Balance)',
        sanskrit: 'Natarajasana',
        duration: '4.5 min',
        target: 'Quad Extension, Spine & Balance',
        cue: 'Reach back for inside of right ankle with right hand. Extend left arm forward, hinge from hips, and kick right foot upward and back.',
        icon: '🦩',
        benefit: 'Develops back extension, opens chest and shoulders, and improves emotional equilibrium.'
      },
      {
        id: 'pose_60_camel_bow',
        name: 'Camel Pose into Floor Bow Pose',
        sanskrit: 'Ustrasana to Dhanurasana',
        duration: '5.5 min',
        target: 'Full Posterior Chain Awakening',
        cue: 'Perform 2 rounds of Camel pose on knees, then transition to prone for Bow pose, catching outer ankles and kicking feet upward.',
        icon: '🐪',
        benefit: 'Massages abdominal organs, corrects slouch, and stimulates thyroid secretions.'
      },
      {
        id: 'pose_60_hip_opener',
        name: 'Deep Pigeon Pose & Baddha Konasana',
        sanskrit: 'Eka Pada Rajakapotasana & Baddha Konasana',
        duration: '6.0 min',
        target: 'Pelvic Floor, Adductors & Sacrum',
        cue: 'Spend 3 minutes on each side in sleeping pigeon, followed by seated butterfly pose folding gently forward with flat spine.',
        icon: '🕊️',
        benefit: 'Releases long-stored emotional fatigue, relaxes the sacrum, and optimizes pelvic blood flow.'
      },
      {
        id: 'pose_60_core_locust',
        name: 'Navasana Boat to Locust Spinal Lift',
        sanskrit: 'Navasana to Salabhasana',
        duration: '5.0 min',
        target: 'Core Girdle & Erector Spinae',
        cue: 'Alternate between 45-second Boat pose holds and 45-second Locust holds on the belly, lifting arms and legs together.',
        icon: '⛵',
        benefit: 'Builds balanced 360-degree core strength protecting the lower spine from injury.'
      },
      {
        id: 'pose_60_twist',
        name: 'Reclining Two-Knee Spinal Rinse',
        sanskrit: 'Supta Matsyendrasana',
        duration: '4.0 min',
        target: 'Thoraco-Lumbar Junction Release',
        cue: 'Draw both knees to chest, drop them to right while extending left arm out and looking left. Repeat on other side.',
        icon: '🌀',
        benefit: 'Neutralizes spinal rotation after backbends and calms autonomic nervous tone.'
      },
      {
        id: 'pose_60_shoulderstand',
        name: 'Salamba Sarvangasana (Supported Shoulderstand)',
        sanskrit: 'Salamba Sarvangasana or Viparita Karani',
        duration: '5.0 min',
        target: 'Thyroid, Immune Lymph & Venous Return',
        cue: 'Lift hips, support lower back with hands, elbows tucked shoulder-width. Extend legs toward ceiling. Keep chin tucked and neck steady.',
        icon: '🕯️',
        benefit: 'Known in Ayurveda as the "Queen of Asanas"—promotes thyroid balance and relieves pressure on lower extremities.'
      },
      {
        id: 'pose_60_fish',
        name: 'Matsyasana (Fish Pose Counter-Stretch)',
        sanskrit: 'Matsyasana',
        duration: '3.0 min',
        target: 'Throat, Bronchial Tubes & Heart',
        cue: 'Slide hands under hips, press elbows down, puff chest high to ceiling and gently rest crown of head on floor.',
        icon: '🐟',
        benefit: 'Counters shoulderstand, expands bronchial airways, and eases respiratory breathing.'
      },
      {
        id: 'pose_60_savasana',
        name: 'Yoga Nidra & Guided Soundscape Savasana',
        sanskrit: 'Yoga Nidra & Deep Integration',
        duration: '6.5 min',
        target: 'Total Cellular Healing & Surrender',
        cue: 'Relax every muscle from crown of head to toes. Experience profound stillness and integrate the energetic prana of the master session.',
        icon: '🪷',
        benefit: 'Equivalent to hours of refreshing sleep in reducing systemic biological stress.'
      }
    ]
  }
};

// --- SECTION 1: WHAT TO DO NEXT AFTER ANALYZING USER'S HEALTH ---
function renderWhatToDoNext() {
  const container = document.getElementById('what-to-do-next-output');
  if (!container) return;

  const { energy, soreness, sleep, stress } = state.todayAnswers;
  const yogaTime = state.yogaTime || '20';
  const region = REGIONS_DATA[state.userRegion];

  // Clinical-Intuitive Synthesis
  let statusBadge = '';
  let statusBadgeColor = '';
  let diagnosticSummary = '';
  let step1Title = '';
  let step1Desc = '';
  let step1ActionText = '⏱️ Start 60s Breath Reset';
  let step1ActionFn = "startMicroGoal('box_breathing', 60, '4-7-8 Parasympathetic Reset')";

  if (stress === 'work_stress' || sleep === 'less_5') {
    statusBadge = '🔴 Elevated Sympathetic Stress & Adrenal Fatigue';
    statusBadgeColor = '#dc2626';
    diagnosticSummary = 'Your biological check-in indicates high sympathetic nervous system arousal and shallow breathing, likely paired with elevated cortisol and micro-tension in the trapezius and cervical spine. Your body urgently needs down-regulation before any heavy loading.';
    step1Title = 'Immediate 5-Min Reset: Vagus Nerve Activation & Cellular Hydration';
    step1Desc = 'Drink 400ml warm water with a pinch of rock salt or lime. Do 2 minutes of 4-7-8 diaphragmatic breathing to stimulate vagal nerve tone and shift your nervous system into restorative parasympathetic dominance.';
  } else if (soreness === 'neck_shoulders') {
    statusBadge = '🟡 Cervical-Thoracic Strain & Posture Fatigue';
    statusBadgeColor = '#d97706';
    diagnosticSummary = 'Forward-head posture from prolonged computer or phone screens is putting up to 27 kg of gravitational leverage on your cervical spine. Blood flow through the sub-occipital fascia is restricted, causing mild tension headaches and upper back stiffness.';
    step1Title = 'Immediate 5-Min Reset: Thoracic Spine Extension & Hydration';
    step1Desc = 'Complete 10 chin tucks and 2 minutes of seated thoracic rotations. Drink 350ml room-temperature water to rehydrate vertebral discs.';
    step1ActionText = '⏱️ Start Wall Angels Reset (60s)';
    step1ActionFn = "startMicroGoal('neck_angels', 60, 'Wall Angels Posture Decompression')";
  } else if (energy === 'low') {
    statusBadge = '🟠 Low Cellular Energy & Depleted Glycogen';
    statusBadgeColor = '#ea580c';
    diagnosticSummary = 'Cellular ATP production is subdued, likely from incomplete recovery or digestive lethargy. Aggressive workouts will spike excess cortisol—gentle restorative mobility and warm, easy-to-digest prana foods are recommended to rebuild metabolic vitality.';
    step1Title = 'Immediate 5-Min Reset: Gentle Solar Awakening & Warm Fluid';
    step1Desc = 'Step into natural daylight for 3–5 minutes to reset your circadian melatonin suppression. Sip warm water infused with fresh ginger and tulsi.';
    step1ActionText = '⏱️ 60s Solar Breath Reset';
    step1ActionFn = "startMicroGoal('solar_breath', 60, 'Prana Solar Inhalation')";
  } else {
    statusBadge = '🟢 Optimal Vitality & Autonomic Equilibrium';
    statusBadgeColor = '#16a34a';
    diagnosticSummary = 'Your biometric telemetry and self-reported indicators reflect balanced heart rate variability, restored energy stores, and ready musculoskeletal tone. Today is an ideal day for full-body strength, dynamic Vinyasa flow, and nutrient-dense refueling.';
    step1Title = 'Immediate 5-Min Reset: Joint Warmup & Cellular Hydration';
    step1Desc = 'Drink 500ml fresh water with lemon. Mobilize major joints with 20 arm circles and 10 bodyweight air squats before rolling out your mat.';
    step1ActionText = '⏱️ Start 60s Joint Mobilizer';
    step1ActionFn = "startMicroGoal('joint_mob', 60, 'Full Body Kinetic Mobility')";
  }

  const routine = YOGA_ROUTINES_DATA[yogaTime] || YOGA_ROUTINES_DATA['20'];

  const html = `
    <div class="what-to-do-card" id="what-to-do-card-main">
      <div class="what-to-do-header">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
            <span class="tag-badge" style="background: #f1f5f9; border-color: ${statusBadgeColor}; color: ${statusBadgeColor}; font-weight: 800;">
              ${statusBadge}
            </span>
            <span class="optional-pill">AI Health Diagnosis & Roadmap</span>
          </div>
          <h3 style="font-family: var(--font-heading); font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px;">
            What To Do Next: Your 4-Step Health Action Plan
          </h3>
          <p style="font-size: 13px; color: #475569; margin: 0; max-width: 850px; line-height: 1.5;">
            ${diagnosticSummary}
          </p>
        </div>
        <button class="btn-secondary" onclick="speakWhatToDoNext()" style="padding: 6px 12px; font-size: 12px;">
          <span>🔊 Audio Guidance</span>
        </button>
      </div>

      <!-- Action Steps Timeline -->
      <div style="margin-top: 16px;">
        <!-- STEP 1: IMMEDIATE RESET -->
        <div class="next-action-step-card priority-step">
          <div class="step-number-bubble green">1</div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
              <strong style="font-family: var(--font-heading); font-size: 15px; color: #065f46;">
                ${step1Title}
              </strong>
              <span style="font-size: 11px; font-weight: 700; color: #059669; background: #ecfdf5; padding: 2px 8px; border-radius: 999px;">Immediate (Next 5 Mins)</span>
            </div>
            <p style="font-size: 12px; color: #334155; line-height: 1.5; margin: 6px 0 10px;">
              ${step1Desc}
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn-primary" onclick="${step1ActionFn}" style="padding: 5px 12px; font-size: 11px;">
                <span>${step1ActionText}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- STEP 2: DEDICATED YOGA PLAN -->
        <div class="next-action-step-card">
          <div class="step-number-bubble blue">2</div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
              <strong style="font-family: var(--font-heading); font-size: 15px; color: #1e3a8a;">
                Execute Daily Yoga Sequence: ${routine.title.split(':')[0]} (${routine.time} Mins)
              </strong>
              <span style="font-size: 11px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 999px;">
                ${state.yogaCompletedToday ? '✓ Completed (+40 Pts)' : '+40 Green Points'}
              </span>
            </div>
            <p style="font-size: 12px; color: #334155; line-height: 1.5; margin: 6px 0 10px;">
              Your customized ${routine.time}-minute yoga routine features <strong>${routine.poses.length} asanas</strong> targeting <em>${routine.targetFocus}</em>. ${state.yogaCompletedToday ? 'You have already completed this today!' : 'Practicing now will decompress your spine, clear mental fatigue, and earn 40 Green Points.'}
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn-primary" onclick="jumpToSection('daily-yoga-plan-container')" style="padding: 5px 12px; font-size: 11px;">
                <span>🧘 Jump to Daily Yoga Plan (${routine.time}m)</span>
              </button>
              <button class="btn-secondary" onclick="speakEntireYogaRoutine()" style="padding: 5px 12px; font-size: 11px;">
                <span>🔊 Audio Coach Guidance</span>
              </button>
            </div>
          </div>
        </div>

        <!-- STEP 3: TIMED FOOD PLAN -->
        <div class="next-action-step-card">
          <div class="step-number-bubble amber">3</div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
              <strong style="font-family: var(--font-heading); font-size: 15px; color: #92400e;">
                Nourishing Food Eating Plan: Synchronized with Your Practice
              </strong>
              <span style="font-size: 11px; font-weight: 700; color: #d97706; background: #fffbeb; padding: 2px 8px; border-radius: 999px;">
                ${state.foodPlanLoggedToday ? '✓ Logged (+25 Pts)' : '+25 Green Points'}
              </span>
            </div>
            <p style="font-size: 12px; color: #334155; line-height: 1.5; margin: 6px 0 10px;">
              Fuel your body with the synchronized Pre-Yoga hydration fluid and Post-Yoga protein recovery snack. Designed with <strong>${region ? region.name.split('(')[0] : 'regional'}</strong> whole ingredients to sustain mental clarity and prevent 3 PM blood sugar dips.
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn-secondary" onclick="jumpToSection('daily-food-plan-container')" style="padding: 5px 12px; font-size: 11px;">
                <span>🥗 View Eating Plan & Food Items</span>
              </button>
            </div>
          </div>
        </div>

        <!-- STEP 4: CIRCADIAN WIND-DOWN -->
        <div class="next-action-step-card">
          <div class="step-number-bubble purple">4</div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
              <strong style="font-family: var(--font-heading); font-size: 15px; color: #5b21b6;">
                Circadian Evening Protocol & Pineal Melatonin Preservation
              </strong>
              <span style="font-size: 11px; font-weight: 700; color: #7c3aed; background: #faf5ff; padding: 2px 8px; border-radius: 999px;">Evening Rest</span>
            </div>
            <p style="font-size: 12px; color: #334155; line-height: 1.5; margin: 6px 0 10px;">
              Dim overhead screens 45 minutes before bedtime. Sip warm spiced golden milk (turmeric, black pepper & nutmeg) and activate the pure 432 Hz theta binaural wave soundscape to induce restorative slow-wave delta sleep.
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn-secondary" onclick="toggleSleepSynth('theta')" style="padding: 5px 12px; font-size: 11px;">
                <span>🎶 Listen to 432 Hz Sleep Theta Waves</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function speakWhatToDoNext() {
  const { stress, soreness, sleep } = state.todayAnswers;
  const yogaTime = state.yogaTime || '20';
  let message = `Here is your next action roadmap. First, hydrate with 400 milliliters of warm water and take two minutes for deep belly breathing. Second, proceed with your ${yogaTime} minute daily yoga routine to decompress tension and earn 40 Green Points. Third, follow the synchronized pre and post yoga nutrition plan. Fourth, wind down tonight with 432 Hertz soundscapes.`;
  speakCoach(message);
  showToast('🔊 Audio Coach reading your action plan.');
}

// --- SECTION 2: DEDICATED YOGA TIME SELECTOR & INLINE DAILY YOGA PLAN ---
function setYogaTime(timeMinutes) {
  const timeStr = timeMinutes.toString();
  state.yogaTime = timeStr;
  state.todayAnswers.time = timeStr;
  localStorage.setItem('prana_yoga_time', timeStr);

  // Sync any chip buttons in the form
  document.querySelectorAll('.chip-btn[data-group="time"]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === timeStr);
  });

  renderDailyYogaPlan();
  renderWhatToDoNext();

  synth.playSuccessChime();
  showToast(`⏱️ Yoga exercise plan calibrated for ${timeMinutes} minutes (${YOGA_ROUTINES_DATA[timeStr].poses.length} poses)!`);
}

function renderDailyYogaPlan() {
  const container = document.getElementById('daily-yoga-plan-container');
  if (!container) return;

  const yogaTime = state.yogaTime || '20';
  const routine = YOGA_ROUTINES_DATA[yogaTime] || YOGA_ROUTINES_DATA['20'];

  // Time selector buttons
  const timeButtons = ['10', '20', '30', '45', '60'].map(t => {
    const isActive = t === yogaTime;
    const descMap = {
      '10': 'Express Reset (4 Poses)',
      '20': 'Prana Flow (6 Poses)',
      '30': 'Dynamic Flow (8 Poses)',
      '45': 'Deep Hatha (10 Poses)',
      '60': 'Master Flow (12 Poses)'
    };
    return `
      <div class="yoga-time-card-btn ${isActive ? 'active' : ''}" onclick="setYogaTime(${t})" title="Calibrate yoga plan to ${t} minutes">
        <span class="time-val">⏱️ ${t} Min</span>
        <span class="time-desc">${descMap[t]}</span>
      </div>
    `;
  }).join('');

  // Completion banner if already done today
  const completionBannerHtml = state.yogaCompletedToday ? `
    <div class="yoga-completion-banner">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 28px;">🎉</span>
        <div>
          <h4 style="font-family: var(--font-heading); font-size: 16px; font-weight: 800; color: #065f46; margin: 0;">
            Today's Daily Yoga Plan Completed! (+40 Green Points Added)
          </h4>
          <p style="font-size: 12px; color: #047857; margin: 2px 0 0;">
            Outstanding dedication to your neuromuscular health and daily streak. You can practice again anytime.
          </p>
        </div>
      </div>
      <button class="btn-secondary" onclick="resetDailyYogaPlan()" style="padding: 6px 14px; font-size: 11px;">
        <span>🔄 Re-Practice / Reset Plan</span>
      </button>
    </div>
  ` : '';

  // Pose items cards
  const posesCardsHtml = routine.poses.map((pose, idx) => {
    const isDone = state.completedYogaPoseIds && state.completedYogaPoseIds.includes(pose.id);
    const animKey = getPoseAnimKey(pose.id, pose.name);
    const animThumbnailSvg = renderPoseAnimationSVG(animKey, 'sm');
    return `
      <div class="yoga-pose-item ${isDone ? 'done' : ''}" id="pose-card-${pose.id}">
        <div>
          <!-- Inline Kinetic Animation Thumbnail -->
          <div class="pose-thumbnail-svg" onclick="openPoseAnimationModal('${pose.id}', '${yogaTime}')" title="Click to open full animated kinetic coach">
            ${animThumbnailSvg}
            <span class="play-badge">▶ Kinetic Animation</span>
          </div>

          <div class="yoga-pose-header">
            <div>
              <span style="font-size: 18px; margin-right: 4px;">${pose.icon}</span>
              <span class="yoga-pose-name">${idx + 1}. ${pose.name}</span>
              <div class="yoga-pose-sanskrit">${pose.sanskrit}</div>
            </div>
            <span class="yoga-pose-time-badge">${pose.duration}</span>
          </div>
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #059669; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;">
            🎯 ${pose.target}
          </span>
          <p class="yoga-pose-cue">
            <strong>Alignment Cue:</strong> ${pose.cue}
          </p>
          <p style="font-size: 11px; color: #64748b; margin: 4px 0 8px; line-height: 1.4;">
            💡 <em>${pose.benefit}</em>
          </p>
        </div>
        <div class="yoga-pose-footer">
          <button class="btn-secondary" onclick="openPoseAnimationModal('${pose.id}', '${yogaTime}')" style="padding: 4px 8px; font-size: 11px;" title="Open interactive animated guide">
            <span>▶ Play Animation</span>
          </button>
          <button class="btn-secondary" onclick="speakYogaPose('${pose.id}')" style="padding: 4px 8px; font-size: 11px;" title="Listen to alignment cues">
            <span>🔊 Audio Cue</span>
          </button>
          <button class="${isDone ? 'btn-primary' : 'btn-secondary'}" onclick="toggleYogaPoseDone('${pose.id}')" style="padding: 4px 10px; font-size: 11px;">
            <span>${isDone ? '✓ Done' : 'Mark Done'}</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  const html = `
    <div class="daily-yoga-section" id="daily-yoga-plan-section">
      <!-- TIME QUESTION SELECTOR -->
      <div class="yoga-time-container">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
          <div>
            <span class="tag-badge tag-emerald">Time-Calibrated Exercise Engine</span>
            <h3 style="font-family: var(--font-heading); font-size: 19px; font-weight: 800; color: #0f172a; margin: 4px 0 2px;">
              ⏱️ How much time can you give to Yoga exercise today?
            </h3>
            <p style="font-size: 13px; color: #475569; margin: 0;">
              Select your available duration. PranaFit will immediately synthesize the exact pose count, breathing cues, and sequence intensity to match your schedule:
            </p>
          </div>
          <span style="font-size: 12px; font-weight: 800; color: #047857; background: #d1fae5; padding: 4px 10px; border-radius: 999px;">
            Active: ${yogaTime} Minutes
          </span>
        </div>

        <div class="yoga-time-btn-group">
          ${timeButtons}
        </div>
      </div>

      <!-- COMPLETION CELEBRATION IF DONE -->
      ${completionBannerHtml}

      <!-- ROUTINE SPECIFICATION HEADER -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid var(--border);">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="tag-badge tag-indigo">${routine.intensity}</span>
            <span class="tag-badge tag-amber">🔥 ${routine.calories}</span>
            <span class="tag-badge tag-emerald">🎁 +40 Green Points</span>
          </div>
          <h3 style="font-family: var(--font-heading); font-size: 21px; font-weight: 800; color: #0f172a; margin: 6px 0 2px;">
            ${routine.title}
          </h3>
          <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
            ${routine.subtitle} • Target Focus: <strong>${routine.targetFocus}</strong>
          </p>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-secondary" onclick="speakEntireYogaRoutine()" style="padding: 6px 12px; font-size: 12px;">
            <span>🔊 Audio Coach Overview</span>
          </button>
        </div>
      </div>

      <!-- POSES GRID -->
      <div class="yoga-poses-grid">
        ${posesCardsHtml}
      </div>

      <!-- COMPLETION CONTROLS -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding-top: 16px; border-top: 1px solid var(--border); margin-top: 18px;">
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn-primary" onclick="completeDailyYogaPlan()" style="padding: 10px 18px; font-size: 14px; font-weight: 800; background: #059669;">
            <span>✓ Complete Daily Yoga Plan (+40 Green Points)</span>
          </button>
          <button class="btn-secondary" onclick="startMicroGoal('cat_cow_timer', 120, 'Guided Cat-Cow Spinal Movement')" style="padding: 10px 16px; font-size: 13px;">
            <span>⏱️ Start Guided 2-Min Timer</span>
          </button>
        </div>
        <span style="font-size: 12px; color: var(--text-muted);">
          Completing daily yoga preserves your daily streak and updates your leaderboard ranking.
        </span>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function toggleYogaPoseDone(poseId) {
  if (!state.completedYogaPoseIds) state.completedYogaPoseIds = [];
  const idx = state.completedYogaPoseIds.indexOf(poseId);
  if (idx !== -1) {
    state.completedYogaPoseIds.splice(idx, 1);
  } else {
    state.completedYogaPoseIds.push(poseId);
    synth.playTimerTick();
  }
  renderDailyYogaPlan();
}

function completeDailyYogaPlan() {
  const yogaTime = state.yogaTime || '20';
  const routine = YOGA_ROUTINES_DATA[yogaTime] || YOGA_ROUTINES_DATA['20'];

  // Award +40 points
  addGreenPoints(40);
  state.yogaCompletedToday = true;

  const todayStr = new Date().toISOString().slice(0, 10);
  localStorage.setItem('prana_yoga_completed_date', todayStr);

  synth.playSuccessChime();
  renderDailyYogaPlan();
  renderWhatToDoNext();

  speakCoach(`Congratulations! You have completed your ${yogaTime} minute daily yoga sequence. Forty Green Points have been added to your account.`);
  showToast(`🎉 Daily Yoga Plan completed! +40 Green Points awarded & daily streak incremented.`);
}

function resetDailyYogaPlan() {
  state.yogaCompletedToday = false;
  state.completedYogaPoseIds = [];
  localStorage.removeItem('prana_yoga_completed_date');
  renderDailyYogaPlan();
  renderWhatToDoNext();
  showToast('Daily yoga plan reset. Ready for your next session!');
}

function speakYogaPose(poseId) {
  const yogaTime = state.yogaTime || '20';
  const routine = YOGA_ROUTINES_DATA[yogaTime] || YOGA_ROUTINES_DATA['20'];
  const pose = routine.poses.find(p => p.id === poseId);
  if (!pose) return;

  const msg = `${pose.name}, known in Sanskrit as ${pose.sanskrit}. Hold for ${pose.duration}. ${pose.cue}. Benefit: ${pose.benefit}`;
  speakCoach(msg);
  showToast(`🔊 Coach explaining: ${pose.name}`);
}

function speakEntireYogaRoutine() {
  const yogaTime = state.yogaTime || '20';
  const routine = YOGA_ROUTINES_DATA[yogaTime] || YOGA_ROUTINES_DATA['20'];
  const poseNames = routine.poses.map(p => p.name).join(', ');
  const msg = `Today's ${routine.time} minute yoga sequence: ${routine.title}. Poses included are: ${poseNames}. Breathe smoothly and never force any stretch. Complete your plan to earn 40 Green Points.`;
  speakCoach(msg);
  showToast(`🔊 Audio Coach summarizing ${routine.time}-minute yoga routine.`);
}

// --- SECTION 3: DAILY FOOD ITEMS EATING PLAN SYNCHRONIZED WITH YOGA ---
function getDailyMealsForDiet(diet, fastingType, regionKey) {
  const isSouth = regionKey === 'south';
  const isWest = regionKey === 'west';
  const isEast = regionKey === 'east';

  if (diet === 'fasting') {
    if (fastingType === 'vrat_ekadashi') {
      return [
        {
          timing: '🌅 Morning Sacred Fuel (7:00 – 8:00 AM)',
          isYogaSync: true,
          syncLabel: 'Pre-Yoga Vrat Fuel',
          title: 'Soaked Badam, Munakka & Saffron Water',
          items: '• 300ml warm water steeped with Kashmiri saffron strands & green cardamom<br/>• 5 overnight soaked & peeled almonds (Badam) + 3 soaked Munakka',
          benefit: '🪔 Vrat-compliant natural glucose that sustains neural vitality without taxing stomach energy'
        },
        {
          timing: '🧘 Within 45 Mins Post-Yoga',
          isYogaSync: true,
          syncLabel: 'Recovery Window',
          title: 'Fresh Tender Coconut Water with Malai',
          items: '• 1 glass fresh green tender coconut water with tender coconut flesh (Malai)<br/>• Rich in natural potassium, magnesium & isotonic electrolytes compliant with fasting rules',
          benefit: '⚡ Immediate cellular electrolyte rehydration without breaking sacred fast vows'
        },
        {
          timing: '🥣 Phalahar Mid-Morning (10:30 – 11:30 AM)',
          isYogaSync: false,
          syncLabel: 'Phalahar Meal',
          title: 'Boiled Sweet Potato (Shakarkand) Chaat',
          items: '• 1 bowl boiled sweet potato cubes tossed with roasted peanuts, Sendha Namak (Himalayan rock salt), fresh lemon juice, cumin & chopped green chillies',
          benefit: '🍠 High in complex resistant starches & vitamin A; sustains stable blood sugar'
        },
        {
          timing: '🍲 Sacred Vrat Main Meal (1:30 – 2:30 PM)',
          isYogaSync: false,
          syncLabel: 'Main Vrat Thali',
          title: 'Crispy Sabudana Khichdi or Rajgira Paratha with Lauki Curry',
          items: '• Fluffy non-sticky Sabudana Khichdi (tapioca pearls with crushed roasted peanuts, cumin & curry leaves) OR 2 soft Rajgira (Amaranth) parathas<br/>• Mild Bottle Gourd (Lauki) sabzi cooked in pure A2 cow ghee<br/>• 1 bowl fresh homemade probiotic curd seasoned with roasted cumin powder & rock salt',
          benefit: '🥥 Amaranth and tapioca provide complete satiety, calcium, and digestive lightness'
        },
        {
          timing: '☕ Evening Fasting Crunch (5:00 – 6:00 PM)',
          isYogaSync: false,
          syncLabel: 'Evening Fuel',
          title: 'Roasted Makhana (Foxnuts) in A2 Ghee & Mint Tea',
          items: '• 1 bowl crunchy Makhana lightly roasted in 1/2 tsp cow ghee with Sendha Namak & black pepper<br/>• Fresh herbal mint & tulsi infusion',
          benefit: '🛡️ Powerful renal & anti-fatigue adaptogens rich in bioavailable plant protein and zero sodium bloat'
        },
        {
          timing: '🌙 Evening Light Vrat Dinner (7:30 – 8:30 PM)',
          isYogaSync: false,
          syncLabel: 'Evening Phalahar',
          title: 'Warm Sama Ke Chawal (Barnyard Millet) Khichdi & Saffron Milk',
          items: '• Warm Sama rice khichdi with grated ginger, cumin and diced pumpkin<br/>• Followed 45 mins later by 1 small cup warm milk with saffron, cardamom and nutmeg',
          benefit: '💤 Low-glycemic ancient millet promotes deep sleep and calm spiritual groundedness'
        }
      ];
    } else if (fastingType === 'navratri_phalahar') {
      return [
        {
          timing: '🌅 Morning Phalahar Awakening (7:30 – 8:30 AM)',
          isYogaSync: true,
          syncLabel: 'Pre-Practice Phalahar',
          title: 'Alkaline Lemon-Mint Warm Infusion & Soaked Figs',
          items: '• 350ml warm water with fresh lemon juice & crushed mint leaves<br/>• 2 soaked dried figs (Anjeer) + 4 soaked almonds',
          benefit: '🍎 Flushes cellular acidity and delivers rapid mineral absorption'
        },
        {
          timing: '🧘 Within 45 Mins Post-Yoga',
          isYogaSync: true,
          syncLabel: 'Electrolyte Replenish',
          title: 'Fresh Tender Coconut Water & Pomegranate',
          items: '• 1 tall glass fresh tender coconut water<br/>• 1 small cup fresh ruby pomegranate arils with a pinch of rock salt',
          benefit: '⚡ Polyphenol-rich antioxidants that quench exercise-induced oxidative stress'
        },
        {
          timing: '🥣 Midday Alkaline Fruit Feast (12:30 – 1:30 PM)',
          isYogaSync: false,
          syncLabel: 'Main Fruit Meal',
          title: 'Enzyme-Rich Papaya & Crisp Apple Salad Bowl',
          items: '• 1 generous bowl ripe fresh papaya cubes (rich in papain digestive enzymes)<br/>• 1 crisp sliced Himachal apple dusted with Ceylon cinnamon powder<br/>• 1 tbsp roasted watermelon & chia seeds for essential fatty acids',
          benefit: '🌿 Supreme enzymatic digestion that cleanses the intestinal villi and colon'
        },
        {
          timing: '☕ Evening Refresh (4:30 – 5:30 PM)',
          isYogaSync: false,
          syncLabel: 'Hydration',
          title: 'Spiced Kokum / Sol Water & Roasted Seeds',
          items: '• Refreshing kokum or mint water with rock salt<br/>• Handful of roasted pumpkin & cucumber seeds',
          benefit: '🛡️ Prevents electrolyte dips and sustains healthy hydration'
        },
        {
          timing: '🌙 Light Evening Phalahar (7:00 – 8:00 PM)',
          isYogaSync: false,
          syncLabel: 'Restorative Fruit',
          title: 'Warm Stewed Apples with Cinnamon & Nutmeg',
          items: '• Lightly stewed apple or pear with cinnamon, cloves & cardamom<br/>• Warm almond or cow milk with turmeric (optional)',
          benefit: '💤 Gentle on nocturnal stomach motility while supplying comforting bedtime warmth'
        }
      ];
    } else if (fastingType === 'water_detox') {
      return [
        {
          timing: '🌅 Morning Cleansing Elixir (7:00 – 8:00 AM)',
          isYogaSync: true,
          syncLabel: 'Detox Elixir',
          title: 'Fresh Ash Gourd Juice or Warm Lemon Salt Water',
          items: '• 300ml fresh ash gourd (safed petha) juice with a pinch of black pepper, OR warm water with fresh lemon & Himalayan pink salt',
          benefit: '💧 Tremendous pranic charge that alkalizes the bloodstream and cleanses lymph'
        },
        {
          timing: '🧘 Mid-Morning Hydration (10:30 – 11:30 AM)',
          isYogaSync: true,
          syncLabel: 'Electrolyte Shield',
          title: 'Tender Coconut Water & CCF Tea',
          items: '• 1 glass fresh coconut water<br/>• 1 mug warm Cumin-Coriander-Fennel (CCF) digestive tea',
          benefit: '⚡ Natural intracellular electrolytes preventing ketosis headaches or weakness'
        },
        {
          timing: '🍲 Midday Herb Infusion (1:00 – 2:00 PM)',
          isYogaSync: false,
          syncLabel: 'Midday Cellular Cleanse',
          title: 'Warm Ginger-Tulsi-Lemongrass Broth',
          items: '• Simmered herbal broth made with fresh ginger, tulsi leaves, lemongrass & pinch of turmeric<br/>• 500ml structured mineral water',
          benefit: '🔥 Maintains metabolic fire (Agni) while the body is in active autophagy'
        },
        {
          timing: '☕ Afternoon Mineral Replenishment (4:30 – 5:30 PM)',
          isYogaSync: false,
          syncLabel: 'Hydration',
          title: 'Cucumber-Mint Detox Infusion',
          items: '• Chilled or room-temp water infused with fresh cucumber slices, mint sprigs & lemon peel with pink salt',
          benefit: '🛡️ Recharges cellular membrane potential'
        },
        {
          timing: '🌙 Evening Calming Infusion (7:30 – 8:30 PM)',
          isYogaSync: false,
          syncLabel: 'Night Rest',
          title: 'Chamomile, Nutmeg & Fennel Restorative Tea',
          items: '• Steeped chamomile flower and crushed fennel tea with a hint of freshly ground nutmeg',
          benefit: '💤 Induces profound neurological calmness and restorative deep sleep'
        }
      ];
    } else {
      // 16:8 Intermittent Fasting
      return [
        {
          timing: '🌅 8:00 AM – 11:30 AM (Autophagy Fasting Window)',
          isYogaSync: true,
          syncLabel: 'Fast Phase (0 kcal)',
          title: 'Electrolyte Hydration & Organic Black Coffee / Green Tea',
          items: '• 500ml warm water with 1/4 tsp Himalayan pink salt<br/>• Black coffee or brewed green tea with no sugar or dairy (0 kcal)',
          benefit: '⏳ Drives deep cellular autophagy, mitochondrial cleanup & fat oxidation'
        },
        {
          timing: '🧘 11:30 AM (Pre-Break Yoga Transition)',
          isYogaSync: true,
          syncLabel: 'Hydration Transition',
          title: 'Hydrating Cucumber-Lemon Electrolyte Water',
          items: '• 300ml water infused with cucumber slices, lime & rock salt<br/>• Prepares digestive enzymes for window opening',
          benefit: '⚡ Smooth transition from fasting to feeding without digestive shock'
        },
        {
          timing: '🥣 12:00 PM (Break-Fast Window Opening Meal)',
          isYogaSync: false,
          syncLabel: 'Break-Fast Bowl',
          title: 'High-Protein Sprouted Moong & Soaked Chia Bowl',
          items: '• 1 bowl steamed sprouted moong with chopped cucumber, tomato, lime, avocado or paneer/tofu<br/>• 4 soaked walnuts + 1 tbsp roasted pumpkin seeds',
          benefit: '🥗 Gently activates digestive enzymes with low glycemic impact and zero insulin spikes'
        },
        {
          timing: '🍲 3:30 PM (Mid-Window Sustained Fuel)',
          isYogaSync: false,
          syncLabel: 'Power Fuel',
          title: 'Whole Grain Millet Thali with Tadka Dal & Greens',
          items: '• 2 Jowar or Bajra rotis with rich yellow Dal Tadka, seasonal sauteed greens & probiotic curd<br/>• Fresh tender coconut water',
          benefit: '🌾 High-fiber complex fuel providing sustained physical endurance'
        },
        {
          timing: '🌙 7:30 PM (Final Feeding Window Nutrient-Dense Dinner)',
          isYogaSync: false,
          syncLabel: 'Final Meal Before Fast',
          title: 'Warm Vegetable Lentil Stew / Paneer or Tofu Bhurji',
          items: '• Wholesome vegetable stew with quinoa or light phulka, followed by warm turmeric golden milk<br/>• Eating window promptly closes at 8:00 PM for 16-hour night fast',
          benefit: '🌙 Ample slow-digesting protein and healthy fats to support overnight recovery'
        }
      ];
    }
  } else if (diet === 'nonveg') {
    let lunchNonVeg = 'Spiced Grilled Chicken Breast (or Tandoori Tikka) with Jowar Roti, Dal Tadka, Cucumber Salad & Spiced Buttermilk';
    let dinnerNonVeg = 'Clear Chicken Bone Broth Soup with tender chicken strips, sauteed bottle gourd & steamed brown rice';

    if (isSouth) {
      lunchNonVeg = 'Coastal Fish Curry (Surmai / Pomfret in coconut turmeric curry) with Steamed Brown Rice, Drumstick Sambar & Beans Poriyal';
      dinnerNonVeg = 'Light Kerala Chicken Stew with Steamed Idiyappam (string hoppers), followed by warm turmeric spiced milk';
    } else if (isWest) {
      lunchNonVeg = 'Konkani Spiced Fish Curry with Jowar Bhakri, fresh Sol Kadhi & Cucumber onion kachumber';
      dinnerNonVeg = 'Light Spiced Chicken Sukka with warm moong khichdi and fresh salad';
    } else if (isEast) {
      lunchNonVeg = 'Traditional Machher Jhol (fresh Rohu/Katla in light ginger-cumin-turmeric broth) with Steamed Rice & Pointed Gourd';
      dinnerNonVeg = 'Steamed Fish Tikka with light vegetable clear stew and phulka';
    }

    return [
      {
        timing: '🌅 30–45 Mins Before Practice',
        isYogaSync: true,
        syncLabel: 'Pre-Yoga Fuel',
        title: 'Warm Lemon-Honey Water & Soaked Walnuts',
        items: '• 300ml warm water with a squeeze of fresh lemon & raw honey<br/>• 3 soaked walnut halves + 2 black raisins (Munakka)',
        benefit: '🌿 Gentle glycogen release and omega-3 neuro-protection with zero digestive heaviness'
      },
      {
        timing: '🧘 Within 45 Mins Post-Yoga',
        isYogaSync: true,
        syncLabel: 'Recovery Window',
        title: 'Tender Coconut Water & 2 Boiled Egg Whites',
        items: '• 1 glass fresh tender coconut water (natural potassium & electrolytes)<br/>• 2 soft-boiled organic egg whites seasoned with pink rock salt & black pepper (or light steamed fish fillet)',
        benefit: '⚡ 14g rapid bioavailable albumin protein & electrolytes to immediately initiate muscle recovery'
      },
      {
        timing: '🥣 Morning Vitality (8:30 – 9:30 AM)',
        isYogaSync: false,
        syncLabel: 'High-Protein Breakfast',
        title: 'Spiced Masala Scrambled Eggs with Multigrain Toast',
        items: '• 2 whole eggs scrambled with diced tomatoes, onions, spinach, green chillies & turmeric<br/>• 1 slice toasted multigrain or sourdough bread with fresh coriander mint chutney',
        benefit: '🍳 Choline and lutein for sharp mental acuity, sustained satiety, and steady energy'
      },
      {
        timing: '🍲 Peak Agni Window (12:30 – 1:30 PM)',
        isYogaSync: false,
        syncLabel: 'Main Lunch',
        title: 'Regional Lean High-Protein Coastal / Poultry Thali',
        items: `• ${lunchNonVeg}<br/>• Fresh seasonal salad with lemon and cold-pressed oil`,
        benefit: '🔥 Complete bioavailable amino acid profile alongside healthy marine EPA/DHA fatty acids'
      },
      {
        timing: '☕ Adrenal Support (4:30 – 5:30 PM)',
        isYogaSync: false,
        syncLabel: 'Tea & Snack',
        title: 'Boiled Chana Chaat & Green Tea',
        items: '• 1/2 cup boiled black chickpeas tossed with roasted cumin, lime, cucumber & pumpkin seeds<br/>• Freshly brewed cinnamon tulsi green tea',
        benefit: '🛡️ Fiber-rich snack preventing late afternoon cortisol spikes and blood sugar crashes'
      },
      {
        timing: '🌙 Grounding Night (7:00 – 8:00 PM)',
        isYogaSync: false,
        syncLabel: 'Restorative Dinner',
        title: 'Restorative Chicken Bone Broth & Light Dinner',
        items: `• ${dinnerNonVeg}<br/>• 1 cup warm spiced turmeric golden milk (or chamomile tea) before bed`,
        benefit: '💤 Rich in bioavailable collagen and glycine that repairs joints and ligaments during deep sleep'
      }
    ];
  } else if (diet === 'vegan') {
    let lunchVegan = 'Whole Millet Roti (Jowar/Bajra), Double-Tadka Yellow Dal, Organic Tofu / Tempeh Saute, Seasonal Greens & Sol Kadhi';
    let dinnerVegan = 'Warm Red Lentil (Masoor) & Pumpkin Soup with steamed brown rice, accompanied by stir-fried sesame greens';

    if (isSouth) {
      lunchVegan = 'Steamed Red Rice, Rich Moringa Drumstick Sambar, Beans Poriyal & Coconut Milk Rasam';
      dinnerVegan = 'Steamed Idiyappam with coconut vegetable stew, followed by warm golden almond turmeric milk';
    } else if (isWest) {
      lunchVegan = 'Jowar Bhakri with Sprouted Usal, Thecha, Pithla & fresh Sol Kadhi';
      dinnerVegan = 'Moong khichdi cooked in cold-pressed sesame oil with roasted cumin and steamed greens';
    } else if (isEast) {
      lunchVegan = 'Steamed brown rice, Chana Dal with green bottle gourd, Pointed Gourd (Parwal) fry & roasted Bengal gram';
      dinnerVegan = 'Light vegetable and lentil patty stew with steamed rice';
    }

    return [
      {
        timing: '🌅 30–45 Mins Before Practice',
        isYogaSync: true,
        syncLabel: 'Pre-Yoga Fuel',
        title: 'Warm Ginger-Mint Infusion & Soaked Nuts',
        items: '• 300ml warm water steeped with fresh ginger, mint & lime<br/>• 5 soaked and peeled almonds + 2 dried figs (Anjeer)',
        benefit: '🌱 100% plant-derived iron, magnesium, and hydration for smooth muscle contraction'
      },
      {
        timing: '🧘 Within 45 Mins Post-Yoga',
        isYogaSync: true,
        syncLabel: 'Recovery Window',
        title: 'Fresh Coconut Water & Sprouted Hemp Chaat',
        items: '• 1 tall glass fresh tender coconut water<br/>• 1 bowl steamed sprouted green moong & black chickpeas tossed with 1 tbsp raw hemp hearts, cucumber, tomato & lime',
        benefit: '⚡ Complete 9 essential amino acids and anti-inflammatory plant omega-3s with zero dairy allergens'
      },
      {
        timing: '🥣 Morning Vitality (8:30 – 9:30 AM)',
        isYogaSync: false,
        syncLabel: 'Plant Vitality Breakfast',
        title: 'Savory Tofu Scramble / Sprouted Moong Chilla',
        items: '• Organic Tofu Scramble with bell peppers, spinach, turmeric & nutritional yeast on sourdough OR Sprouted Moong Chilla<br/>• Fresh mint-coriander coconut chutney',
        benefit: '🌾 Plant isoflavones and bioavailable non-heme iron to support endocrine vitality'
      },
      {
        timing: '🍲 Peak Agni Window (12:30 – 1:30 PM)',
        isYogaSync: false,
        syncLabel: 'Main Lunch',
        title: 'Ayurvedic 100% Plant-Based Thali',
        items: `• ${lunchVegan}<br/>• Fresh cucumber, carrot & grated beet salad seasoned with cold-pressed sesame oil`,
        benefit: '🔥 Diverse prebiotic fibers and polyphenols that fortify the gut microbiome barrier'
      },
      {
        timing: '☕ Adrenal Support (4:30 – 5:30 PM)',
        isYogaSync: false,
        syncLabel: 'Tea & Snack',
        title: 'Roasted Makhana & Chia Pudding Bowl',
        items: '• Roasted Makhana (foxnuts) tossed in cold-pressed coconut oil with pink salt & turmeric<br/>• Overnight chia seed pudding in almond milk with pinch of cinnamon',
        benefit: '🛡️ Healthy alpha-linolenic fats that stabilize mood and eradicate sweet cravings'
      },
      {
        timing: '🌙 Grounding Night (7:00 – 8:00 PM)',
        isYogaSync: false,
        syncLabel: 'Light Dinner',
        title: 'Restorative Plant Stew & Golden Almond Milk',
        items: `• ${dinnerVegan}<br/>• 1 cup warm almond or oat milk simmered with raw turmeric, ginger, black pepper & pinch of nutmeg before sleep`,
        benefit: '💤 Stimulates natural melatonin and relaxes somatic muscle tone without dairy mucus buildup'
      }
    ];
  } else {
    // Default: Vegetarian (Veg)
    let breakfastVeg = 'Sprouted Moong & Vegetable Chilla with fresh mint coriander chutney & roasted pumpkin seeds';
    let lunchVeg = 'Whole Millet Roti (Jowar/Bajra), Tadka Dal, Seasonal Sauteed Greens (Methi/Palak) & Roasted Jeera Buttermilk';
    let eveningVeg = 'Herbal Tulsi Cardamom Infusion with Roasted Makhana (Foxnuts) & Pumpkin Seeds';
    let dinnerVeg = 'Warm Bottle Gourd (Lauki) & Yellow Moong Soup with Steamed Brown Rice or Quinoa, followed by Haldi Doodh';

    if (isSouth) {
      breakfastVeg = 'Steamed Ragi Idlis or Multi-Millet Dosa with Curry Leaf Coconut Chutney & Vegetable Sambar';
      lunchVeg = 'Red Rice or Brown Rice, Moringa Drumstick Sambar, Poriyal (sauteed beans & cabbage) & Probiotic Curd';
      eveningVeg = 'Sundal (tempered white chickpeas with mustard seeds & grated coconut) + Spiced Sukku Chai';
      dinnerVeg = 'Light Steamed Idiyappam with vegetable stew, followed by warm turmeric pepper golden milk';
    } else if (isWest) {
      breakfastVeg = 'Sprouted Methi Poha with roasted peanuts, lemon, fresh coriander & grated coconut';
      lunchVeg = 'Jowar Bhakri with Pithla (spiced gram flour curry), Thecha, and fresh Sol Kadhi';
      eveningVeg = 'Roasted Kurmura (puffed rice) bhel with roasted flaxseeds + Lemon ginger tea';
      dinnerVeg = 'Moong dal khichdi with roasted cumin ghee, followed by warm spiced golden milk';
    } else if (isEast) {
      breakfastVeg = 'Sattu Drink with roasted cumin & pink salt, accompanied by steamed rice pithas';
      lunchVeg = 'Steamed rice, Chana Dal with green bottle gourd, and pointed gourd (parwal) bhaja';
      eveningVeg = 'Puffed rice (muri) with roasted Bengal gram and green tea';
      dinnerVeg = 'Light vegetable stew with lentil patties, followed by warm turmeric milk with nutmeg';
    }

    return [
      {
        timing: '🌅 30–45 Mins Before Practice',
        isYogaSync: true,
        syncLabel: 'Pre-Yoga Fuel',
        title: 'Warm Ginger-Tulsi Infusion & Soaked Nuts',
        items: '• 300ml warm water steeped with fresh ginger & crushed tulsi leaves<br/>• 4 overnight soaked almonds (peeled) + 2 soaked black raisins (Munakka)',
        benefit: '🌿 Light on digestion; optimizes circulation without causing stomach cramps'
      },
      {
        timing: '🧘 Within 45 Mins Post-Yoga',
        isYogaSync: true,
        syncLabel: 'Recovery Window',
        title: 'Fresh Tender Coconut Water & Sprouted Chaat',
        items: '• 1 glass fresh coconut water or spiced sattu buttermilk cooler (natural potassium & electrolytes)<br/>• 1 cup steamed sprouted moong with chopped cucumber, tomato, lime & rock salt',
        benefit: '⚡ Rapid glycogen refuel, lean plant protein & cellular rehydration'
      },
      {
        timing: '🥣 Morning Vitality (8:30 – 9:30 AM)',
        isYogaSync: false,
        syncLabel: 'Breakfast',
        title: 'Regional High-Fiber Vitality Plate',
        items: `• ${breakfastVeg}<br/>• Handful of roasted sunflower & chia seeds`,
        benefit: '🌾 Complex low-GI carbohydrates preventing mid-morning fatigue'
      },
      {
        timing: '🍲 Peak Agni Window (12:30 – 1:30 PM)',
        isYogaSync: false,
        syncLabel: 'Main Lunch',
        title: 'Wholesome Ayurvedic Balanced Thali',
        items: `• ${lunchVeg}<br/>• Fresh cucumber & carrot salad seasoned with cold-pressed mustard or sesame oil`,
        benefit: '🔥 Maximizes digestive fire (Agni) when systemic enzymes are at daily peak'
      },
      {
        timing: '☕ Adrenal Support (4:30 – 5:30 PM)',
        isYogaSync: false,
        syncLabel: 'Tea & Snack',
        title: 'Adrenal Balancer & Light Crunch',
        items: `• ${eveningVeg}<br/>• Green tea or cinnamon-clove herbal brew`,
        benefit: '🛡️ Curbs evening cortisol spikes and prevents high-sugar cravings'
      },
      {
        timing: '🌙 Grounding Night (7:00 – 8:00 PM)',
        isYogaSync: false,
        syncLabel: 'Early Dinner',
        title: 'Light Digestible Soup & Golden Milk',
        items: `• ${dinnerVeg}<br/>• 1 cup warm A2 milk with organic turmeric, black pepper & pinch of nutmeg before sleep`,
        benefit: '💤 Stimulates GABA and natural melatonin release for restorative deep sleep'
      }
    ];
  }
}

function renderDailyFoodPlan() {
  const container = document.getElementById('daily-food-plan-container');
  if (!container) return;

  const region = REGIONS_DATA[state.userRegion];
  const regionName = region ? region.name.split('(')[0] : 'Pan-India';
  const { weight } = state.userProfile;
  const numW = parseFloat(weight);

  const hydrationLiters = numW ? (numW * 0.035).toFixed(1) : '2.8';
  const currentDiet = state.userDiet || 'veg';
  const currentFastingType = state.userFastingType || 'intermittent';

  const dietLabels = {
    veg: 'Vegetarian (Plant & Dairy)',
    nonveg: 'Non-Vegetarian (Lean Protein & Fish)',
    vegan: '100% Plant-Based Vegan',
    fasting: `Fasting / Vrat Mode (${getFastingLabel(currentFastingType)})`
  };

  const meals = getDailyMealsForDiet(currentDiet, currentFastingType, state.userRegion);

  const fastingSubtypesHtml = currentDiet === 'fasting' ? `
    <div class="fasting-subtypes-strip" style="margin-top: 10px;">
      <span style="font-size: 11px; font-weight: 700; color: #92400e;">🪔 Select Fasting Protocol:</span>
      <button type="button" class="fasting-subtype-btn ${currentFastingType === 'intermittent' ? 'active' : ''}" onclick="setDiet('fasting', 'intermittent')">⏳ 16:8 Intermittent Fasting</button>
      <button type="button" class="fasting-subtype-btn ${currentFastingType === 'vrat_ekadashi' ? 'active' : ''}" onclick="setDiet('fasting', 'vrat_ekadashi')">🪔 Sacred Vrat / Ekadashi (Phalahari)</button>
      <button type="button" class="fasting-subtype-btn ${currentFastingType === 'navratri_phalahar' ? 'active' : ''}" onclick="setDiet('fasting', 'navratri_phalahar')">🍎 Fruit Fast (Phalahar)</button>
      <button type="button" class="fasting-subtype-btn ${currentFastingType === 'water_detox' ? 'active' : ''}" onclick="setDiet('fasting', 'water_detox')">💧 Liquid & Water Detox</button>
    </div>
  ` : '';

  const logBannerHtml = state.foodPlanLoggedToday ? `
    <div style="background: #ecfdf5; border: 1px solid #86efac; border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px;">🥗</span>
        <strong style="color: #065f46; font-size: 13px;">✓ Today's Food Eating Plan Logged (+25 Green Points Earned)</strong>
      </div>
      <span style="font-size: 11px; color: #047857; font-weight: 700;">Synced with Yoga Recovery Window</span>
    </div>
  ` : '';

  const mealCardsHtml = meals.map(m => `
    <div class="food-meal-card ${m.isYogaSync ? 'yoga-sync' : ''}">
      <div class="meal-timing-label">
        <span>${m.timing}</span>
        <span style="color: ${m.isYogaSync ? '#059669' : '#64748b'};">${m.syncLabel}</span>
      </div>
      <div class="meal-title">${m.title}</div>
      <div class="meal-items-list">${m.items}</div>
      <span class="meal-benefit-pill">${m.benefit}</span>
    </div>
  `).join('');

  const html = `
    <div class="daily-food-section" id="daily-food-plan-section">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="tag-badge tag-emerald">Synchronized Nutrition Protocol</span>
            <span class="tag-badge tag-blue">📍 ${regionName}</span>
            <span class="tag-badge tag-amber">💧 ${hydrationLiters}L Water Target</span>
          </div>
          <h3 style="font-family: var(--font-heading); font-size: 21px; font-weight: 800; color: #0f172a; margin: 6px 0 2px;">
            Daily Food Items Eating Plan: Aligned with Your Yoga Practice
          </h3>
          <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
            Timed Ayurvedic nutrition synchronized with your pre-practice digestion window, post-practice anabolism, and circadian recovery.
          </p>
        </div>

        <button class="btn-secondary" onclick="logFoodItemsPlan()" style="padding: 6px 12px; font-size: 12px;">
          <span>🥗 Log Food Items (+25 Pts)</span>
        </button>
      </div>

      <!-- 1-TAP DIETARY LIFESTYLE & FASTING SWITCHER -->
      <div class="diet-selector-container">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">
            🥗 Select Dietary Mode:
          </span>
          <span style="font-size: 12px; font-weight: 700; color: #047857;">Active: ${dietLabels[currentDiet]}</span>
        </div>
        <div class="diet-tabs-strip">
          <button type="button" class="diet-tab-btn ${currentDiet === 'veg' ? 'active' : ''}" data-diet="veg" onclick="setDiet('veg')">🥗 Vegetarian</button>
          <button type="button" class="diet-tab-btn ${currentDiet === 'nonveg' ? 'active' : ''}" data-diet="nonveg" onclick="setDiet('nonveg')">🍗 Non-Vegetarian</button>
          <button type="button" class="diet-tab-btn ${currentDiet === 'vegan' ? 'active' : ''}" data-diet="vegan" onclick="setDiet('vegan')">🌱 100% Plant-Based Vegan</button>
          <button type="button" class="diet-tab-btn ${currentDiet === 'fasting' ? 'active' : ''}" data-diet="fasting" onclick="setDiet('fasting')">🪔 Fasting / Vrat Mode</button>
        </div>
        ${fastingSubtypesHtml}
      </div>

      ${logBannerHtml}

      <!-- TIMELINE OF MEALS & YOGA SYNCHRONIZATION -->
      <div class="food-meal-timeline">
        ${mealCardsHtml}
      </div>

      <!-- BOTTOM ACTION -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding-top: 16px; border-top: 1px solid var(--border); margin-top: 18px;">
        <button class="btn-primary" onclick="logFoodItemsPlan()" style="padding: 9px 16px; font-size: 13px;">
          <span>✓ Log Food Items Eating Plan (+25 Green Points)</span>
        </button>
        <span style="font-size: 12px; color: var(--text-muted);">
          Food choices are calibrated to your diet (${dietLabels[currentDiet]}), region (${regionName}) and active climate hydration target.
        </span>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function logFoodItemsPlan() {
  addGreenPoints(25);
  state.foodPlanLoggedToday = true;
  const todayStr = new Date().toISOString().slice(0, 10);
  localStorage.setItem('prana_food_logged_date', todayStr);

  synth.playSuccessChime();
  renderDailyFoodPlan();
  renderWhatToDoNext();
  showToast('🥗 Food items eating plan logged! +25 Green Points added to your wallet.');
}

function jumpToSection(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.style.transition = 'outline 0.3s ease';
  el.style.outline = '3px solid #10b981';
  setTimeout(() => {
    el.style.outline = 'none';
  }, 1600);
}

// Global window exposure for all inline actions
window.setYogaTime = setYogaTime;
window.renderWhatToDoNext = renderWhatToDoNext;
window.renderDailyYogaPlan = renderDailyYogaPlan;
window.renderDailyFoodPlan = renderDailyFoodPlan;
window.toggleYogaPoseDone = toggleYogaPoseDone;
window.completeDailyYogaPlan = completeDailyYogaPlan;
window.resetDailyYogaPlan = resetDailyYogaPlan;
window.speakYogaPose = speakYogaPose;
window.speakEntireYogaRoutine = speakEntireYogaRoutine;
window.speakWhatToDoNext = speakWhatToDoNext;
window.logFoodItemsPlan = logFoodItemsPlan;
window.jumpToSection = jumpToSection;

// --- GENDER PHYSIOLOGY HUB ---
function setGender(gender) {
  state.userGender = gender;
  localStorage.setItem('prana_gender', gender);

  document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.gender === gender);
  });

  renderGenderSection();
  showToast(`Profile updated to: ${gender.toUpperCase()}`);
}

function renderGenderSection() {
  const femaleCard = document.getElementById('gender-female-card');
  const maleCard = document.getElementById('gender-male-card');
  const universalCard = document.getElementById('gender-universal-card');

  if (!femaleCard || !maleCard || !universalCard) return;

  if (state.userGender === 'female') {
    femaleCard.style.display = 'block';
    maleCard.style.display = 'none';
    universalCard.style.display = 'none';
  } else if (state.userGender === 'male') {
    femaleCard.style.display = 'none';
    maleCard.style.display = 'block';
    universalCard.style.display = 'none';
  } else {
    femaleCard.style.display = 'none';
    maleCard.style.display = 'none';
    universalCard.style.display = 'block';
  }
}

function setFemalePhase(phase) {
  state.femaleCycle = phase;
  document.querySelectorAll('.female-phase-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.phase === phase);
  });

  const display = document.getElementById('female-phase-details');
  if (!display) return;

  const phaseDetails = {
    menstrual: {
      title: 'Menstrual Phase (Days 1–5): Low Hormones, Recovery Mode',
      training: 'Restorative Yin Yoga, gentle spinal mobilization, 20-minute slow walking. Avoid high-load abdominal strain.',
      food: 'Iron-rich lentils (Kala Chana, Methi), warm bone broth or beetroot soup, vitamin C for iron absorption.'
    },
    follicular: {
      title: 'Follicular Phase (Days 6–13): Estrogen Rising, Peak Energy',
      training: 'High-Intensity Interval Training (HIIT), heavy resistance training, progressive overload squats & lunges.',
      food: 'Lean proteins, fermented sprouts, pumpkin and flax seeds to support natural estrogen balance.'
    },
    ovulatory: {
      title: 'Ovulatory Phase (Days 14–17): Peak Strength & Endurance',
      training: 'Personal records, sprint intervals, high-coordination functional movements. Extra warmup for lax ligaments.',
      food: 'Cruciferous vegetables (broccoli, cabbage), magnesium-rich nuts, high antioxidant berries & greens.'
    },
    luteal: {
      title: 'Luteal Phase (Days 18–28): Progesterone Dominant, Caloric Need +200 kcal',
      training: 'Moderate hypertrophy, pilates, steady-state zone 2 cardio. Increase recovery intervals.',
      food: 'Sunflower & sesame seeds, complex carbohydrates (sweet potatoes, jowar rotis) to prevent cravings.'
    }
  };

  const current = phaseDetails[phase];
  display.innerHTML = `
    <div style="background: #fff1f2; border: 1px solid #fecdd3; padding: 16px; border-radius: var(--radius-md); margin-top: 14px;">
      <h4 style="font-size: 15px; font-weight: 800; color: #9f1239; margin-bottom: 6px;">${current.title}</h4>
      <p style="font-size: 12px; color: #881337; margin-bottom: 8px;"><strong>🏋️ Exercise Protocol:</strong> ${current.training}</p>
      <p style="font-size: 12px; color: #881337;"><strong>🥗 Nutrition & Seed Cycling:</strong> ${current.food}</p>
    </div>
  `;
}

// --- EMOTION-BASED KINETIC FITNESS & CAMERA SCANNER ---
let cameraStream = null;

async function startCameraScan() {
  const videoEl = document.getElementById('camera-video');
  const overlayEl = document.getElementById('camera-overlay');
  const resultEl = document.getElementById('mood-scan-result');

  if (overlayEl) {
    overlayEl.innerHTML = `
      <div style="font-size: 32px; animation: spin 1s infinite linear;">🔍</div>
      <p style="font-size: 13px; font-weight: 700; margin-top: 10px;">Scanning facial micro-tensions & autonomic stress...</p>
    `;
  }

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoEl) {
        videoEl.srcObject = cameraStream;
        videoEl.play();
      }
    }
  } catch (err) {
    console.warn('Camera blocked or unavailable, using sensor simulation:', err);
  }

  // Simulate autonomic facial biometrics
  setTimeout(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    if (overlayEl) {
      overlayEl.style.display = 'none';
    }

    const moods = [
      {
        emotion: 'Elevated Sympathetic Stress / High Cortisol',
        level: 'Stress Index: 78/100',
        prescription: '10-minute Diaphragmatic Box Breathing + Supine Hamstring Spinal Release',
        color: '#dc2626',
        bg: '#fef2f2'
      },
      {
        emotion: 'Mental Fatigue & Desk Lethargy',
        level: 'Energy Index: 38/100',
        prescription: '7-minute High-Cadence Jumping Jacks + Neck Extensor Isometric Activation',
        color: '#d97706',
        bg: '#fffbeb'
      },
      {
        emotion: 'Calm, Grounded & Ready for Hypertrophy',
        level: 'Balance Index: 91/100',
        prescription: '25-minute Full-Body Dumbbell Compound Tri-Set',
        color: '#059669',
        bg: '#f0fdf4'
      }
    ];

    const chosen = moods[Math.floor(Math.random() * moods.length)];

    if (resultEl) {
      resultEl.innerHTML = `
        <div style="background: ${chosen.bg}; border: 1px solid ${chosen.color}; padding: 18px; border-radius: var(--radius-md); margin-top: 16px;">
          <span style="color: ${chosen.color}; font-size: 11px; font-weight: 800; text-transform: uppercase;">Facial Tension Diagnostics Complete</span>
          <h4 style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 4px 0;">${chosen.emotion}</h4>
          <p style="font-size: 12px; font-weight: 700; color: ${chosen.color}; margin-bottom: 8px;">${chosen.level}</p>
          <p style="font-size: 13px; color: #334155;"><strong>Target Movement:</strong> ${chosen.prescription}</p>
          <button class="btn-primary" style="margin-top: 12px;" onclick="addGreenPoints(20); showToast('Mood routine logged! +20 Green Points');">
            <span>✓ Start Calibrated Session (+20 Pts)</span>
          </button>
        </div>
      `;
    }

    synth.playSuccessChime();
    speakCoach(`Biometric scan complete. Your diagnostic indicates: ${chosen.emotion}. Recommended protocol: ${chosen.prescription}`);
  }, 2500);
}

// --- AI MICRO-GOALS ENGINE & COUNTDOWN TIMERS ---
function startMicroGoal(id, seconds, label) {
  clearInterval(state.activeMicroTimer);
  state.microTimerRemaining = seconds;

  const timerCard = document.getElementById('active-timer-card');
  const timerTitle = document.getElementById('active-timer-title');
  const timerCount = document.getElementById('active-timer-countdown');

  if (timerCard && timerTitle && timerCount) {
    timerCard.style.display = 'block';
    timerTitle.innerText = label;
    timerCount.innerText = `${state.microTimerRemaining}s remaining`;
    timerCard.scrollIntoView({ behavior: 'smooth' });
  }

  showToast(`⏱️ Started: ${label} (${seconds}s)`);
  synth.playTimerTick();
  speakCoach(`Starting ${label}. Get into position and focus on steady breathing.`);

  state.activeMicroTimer = setInterval(() => {
    state.microTimerRemaining--;
    if (timerCount) {
      timerCount.innerText = `${state.microTimerRemaining}s remaining`;
    }

    if (state.microTimerRemaining <= 3 && state.microTimerRemaining > 0) {
      synth.playTimerTick();
    }

    if (state.microTimerRemaining <= 0) {
      clearInterval(state.activeMicroTimer);
      state.activeMicroTimer = null;
      if (timerCard) timerCard.style.display = 'none';
      addGreenPoints(15);
      synth.playSuccessChime();
      speakCoach(`Goal complete! Well done. You earned 15 Green Points.`);
      showToast(`🎉 Micro-Goal Completed! +15 Green Points added.`);
    }
  }, 1000);
}

function cancelActiveTimer() {
  if (state.activeMicroTimer) {
    clearInterval(state.activeMicroTimer);
    state.activeMicroTimer = null;
  }
  const timerCard = document.getElementById('active-timer-card');
  if (timerCard) timerCard.style.display = 'none';
  showToast('Timer cancelled.');
}

// --- SMARTWATCH TELEMETRY & SLEEP SYNTHESIZER ---
function syncSmartwatch() {
  state.vitals.hr = Math.floor(68 + Math.random() * 16);
  state.vitals.steps += Math.floor(150 + Math.random() * 300);
  state.vitals.calories += Math.floor(15 + Math.random() * 35);
  state.vitals.hrv = Math.floor(58 + Math.random() * 14);

  const hrEl = document.getElementById('vital-hr');
  const stepsEl = document.getElementById('vital-steps');
  const calEl = document.getElementById('vital-cal');
  const hrvEl = document.getElementById('vital-hrv');

  if (hrEl) hrEl.innerText = `${state.vitals.hr} BPM`;
  if (stepsEl) stepsEl.innerText = state.vitals.steps.toLocaleString();
  if (calEl) calEl.innerText = `${state.vitals.calories} kcal`;
  if (hrvEl) hrvEl.innerText = `${state.vitals.hrv} ms`;

  synth.playSuccessChime();
  showToast('⌚ Smartwatch synchronized! Real-time biometrics updated.');
}

function toggleSleepSynth(type) {
  if (state.isAudioSynthPlaying && state.activeSynthType === type) {
    synth.stopAll();
    showToast('Soundscape stopped.');
  } else {
    if (type === 'theta') {
      synth.startThetaDrone();
      showToast('🎶 432 Hz Theta Binaural Wave playing (pure Web Audio)');
    } else if (type === 'rain') {
      synth.startRainPinkNoise();
      showToast('🌧️ Pure Pink Noise Rain Soundscape playing');
    }
  }
}

function updateSynthUI() {
  const thetaBtn = document.getElementById('synth-theta-btn');
  const rainBtn = document.getElementById('synth-rain-btn');

  if (thetaBtn) {
    thetaBtn.classList.toggle('active', state.isAudioSynthPlaying && state.activeSynthType === 'theta');
    thetaBtn.innerText = state.isAudioSynthPlaying && state.activeSynthType === 'theta' ? '⏸️ Stop 432Hz Drone' : '▶️ 432 Hz Theta Binaural Drone';
  }

  if (rainBtn) {
    rainBtn.classList.toggle('active', state.isAudioSynthPlaying && state.activeSynthType === 'rain');
    rainBtn.innerText = state.isAudioSynthPlaying && state.activeSynthType === 'rain' ? '⏸️ Stop Rain' : '▶️ Pink Noise Sleep Rain';
  }
}

// --- EMERGENCY SOS WORKFLOW ---
function openEmergencySOS() {
  const modal = document.getElementById('sos-modal');
  if (!modal) return;
  modal.classList.add('open');
  state.sosCountdown = 10;
  updateSOSCountdownUI();

  synth.playEmergencySiren();
  speakCoach('Emergency alert activated. Dispatch countdown initiated. Tap cancel if this was a false alarm.', 'en-IN');

  clearInterval(state.sosTimerId);
  state.sosTimerId = setInterval(() => {
    state.sosCountdown--;
    updateSOSCountdownUI();

    if (state.sosCountdown <= 3 && state.sosCountdown > 0) {
      synth.playEmergencySiren();
    }

    if (state.sosCountdown <= 0) {
      clearInterval(state.sosTimerId);
      state.sosTimerId = null;
      document.getElementById('sos-status-text').innerText = '🚨 Emergency Contact & 108 Hotline Dispatched!';
      speakCoach('Emergency message and GPS location sent to emergency contacts.');
    }
  }, 1000);
}

function updateSOSCountdownUI() {
  const countEl = document.getElementById('sos-countdown-num');
  if (countEl) {
    countEl.innerText = state.sosCountdown;
  }
}

function closeEmergencySOS() {
  clearInterval(state.sosTimerId);
  state.sosTimerId = null;
  const modal = document.getElementById('sos-modal');
  if (modal) modal.classList.remove('open');
  showToast('Emergency alert aborted.');
}

function simulateVitalsSpike() {
  state.vitals.hr = 152;
  const hrEl = document.getElementById('vital-hr');
  if (hrEl) hrEl.innerText = '152 BPM (Tachycardia Anomaly)';
  openEmergencySOS();
}

// --- COMMUNITY SQUADS & CHEER BUTTON ---
function cheerSquad(squadName) {
  addGreenPoints(10);
  synth.playSuccessChime();
  showToast(`👏 You cheered the ${squadName}! +10 Green Points`);
}

// --- GREEN POINTS & REWARDS STORE ---
function addGreenPoints(amount) {
  state.greenPoints += amount;
  localStorage.setItem('prana_points', state.greenPoints.toString());
  if (state.currentUser) {
    state.currentUser.greenPoints = state.greenPoints;
    updateUserInDB(state.currentUser);
  }
  updatePointsUI();
}

function updatePointsUI() {
  const pointsBadge = document.getElementById('header-points-badge');
  const pointsStore = document.getElementById('store-points-balance');

  if (pointsBadge) pointsBadge.innerText = `🌱 ${state.greenPoints} Pts`;
  if (pointsStore) pointsStore.innerText = state.greenPoints.toString();
}

function redeemReward(name, cost) {
  if (state.greenPoints < cost) {
    showToast(`❌ Insufficient Green Points. You need ${cost} points.`);
    return;
  }
  state.greenPoints -= cost;
  localStorage.setItem('prana_points', state.greenPoints.toString());
  updatePointsUI();
  synth.playSuccessChime();
  showToast(`🎉 Voucher claimed: ${name}! Code PRANA-${Math.floor(1000 + Math.random() * 9000)} unlocked.`);
}

// ==========================================================================
// 🧘 KINETIC YOGA & EXERCISE ANIMATION ENGINE
// ==========================================================================

function getPoseAnimKey(poseId = '', poseName = '') {
  const str = `${poseId} ${poseName}`.toLowerCase();
  if (str.includes('cat') || str.includes('cow') || str.includes('marjary')) return 'cat_cow';
  if (str.includes('dog') || str.includes('adho') || str.includes('parvat')) return 'downward_dog';
  if (str.includes('warrior') || str.includes('vira') || str.includes('lunge') && str.includes('high')) return 'warrior2';
  if (str.includes('triangle') || str.includes('trikon')) return 'triangle';
  if (str.includes('cobra') || str.includes('bhujang') || str.includes('upward') || str.includes('locust')) return 'cobra';
  if (str.includes('bridge') || str.includes('setu') || str.includes('pelvic')) return 'bridge';
  if (str.includes('child') || str.includes('balasana') || str.includes('savasana') || str.includes('rest')) return 'childs_pose';
  if (str.includes('low_lunge') || str.includes('anjaneya') || str.includes('ashwa') || str.includes('crescent')) return 'low_lunge';
  if (str.includes('tree') || str.includes('vriksh') || str.includes('dancer') || str.includes('eagle') || str.includes('garud')) return 'tree_pose';
  if (str.includes('boat') || str.includes('nava') || str.includes('core') || str.includes('plank')) return 'boat_pose';
  if (str.includes('pigeon') || str.includes('kapot') || str.includes('butterfly') || str.includes('baddha') || str.includes('hip')) return 'pigeon_pose';
  if (str.includes('pranayama') || str.includes('kapal') || str.includes('anulom') || str.includes('breath') || str.includes('nadi')) return 'pranayama';
  if (str.includes('wall') || str.includes('angel') || str.includes('scapula') || str.includes('shoulder')) return 'wall_angels';
  if (str.includes('squat') || str.includes('mala') || str.includes('chair') || str.includes('utkat')) return 'squats';
  if (str.includes('inversion') || str.includes('viparita') || str.includes('wall_legs') || str.includes('sarvang')) return 'inversion';
  if (str.includes('twist') || str.includes('matsyend') || str.includes('spine')) return 'spinal_twist';
  return 'cat_cow';
}

function renderPoseAnimationSVG(animKey, mode = 'sm') {
  const isLg = mode === 'lg';
  const width = isLg ? '100%' : '100%';
  const height = isLg ? '220' : '100%';
  const strokeThick = isLg ? 5 : 4;

  switch (animKey) {
    case 'cat_cow':
      return `
        <svg viewBox="0 0 160 110" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <!-- Floor mat -->
          <line x1="15" y1="95" x2="145" y2="95" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
          
          <!-- Animated Inhale/Exhale Aura -->
          <circle cx="80" cy="74" r="${isLg ? 24 : 16}" fill="#ecfdf5" opacity="0.65" style="animation: childsBreatheGlow 4s infinite ease-in-out;" />
          
          <!-- Limbs (Arms vertical & Thighs vertical) -->
          <line x1="45" y1="95" x2="45" y2="70" stroke="#0f766e" stroke-width="${strokeThick}" stroke-linecap="round" />
          <line x1="115" y1="95" x2="115" y2="70" stroke="#0f766e" stroke-width="${strokeThick}" stroke-linecap="round" />
          
          <!-- Undulating Spine Wave -->
          <path d="M 45,70 Q 80,86 115,70" fill="none" stroke="#10b981" stroke-width="${strokeThick + 2}" stroke-linecap="round" style="animation: catCowSpineWave 4s infinite ease-in-out;" />
          
          <!-- Kinetic Head -->
          <g style="animation: catCowHeadMove 4s infinite ease-in-out;">
            <circle cx="32" cy="62" r="${isLg ? 10 : 8}" fill="#047857" />
            <line x1="32" y1="62" x2="45" y2="70" stroke="#047857" stroke-width="${strokeThick - 1}" stroke-linecap="round" />
          </g>
          
          <!-- Pelvis / Tail -->
          <g style="animation: catCowTailMove 4s infinite ease-in-out;">
            <circle cx="124" cy="68" r="${isLg ? 7 : 5}" fill="#0f766e" />
          </g>
          
          ${isLg ? `
            <text x="80" y="24" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="10" font-weight="700" fill="#059669">
              INHALE: Cow (Drop Belly) ⟷ EXHALE: Cat (Arch Spine)
            </text>
          ` : ''}
        </svg>
      `;

    case 'downward_dog':
      return `
        <svg viewBox="0 0 160 110" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <line x1="15" y1="95" x2="145" y2="95" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
          
          <g style="animation: downwardDogPulse 3.5s infinite ease-in-out;">
            <!-- Body Inverted V: Hands at (40,95), Hips at (80,38), Feet at (122,95) -->
            <!-- Back & Arms -->
            <line x1="40" y1="95" x2="80" y2="38" stroke="#047857" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
            <!-- Legs -->
            <line x1="80" y1="38" x2="122" y2="95" stroke="#059669" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
            <!-- Head tucked -->
            <circle cx="56" cy="64" r="${isLg ? 9 : 7}" fill="#0f766e" />
            <!-- Pelvis Apex marker -->
            <circle cx="80" cy="38" r="${isLg ? 7 : 5}" fill="#10b981" />
          </g>
          
          <!-- Dynamic heel press indicator -->
          <g style="animation: dogHeelPress 3.5s infinite ease-in-out;">
            <line x1="122" y1="95" x2="132" y2="95" stroke="#10b981" stroke-width="4" stroke-linecap="round" />
          </g>
          
          ${isLg ? `
            <text x="80" y="20" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="10" font-weight="700" fill="#047857">
              Apex Hips Lifted • Press Chest Gently Toward Thighs
            </text>
          ` : ''}
        </svg>
      `;

    case 'warrior2':
      return `
        <svg viewBox="0 0 160 110" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <line x1="15" y1="95" x2="145" y2="95" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
          
          <g style="animation: warriorLungePulse 3s infinite ease-in-out;">
            <!-- Front bent leg: Foot at (50,95), Knee at (50,65), Hip at (85,65) -->
            <line x1="50" y1="95" x2="50" y2="65" stroke="#059669" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
            <line x1="50" y1="65" x2="85" y2="65" stroke="#059669" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
            
            <!-- Back straight leg: Hip (85,65) to back foot (130,95) -->
            <line x1="85" y1="65" x2="130" y2="95" stroke="#0f766e" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
            
            <!-- Torso: Hip (85,65) to Shoulders (85,38) -->
            <line x1="85" y1="65" x2="85" y2="38" stroke="#047857" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
            <circle cx="85" cy="26" r="${isLg ? 9 : 7}" fill="#047857" />
            
            <!-- Horizontal Arms: reaching left (front) and right (back) -->
            <g style="animation: warriorArmsBreathe 3s infinite ease-in-out;">
              <line x1="35" y1="42" x2="135" y2="42" stroke="#10b981" stroke-width="${strokeThick}" stroke-linecap="round" />
              <circle cx="35" cy="42" r="3" fill="#10b981" />
              <circle cx="135" cy="42" r="3" fill="#10b981" />
            </g>
          </g>
          
          ${isLg ? `
            <text x="80" y="16" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="10" font-weight="700" fill="#047857">
              Front Knee 90° Stacked • Open Chest & Gaze Forward
            </text>
          ` : ''}
        </svg>
      `;

    case 'triangle':
      return `
        <svg viewBox="0 0 160 110" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <line x1="15" y1="95" x2="145" y2="95" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
          
          <!-- Legs wide triangle -->
          <line x1="45" y1="95" x2="80" y2="60" stroke="#047857" stroke-width="${strokeThick}" stroke-linecap="round" />
          <line x1="125" y1="95" x2="80" y2="60" stroke="#059669" stroke-width="${strokeThick}" stroke-linecap="round" />
          
          <!-- Hinging torso -->
          <g style="animation: triangleSideStretch 3.5s infinite ease-in-out; transform-origin: 80px 60px;">
            <line x1="80" y1="60" x2="55" y2="45" stroke="#0f766e" stroke-width="${strokeThick}" stroke-linecap="round" />
            <circle cx="50" cy="38" r="${isLg ? 8 : 6}" fill="#047857" />
            <!-- Arms vertical reach line -->
            <line x1="50" y1="78" x2="60" y2="16" stroke="#10b981" stroke-width="${strokeThick}" stroke-linecap="round" />
            <circle cx="60" cy="16" r="3.5" fill="#f59e0b" />
          </g>
          
          ${isLg ? `
            <text x="80" y="15" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="10" font-weight="700" fill="#059669">
              Side Rib Expansion • Align Torso in One Vertical Plane
            </text>
          ` : ''}
        </svg>
      `;

    case 'cobra':
      return `
        <svg viewBox="0 0 160 110" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <line x1="15" y1="95" x2="145" y2="95" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
          
          <!-- Legs resting prone -->
          <line x1="90" y1="95" x2="140" y2="95" stroke="#059669" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
          
          <!-- Rising Chest & Head -->
          <g style="animation: cobraRiseChest 4s infinite ease-in-out; transform-origin: 90px 95px;">
            <!-- Curved Spine -->
            <path d="M 90,95 Q 65,85 52,50" fill="none" stroke="#10b981" stroke-width="${strokeThick + 2}" stroke-linecap="round" />
            <!-- Head lifting -->
            <circle cx="50" cy="36" r="${isLg ? 9 : 7}" fill="#047857" />
            <!-- Arms pressing floor -->
            <line x1="58" y1="62" x2="52" y2="95" stroke="#0f766e" stroke-width="${strokeThick}" stroke-linecap="round" />
            <line x1="52" y1="95" x2="42" y2="95" stroke="#0f766e" stroke-width="${strokeThick}" stroke-linecap="round" />
          </g>
          
          ${isLg ? `
            <text x="80" y="20" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="10" font-weight="700" fill="#059669">
              Inhale & Broaden Collarbones • Roll Shoulders Away From Ears
            </text>
          ` : ''}
        </svg>
      `;

    case 'bridge':
      return `
        <svg viewBox="0 0 160 110" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <line x1="15" y1="95" x2="145" y2="95" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
          
          <!-- Grounded Head and Shoulders at (35, 95) -->
          <circle cx="28" cy="91" r="${isLg ? 9 : 7}" fill="#047857" />
          <line x1="35" y1="95" x2="70" y2="95" stroke="#0f766e" stroke-width="${strokeThick}" stroke-linecap="round" />
          <!-- Feet at (125, 95) -->
          <line x1="120" y1="95" x2="135" y2="95" stroke="#059669" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
          
          <!-- Elevated Pelvis & Thigh Bridge -->
          <g style="animation: bridgePelvisElevate 3.8s infinite ease-in-out;">
            <path d="M 38,92 Q 75,50 115,62" fill="none" stroke="#10b981" stroke-width="${strokeThick + 2}" stroke-linecap="round" />
            <!-- Shins vertical -->
            <line x1="115" y1="62" x2="125" y2="95" stroke="#059669" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
            <!-- Glute activation indicator -->
            <circle cx="78" cy="56" r="${isLg ? 8 : 6}" fill="#f59e0b" opacity="0.8" />
          </g>
          
          ${isLg ? `
            <text x="80" y="24" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="10" font-weight="700" fill="#059669">
              Drive Glutes Upward • Ground Shoulders • Relax Cervical Spine
            </text>
          ` : ''}
        </svg>
      `;

    case 'childs_pose':
      return `
        <svg viewBox="0 0 160 110" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <line x1="15" y1="95" x2="145" y2="95" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
          
          <!-- Pulsing calm breath aura -->
          <ellipse cx="80" cy="80" rx="${isLg ? 45 : 35}" ry="${isLg ? 25 : 18}" fill="#d1fae5" style="animation: childsBreatheGlow 4s infinite ease-in-out;" />
          
          <!-- Knees and folded lower body -->
          <!-- Feet (125,95), Knees (95,95), Hips on heels (120,78) -->
          <path d="M 95,95 L 125,95 L 120,78" fill="none" stroke="#047857" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
          <!-- Torso folding forward onto thighs -->
          <path d="M 120,78 Q 85,74 55,90" fill="none" stroke="#10b981" stroke-width="${strokeThick + 2}" stroke-linecap="round" />
          <!-- Head resting on floor -->
          <circle cx="48" cy="88" r="${isLg ? 8 : 6}" fill="#0f766e" />
          <!-- Arms reaching forward along floor -->
          <line x1="55" y1="88" x2="22" y2="95" stroke="#059669" stroke-width="${strokeThick}" stroke-linecap="round" />
          
          ${isLg ? `
            <text x="80" y="25" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="10" font-weight="700" fill="#047857">
              Deep Diaphragmatic Breath • Surrender Spine to Gravity
            </text>
          ` : ''}
        </svg>
      `;

    case 'tree_pose':
      return `
        <svg viewBox="0 0 160 110" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <line x1="30" y1="98" x2="130" y2="98" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
          
          <!-- Subtle balance sway -->
          <g style="animation: treeBalanceSway 4s infinite ease-in-out; transform-origin: 80px 98px;">
            <!-- Grounded Standing Leg -->
            <line x1="80" y1="98" x2="80" y2="58" stroke="#047857" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
            
            <!-- Bent Leg placed on inner thigh -->
            <path d="M 80,58 L 56,68 L 78,74" fill="none" stroke="#059669" stroke-width="${strokeThick}" stroke-linecap="round" />
            
            <!-- Upright Spine & Head -->
            <line x1="80" y1="58" x2="80" y2="34" stroke="#047857" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
            <circle cx="80" cy="22" r="${isLg ? 9 : 7}" fill="#0f766e" />
            
            <!-- Anjali Mudra (Prayer hands at chest or reaching overhead) -->
            <line x1="72" y1="42" x2="80" y2="38" stroke="#10b981" stroke-width="${strokeThick}" stroke-linecap="round" />
            <line x1="88" y1="42" x2="80" y2="38" stroke="#10b981" stroke-width="${strokeThick}" stroke-linecap="round" />
            <circle cx="80" cy="38" r="3.5" fill="#f59e0b" />
          </g>
          
          ${isLg ? `
            <text x="80" y="14" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="10" font-weight="700" fill="#059669">
              Fix Drishti (Gaze) on One Still Point • Root Through Four Corners of Foot
            </text>
          ` : ''}
        </svg>
      `;

    case 'boat_pose':
      return `
        <svg viewBox="0 0 160 110" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <line x1="20" y1="95" x2="140" y2="95" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
          
          <!-- Sitting bones balance apex -->
          <circle cx="80" cy="85" r="${isLg ? 6 : 4}" fill="#0f766e" />
          
          <!-- Core tension pulse -->
          <g style="animation: boatCoreTension 2.5s infinite ease-in-out; transform-origin: 80px 85px;">
            <!-- Torso angled back -->
            <line x1="80" y1="85" x2="52" y2="48" stroke="#047857" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
            <circle cx="48" cy="38" r="${isLg ? 8 : 6}" fill="#047857" />
            
            <!-- Legs angled up -->
            <line x1="80" y1="85" x2="120" y2="48" stroke="#059669" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
            
            <!-- Arms horizontal parallel to floor -->
            <line x1="62" y1="58" x2="108" y2="58" stroke="#10b981" stroke-width="${strokeThick}" stroke-linecap="round" />
            
            <!-- Golden core indicator -->
            <circle cx="76" cy="74" r="${isLg ? 8 : 6}" fill="#f59e0b" opacity="0.85" />
          </g>
          
          ${isLg ? `
            <text x="80" y="20" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="10" font-weight="700" fill="#047857">
              Balance on Sitting Bones • Lift Sternum • Activate Deep Transverse Abdominis
            </text>
          ` : ''}
        </svg>
      `;

    case 'pranayama':
      return `
        <svg viewBox="0 0 160 110" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="80" cy="92" rx="45" ry="10" fill="#e2e8f0" />
          
          <!-- Cross-legged Base -->
          <path d="M 45,90 Q 80,96 115,90" fill="none" stroke="#047857" stroke-width="${strokeThick + 2}" stroke-linecap="round" />
          <line x1="80" y1="90" x2="80" y2="48" stroke="#059669" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
          <circle cx="80" cy="35" r="${isLg ? 10 : 8}" fill="#0f766e" />
          
          <!-- Vishnu Mudra Hand at Face -->
          <path d="M 80,55 Q 88,48 83,40" fill="none" stroke="#10b981" stroke-width="${strokeThick}" stroke-linecap="round" />
          
          <!-- Animated Pranic energy particles flowing -->
          <circle cx="72" cy="40" r="3" fill="#10b981" style="animation: pranaParticleFlowLeft 3s infinite ease-in-out;" />
          <circle cx="88" cy="40" r="3" fill="#3b82f6" style="animation: pranaParticleFlowRight 3s infinite ease-in-out;" />
          
          ${isLg ? `
            <text x="80" y="16" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="10" font-weight="700" fill="#059669">
              Left Nostril (Ida / Cooling) ⟷ Right Nostril (Pingala / Vitality)
            </text>
          ` : ''}
        </svg>
      `;

    case 'wall_angels':
      return `
        <svg viewBox="0 0 160 110" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <!-- Vertical Wall Line -->
          <line x1="125" y1="15" x2="125" y2="98" stroke="#94a3b8" stroke-width="4" stroke-dasharray="4 4" />
          
          <!-- Upright Standing Figure -->
          <line x1="105" y1="98" x2="105" y2="35" stroke="#047857" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
          <circle cx="105" cy="22" r="${isLg ? 9 : 7}" fill="#0f766e" />
          
          <!-- Gliding Arms from W to Y -->
          <g style="animation: wallAngelArmsGlide 3.5s infinite ease-in-out;">
            <path d="M 65,55 L 85,50 L 105,42" fill="none" stroke="#10b981" stroke-width="${strokeThick}" stroke-linecap="round" />
            <circle cx="65" cy="55" r="4" fill="#10b981" />
          </g>
          
          ${isLg ? `
            <text x="65" y="18" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="10" font-weight="700" fill="#047857">
              Keep Elbows & Wrists Against Wall • Glide Up Into Y
            </text>
          ` : ''}
        </svg>
      `;

    case 'squats':
      return `
        <svg viewBox="0 0 160 110" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <line x1="20" y1="98" x2="140" y2="98" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
          
          <g style="animation: squatLowerRise 3.5s infinite ease-in-out;">
            <!-- Lowering Hips & Thighs at 90° -->
            <line x1="60" y1="98" x2="60" y2="70" stroke="#047857" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
            <line x1="60" y1="70" x2="90" y2="70" stroke="#059669" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
            
            <!-- Torso tall with arms forward -->
            <line x1="90" y1="70" x2="82" y2="36" stroke="#047857" stroke-width="${strokeThick + 1}" stroke-linecap="round" />
            <circle cx="80" cy="24" r="${isLg ? 9 : 7}" fill="#0f766e" />
            
            <line x1="82" y1="42" x2="48" y2="42" stroke="#10b981" stroke-width="${strokeThick}" stroke-linecap="round" />
          </g>
          
          ${isLg ? `
            <text x="80" y="15" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="10" font-weight="700" fill="#047857">
              Knees Track Over Toes • Chest Proud • Core Braced
            </text>
          ` : ''}
        </svg>
      `;

    default: // Cat-Cow / General movement fallback
      return `
        <svg viewBox="0 0 160 110" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <line x1="15" y1="95" x2="145" y2="95" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
          <line x1="45" y1="95" x2="45" y2="70" stroke="#0f766e" stroke-width="${strokeThick}" stroke-linecap="round" />
          <line x1="115" y1="95" x2="115" y2="70" stroke="#0f766e" stroke-width="${strokeThick}" stroke-linecap="round" />
          <path d="M 45,70 Q 80,86 115,70" fill="none" stroke="#10b981" stroke-width="${strokeThick + 2}" stroke-linecap="round" style="animation: catCowSpineWave 4s infinite ease-in-out;" />
          <circle cx="32" cy="62" r="${isLg ? 9 : 7}" fill="#047857" style="animation: catCowHeadMove 4s infinite ease-in-out;" />
        </svg>
      `;
  }
}

// --- POSE ANIMATION MODAL CONTROLS ---

let breathPacerInterval = null;
const BREATH_PHASES = [
  { text: 'Inhale (4s)', sub: 'Breathe deep into diaphragm', color: '#10b981' },
  { text: 'Hold (2s)', sub: 'Retain oxygen & lengthen spine', color: '#d97706' },
  { text: 'Exhale (4s)', sub: 'Release tension completely', color: '#3b82f6' },
  { text: 'Ground (2s)', sub: 'Rest in pure awareness', color: '#6366f1' }
];
let breathPhaseIndex = 0;

function startBreathPacerAnimation() {
  if (breathPacerInterval) clearInterval(breathPacerInterval);
  breathPhaseIndex = 0;
  updateBreathPacerUI();
  breathPacerInterval = setInterval(() => {
    breathPhaseIndex = (breathPhaseIndex + 1) % BREATH_PHASES.length;
    updateBreathPacerUI();
  }, 3000);
}

function updateBreathPacerUI() {
  const label = document.getElementById('breath-pacer-text');
  const sub = document.getElementById('breath-pacer-sub');
  if (!label || !sub) return;
  const phase = BREATH_PHASES[breathPhaseIndex];
  label.innerText = phase.text;
  label.style.color = phase.color;
  sub.innerText = phase.sub;
}

function openPoseAnimationModal(poseId, routineKey = null) {
  const currentKey = routineKey || state.yogaTime || '20';
  const routine = YOGA_ROUTINES_DATA[currentKey];
  let pose = null;
  let poseIndex = 0;

  if (routine && routine.poses) {
    const idx = routine.poses.findIndex(p => p.id === poseId);
    if (idx !== -1) {
      pose = routine.poses[idx];
      poseIndex = idx;
    }
  }

  // Fallback for custom problem healer poses or micro goals
  if (!pose) {
    const cleanName = poseId.replace(/^pose_\d+_/, '').replace(/_/g, ' ');
    pose = {
      id: poseId,
      name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
      sanskrit: 'Kinesiological Practice',
      duration: '3.0 min',
      target: 'Spinal Alignment & Neuro-Fascial Release',
      cue: 'Synchronize rhythmic inhalation and exhalation. Maintain gentle muscle activation without strain.',
      benefit: 'Stimulates vital microcirculation, releases cellular adhesions, and calms central nervous tone.',
      icon: '🧘'
    };
  }

  state.activeModalPose = pose;
  state.activeModalRoutine = routine;
  state.activeModalPoseIndex = poseIndex;

  // Populate modal UI (supporting both semantic ID patterns)
  const titleEl = document.getElementById('pose-modal-name') || document.getElementById('pose-modal-title');
  const sanskritEl = document.getElementById('pose-modal-sanskrit');
  const targetEl = document.getElementById('pose-modal-target') || document.getElementById('pose-modal-badge-target');
  const durationEl = document.getElementById('pose-modal-duration') || document.getElementById('pose-modal-badge-time');
  const cueEl = document.getElementById('pose-modal-cue') || document.getElementById('pose-modal-cue-text');
  const benefitEl = document.getElementById('pose-modal-benefit') || document.getElementById('pose-modal-benefit-text');
  const cautionEl = document.getElementById('pose-modal-caution');
  const counterEl = document.getElementById('pose-modal-counter');
  const containerEl = document.getElementById('pose-animation-svg-container') || document.getElementById('pose-modal-svg-container');
  const markDoneBtn = document.getElementById('btn-modal-mark-done');
  const markDoneBtnText = document.getElementById('pose-modal-done-btn-text');

  if (titleEl) titleEl.innerText = `${pose.icon ? pose.icon + ' ' : ''}${pose.name}`;
  if (sanskritEl) sanskritEl.innerText = pose.sanskrit || 'Classical Form';
  if (targetEl) targetEl.innerText = `🎯 Target: ${pose.target}`;
  if (durationEl) durationEl.innerText = `⏱️ ${pose.duration}`;
  if (cueEl) cueEl.innerText = pose.cue;
  if (benefitEl) benefitEl.innerText = pose.benefit;
  if (cautionEl) {
    cautionEl.innerText = pose.caution || 'Maintain slow, diaphragmatic breathing. Never force past your pain threshold or compromise joint alignment.';
  }

  if (counterEl && routine && routine.poses && routine.poses.length > 0) {
    counterEl.innerText = `Pose ${poseIndex + 1} of ${routine.poses.length}`;
  }

  const isDone = state.completedYogaPoseIds && state.completedYogaPoseIds.includes(pose.id);
  const doneLabel = isDone ? '✓ Pose Completed' : '✓ Mark Pose Done (+5 Pts)';
  if (markDoneBtnText) {
    markDoneBtnText.innerText = doneLabel;
  }
  if (markDoneBtn) {
    markDoneBtn.innerHTML = `<span>${doneLabel}</span>`;
    markDoneBtn.className = isDone ? 'btn-primary' : 'btn-secondary';
  }

  // Render High-Resolution Kinetic Animated SVG
  if (containerEl) {
    const animKey = getPoseAnimKey(pose.id, pose.name);
    containerEl.innerHTML = renderPoseAnimationSVG(animKey, 'lg');
  }

  // Open modal
  const modal = document.getElementById('pose-animation-modal');
  if (modal) {
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }

  // Start breathing pacer
  startBreathPacerAnimation();

  // Play gentle bell sound
  synth.playSingingBowlTone(260, 1.2);
}

function closePoseAnimationModal() {
  const modal = document.getElementById('pose-animation-modal');
  if (modal) {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }
  if (breathPacerInterval) clearInterval(breathPacerInterval);
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

function navigateModalPose(direction) {
  const routine = state.activeModalRoutine;
  if (!routine || !routine.poses || routine.poses.length === 0) return;
  const newIndex = (state.activeModalPoseIndex + direction + routine.poses.length) % routine.poses.length;
  const nextPose = routine.poses[newIndex];
  openPoseAnimationModal(nextPose.id, routine.time.toString());
}

function speakCurrentModalPose() {
  const pose = state.activeModalPose;
  if (!pose) return;
  const msg = `${pose.name}. ${pose.sanskrit}. Target focus: ${pose.target}. Alignment cue: ${pose.cue}. Deep physiological benefit: ${pose.benefit}. Maintain smooth breathing throughout.`;
  speakCoach(msg);
  showToast('🔊 Audio Coach reading alignment cues');
}

function markCurrentModalPoseDone() {
  const pose = state.activeModalPose;
  if (!pose) return;
  toggleYogaPoseDone(pose.id);
  const isDone = state.completedYogaPoseIds && state.completedYogaPoseIds.includes(pose.id);
  const doneLabel = isDone ? '✓ Pose Completed' : '✓ Mark Pose Done (+5 Pts)';
  const markDoneBtn = document.getElementById('btn-modal-mark-done');
  const markDoneBtnText = document.getElementById('pose-modal-done-btn-text');
  if (markDoneBtnText) {
    markDoneBtnText.innerText = doneLabel;
  }
  if (markDoneBtn) {
    markDoneBtn.innerHTML = `<span>${doneLabel}</span>`;
    markDoneBtn.className = isDone ? 'btn-primary' : 'btn-secondary';
  }
  showToast(isDone ? '✓ Pose marked done! +5 Green Points' : 'Pose unmarked');
}

function openExerciseAnimationByKeywords(text = '') {
  const animKey = getPoseAnimKey('', text);
  openPoseAnimationModal(`pose_custom_${animKey}`, state.yogaTime);
}

// ==========================================================================
// 🩺 COMPREHENSIVE SYMPTOM & PROBLEM HEALER DATABASE & ANALYSIS ENGINE
// ==========================================================================

const PROBLEM_HEALING_DATABASE = (typeof window !== 'undefined' && window.PROBLEM_HEALING_DATABASE) ? window.PROBLEM_HEALING_DATABASE : {
  back_pain: {
    key: 'back_pain',
    badge: 'Lumbar Spine & Psoas',
    title: 'Lower Back Pain, Psoas Shortening & Lumbar Disc Compression',
    icon: '🧘',
    rootCause: 'Prolonged sitting (8+ hrs daily) deactivates the gluteus maximus while chronologically shortening the iliopsoas. This tugs the lumbar vertebrae into an unnatural hyper-lordosis, dramatically elevating intradiscal pressure on the L4-L5 and L5-S1 nerve roots.',
    ayurvedicDosha: 'Aggravated Vata in Asthi Dhatu (Bone & Joint degeneration caused by excessive cold, dry, stagnant posture). Also manifests as "Kati Shula" with reduced lumbar lubrication.',
    whatToEat: [
      { food: 'Warm Golden A2 Cow Ghee or Cold-Pressed Sesame Oil (1 tsp with warm meals)', why: 'Lubricates Asthi (bone) channels and pacifies dry Vata nerve pinching.' },
      { food: 'Bone Broth or Rich Moong Dal Moringa Drumstick Soup', why: 'Contains bioavailable collagen peptides, hyaluronic acid, and glycine for disc rehydration.' },
      { food: 'Ashwagandha & Ginger Restorative Night Milk (warm almond or A2 milk)', why: 'Potent natural COX-2 inhibitor reducing nerve root neuroinflammation and muscle spasms.' },
      { food: 'Roasted Sesame Seeds (Til Laddu or Tahini)', why: 'Packed with organic plant calcium, zinc, and magnesium to prevent bone demineralization.' }
    ],
    foodsToAvoid: [
      { food: 'Refrigerated Cold Drinks & Raw Salads at Night', why: 'Exacerbates internal Vata dryness and contracts spinal musculature.' },
      { food: 'Deep-Fried Refined Maida Snacks & Trans Fats', why: 'Triggers systemic pro-inflammatory arachidonic acid cascades.' },
      { food: 'Excessive Nightshades (Eggplants, Raw Bell Peppers)', why: 'Contains solanine compounds that can sensitize inflamed musculoskeletal tissues.' }
    ],
    exercises: [
      {
        id: 'pose_cat_cow_remedial',
        name: 'Cat-Cow Spinal Undulation',
        sanskrit: 'Marjaryasana-Bitilasana',
        duration: '3.5 min',
        target: 'Lumbar Vertebral Decompression',
        cue: 'Inhale, drop belly toward floor while lifting chest. Exhale, tuck tailbone and arch entire spine upward like a dome.',
        benefit: 'Restores synovial fluid flow between vertebrae and breaks chronic erector spinae spasms.',
        animKey: 'cat_cow'
      },
      {
        id: 'pose_bridge_remedial',
        name: 'Glute Activation Bridge Pose',
        sanskrit: 'Setu Bandhasana',
        duration: '3.0 min',
        target: 'Posterior Chain Awakening',
        cue: 'Press heels firmly down. Drive hips toward ceiling by squeezing glutes, relieving lumbar compression.',
        benefit: 'Re-ignites dormant glutes so your lower back no longer carries walking loads.',
        animKey: 'bridge'
      },
      {
        id: 'pose_child_remedial',
        name: 'Supported Lumbar Child\'s Pose',
        sanskrit: 'Balasana with Wide Knees',
        duration: '3.0 min',
        target: 'Sacral Decompression',
        cue: 'Rest hips back on heels, walk fingertips forward, and take 10 slow diaphragmatic breaths into your lower back.',
        benefit: 'Gently stretches the thoracolumbar fascia and calms the autonomic nervous system.',
        animKey: 'childs_pose'
      }
    ],
    measuresToTake: [
      { measure: 'Belt-Line Lumbar Support', detail: 'Place a 2-inch rolled towel or ergonomic lumbar cushion behind your lower back while sitting at your desk.' },
      { measure: 'Warm Mahanarayan Sesame Oil Compress', detail: 'Apply warm sesame oil to lower back for 5 minutes, followed by a hot water bottle for 15 minutes before bed.' },
      { measure: 'Acupressure Point BL-23 & BL-40', detail: 'Gently massage BL-23 (two fingers breadth from spine at belly-button level) and BL-40 (crease behind knee) for 60 seconds.' },
      { measure: 'Side Sleeping with Knee Pillow', detail: 'Sleep on your side with a firm pillow between knees to eliminate pelvic twist and spinal torque.' }
    ],
    recoveryMilestone: 'Noticeable ease in walking within 48 hours; 80% reduction in lumbar stiffness within 10 to 14 days of daily adherence.'
  },

  neck_strain: {
    key: 'neck_strain',
    badge: 'Cervical & Trapezius',
    title: 'Tech-Neck Strain, Cervical Compression & Upper Back Spasm',
    icon: '💻',
    rootCause: 'Bending head forward at 30° to 45° over screens increases the gravitational load on cervical vertebrae C5-C7 from 5 kg to over 22 kg, forcing upper trapezius and levator scapulae muscles into chronic hypertonicity.',
    ayurvedicDosha: 'Aggravated Vata-Pitta in Mamsa (muscle tissue) and Majja Dhatu, producing sharp tension headaches, occipital throbbing, and neck stiffness ("Manya Stambha").',
    whatToEat: [
      { food: 'Magnesium-Rich Pumpkin & Sunflower Seeds', why: 'Essential cofactor for neuromuscular relaxation and muscular acetylcholine regulation.' },
      { food: 'Warm Turmeric Cinnamon Ginger Decoction', why: 'Inhibits inflammatory cytokines (TNF-alpha, IL-6) that cause muscle knots.' },
      { food: 'Boiled Sweet Potatoes with Ghee', why: 'Sustained grounding carbohydrates that replenish muscle glycogen and pacify Vata.' }
    ],
    foodsToAvoid: [
      { food: 'Excessive Caffeine (More than 2 cups)', why: 'Constricts cranial blood vessels and worsens muscular spasms.' },
      { food: 'High Refined Sugars & Sodas', why: 'Generates advanced glycation end-products (AGEs) that stiffen collagen.' }
    ],
    exercises: [
      {
        id: 'pose_wall_angels_remedial',
        name: 'Wall Angels Scapular Retraction',
        sanskrit: 'Scapular Kinetic Glide',
        duration: '3.0 min',
        target: 'Lower Trapezius & Serratus Anterior',
        cue: 'Back against wall, elbows and wrists touching wall. Slowly slide arms up into "Y" shape and pull down into "W".',
        benefit: 'Restores scapular rhythm and pulls rounded shoulders back into natural alignment.',
        animKey: 'wall_angels'
      },
      {
        id: 'pose_cat_cow_cervical',
        name: 'Cat-Cow with Cervical Release',
        sanskrit: 'Marjaryasana Cervical Focus',
        duration: '2.5 min',
        target: 'Upper Spine Mobilization',
        cue: 'Coordinate neck extension with inhalation and chin-to-chest tuck with exhalation.',
        benefit: 'Pumps fresh cerebrospinal fluid through cervical vertebrae.',
        animKey: 'cat_cow'
      }
    ],
    measuresToTake: [
      { measure: 'Eye-Level Monitor Elevation', detail: 'Raise monitor or laptop stand so the top 1/3 of the display aligns directly with eye height.' },
      { measure: '20-20-20 Screen Rest Cadence', detail: 'Every 20 minutes, look at an object 20 feet away for 20 seconds while doing 3 slow shoulder rolls.' },
      { measure: 'Warm Epsom Salt Compress', detail: 'Soak a hand towel in hot water with 2 tbsp Epsom salts and drape over neck for 12 minutes.' },
      { measure: 'Acupressure Point GB-20 (Fengchi)', detail: 'Press hollows at base of skull on both sides of neck with thumbs for 60 seconds.' }
    ],
    recoveryMilestone: 'Occipital relief within 24 hours; complete elimination of upper trap knots within 7 to 10 days.'
  },

  acid_reflux: {
    key: 'acid_reflux',
    badge: 'Gastrointestinal & Digestive',
    title: 'Acid Reflux, GERD, Hyperacidity & Stomach Burning',
    icon: '🔥',
    rootCause: 'Transient relaxation of the lower esophageal sphincter (LES) combined with sluggish gastric emptying and mucosal irritation. Stress triggers sympathetic vasoconstriction, lowering protective bicarbonate secretions in the stomach lining.',
    ayurvedicDosha: 'Amla Pitta (Aggravated Pitta with sour and sharp qualities). Impairs Samana and Apana Vayu, causing upward reflux ("Udgara").',
    whatToEat: [
      { food: 'Fresh Coconut Water & Boiled Bottle Gourd (Lauki)', why: 'Strongly alkaline, instantly neutralizes gastric free acid and soothes mucosal lining.' },
      { food: 'CCF Cooling Digestive Tea (Cumin, Coriander, Fennel)', why: 'Sip warm 30 minutes after meals to balance hydrochloric acid without impairing digestion.' },
      { food: 'Soaked Black Raisins & Ripe Papaya', why: 'Contains natural papain enzymes and cooling sugars that nourish gastric mucosal membranes.' }
    ],
    foodsToAvoid: [
      { food: 'Deep-Fried Savory Snacks & Red Chili Powder', why: 'Directly irritates inflamed esophageal squamous epithelium.' },
      { food: 'Raw Onions, Garlic & Vinegar Pickles', why: 'Triggers rapid release of gastrin and relaxes esophageal sphincters.' },
      { food: 'Late Night Heavy Dinners within 2.5 hrs of Sleep', why: 'Gravity allows acidic stomach contents to regurgitate into the esophagus during recumbency.' }
    ],
    exercises: [
      {
        id: 'pose_vajrasana_remedial',
        name: 'Vajrasana (Thunderbolt Pose)',
        sanskrit: 'Vajrasana',
        duration: '8.0 min (Post-Meal)',
        target: 'Gastric Blood Flow Optimization',
        cue: 'Sit back on heels with straight spine and hands resting on knees. Breathe slowly into the belly.',
        benefit: 'Redirects blood supply from lower limbs to digestive organs, accelerating stomach emptying by 35%.',
        animKey: 'childs_pose'
      },
      {
        id: 'pose_sheetali_remedial',
        name: 'Sheetali Cooling Pranayama',
        sanskrit: 'Sheetali Pranayama',
        duration: '4.0 min',
        target: 'Thermoregulation & Acid Quenching',
        cue: 'Roll tongue into a tube, inhale cooling air deeply through the mouth, close mouth, and exhale through nose.',
        benefit: 'Rapidly reduces internal visceral heat and calms hyperactive gastric acid secretion.',
        animKey: 'pranayama'
      }
    ],
    measuresToTake: [
      { measure: '6-Inch Bed Headboard Elevation', detail: 'Elevate the head of your bed frame by 6 inches so gravity naturally keeps stomach acid down.' },
      { measure: 'Sleep Exclusively on Left Side', detail: 'The stomach naturally sits below the esophagus in left lateral decubitus, preventing acid leakage.' },
      { measure: 'Chew Food to Pure Liquid (32 Chews)', detail: 'Salivary amylase and bicarbonate pre-digest food, minimizing required stomach acid.' },
      { measure: 'Acupressure Point CV-12 & P-6', detail: 'Apply gentle pressure on CV-12 (middle of abdomen) and P-6 (inner wrist) for 90 seconds.' }
    ],
    recoveryMilestone: 'Heartburn sensations reduce by 60% within 2 days; complete esophageal mucosal healing in 2 to 3 weeks.'
  },

  pcos_hormone: {
    key: 'pcos_hormone',
    badge: 'Endocrine & Pelvic',
    title: 'PCOS / PCOD, Insulin Resistance & Hormonal Imbalance',
    icon: '🌸',
    rootCause: 'Hyperinsulinemia and compensatory insulin resistance stimulate ovarian theca cells to overproduce androgens (testosterone), preventing regular follicle maturation, causing cycle irregularities, acne, and stubborn weight gain.',
    ayurvedicDosha: 'Aggravated Kapha (producing cystic stagnation and sluggish tissue metabolism) paired with erratic Vata in Artava Vaha Srotas (female reproductive channels).',
    whatToEat: [
      { food: 'Spearmint Herbal Infusion (2 cups daily)', why: 'Clinically verified in randomized trials to reduce free testosterone levels.' },
      { food: 'Ceylon Cinnamon Bark Water', why: 'Contains methylhydroxychalcone polymers (MHCP) that activate insulin receptors in cells.' },
      { food: 'Seed Cycling Protocol (Flax + Pumpkin / Sesame + Sunflower)', why: 'Provides targeted lignans and zinc in follicular phase, and selenium in luteal phase.' },
      { food: 'Sprouted Green Moong & High-Fiber Millets (Ragi, Jowar)', why: 'Low glycemic index prevents postprandial insulin surges.' }
    ],
    foodsToAvoid: [
      { food: 'Refined White Flours (Maida), Sugar & Bakery Pastries', why: 'Causes rapid glucose spikes that trigger ovarian androgen secretion.' },
      { food: 'Processed Commercial Cow Dairy', why: 'Contains bovine IGF-1 and hormones that exacerbate acne and cystic development.' }
    ],
    exercises: [
      {
        id: 'pose_butterfly_remedial',
        name: 'Butterfly Pose (Baddha Konasana)',
        sanskrit: 'Baddha Konasana',
        duration: '4.0 min',
        target: 'Pelvic Ovarian Microcirculation',
        cue: 'Press soles together, bring heels close to pelvis, gently flutter thighs, and fold softly forward.',
        benefit: 'Dramatically improves arterial blood flow to the ovaries and uterus.',
        animKey: 'pigeon_pose'
      },
      {
        id: 'pose_malasana_remedial',
        name: 'Deep Garland Squat (Malasana)',
        sanskrit: 'Malasana',
        duration: '3.0 min',
        target: 'Pelvic Floor Decongestion',
        cue: 'Squat low with feet wider than hips, hands in prayer pressing elbows against inner knees.',
        benefit: 'Opens hip adductors and relieves chronic sacral congestion.',
        animKey: 'squats'
      }
    ],
    measuresToTake: [
      { measure: '10-Minute Post-Meal Walk', detail: 'A gentle 10-minute walk after lunch and dinner blunts glucose spikes by 30% through non-insulin glucose uptake.' },
      { measure: 'Morning Sunlight Circadian Exposure', detail: 'Get 15 minutes of early morning sun to calibrate melatonin, cortisol, and LH/FSH pulsatility.' },
      { measure: 'Castor Oil Abdominal Compress', detail: 'Apply warm castor oil pack to lower abdomen for 25 minutes 3x/week (avoid during active menses).' },
      { measure: 'Acupressure Point SP-6 (Sanyinjiao)', detail: 'Four finger-widths above inner ankle bone; massage gently for 2 minutes on each leg.' }
    ],
    recoveryMilestone: 'Significant reduction in sugar cravings in 7 days; cycle regularity and energy surge within 6 to 8 weeks.'
  },

  insomnia: {
    key: 'insomnia',
    badge: 'Neurological & Circadian',
    title: 'Chronic Sleep-Onset Insomnia, Night Anxiety & Racing Thoughts',
    icon: '🌙',
    rootCause: 'Sustained sympathetic nervous system hyperactivity, elevated evening cortisol, delayed melatonin onset due to blue light, and inability to down-regulate the prefrontal default mode network before sleep.',
    ayurvedicDosha: 'Anidra (High Prana Vata causing hyper-arousal and restless racing mind) accompanied by depletion of soothing Tarpaka Kapha and Ojas.',
    whatToEat: [
      { food: 'Warm Golden Almond Milk with Nutmeg (1/4 tsp)', why: 'Nutmeg contains natural myristicin which acts as an organic sedative and enhances GABA.' },
      { food: 'Pumpkin Seeds & Soaked Walnuts (Handful at 7 PM)', why: 'Rich in L-tryptophan and magnesium to synthesize nighttime melatonin.' },
      { food: 'Chamomile & Lavender Loose Leaf Tea', why: 'Contains apigenin which binds to benzodiazepine receptors in the brain.' }
    ],
    foodsToAvoid: [
      { food: 'Caffeine after 1:00 PM (Coffee, Energy drinks, Strong Tea)', why: 'Caffeine has a 6 to 8 hour half-life and blocks adenosine sleep-pressure receptors.' },
      { food: 'Alcohol as a Sleep Aid', why: 'Suppresses REM sleep, fragments sleep architecture, and causes 3:00 AM awakenings.' }
    ],
    exercises: [
      {
        id: 'pose_legs_wall_remedial',
        name: 'Legs-Up-The-Wall (Viparita Karani)',
        sanskrit: 'Viparita Karani',
        duration: '8.0 min (Before Bed)',
        target: 'Parasympathetic Nervous System Activation',
        cue: 'Lie on your back with hips against wall and legs extended straight up. Rest arms by sides with palms open.',
        benefit: 'Flushes venous blood back to the heart, lowers blood pressure, and activates the vagus nerve.',
        animKey: 'inversion'
      },
      {
        id: 'pose_bhramari_remedial',
        name: 'Bhramari (Humming Bee Breath)',
        sanskrit: 'Bhramari Pranayama',
        duration: '4.0 min',
        target: 'Brainwave Calming & Nitric Oxide Boost',
        cue: 'Close eyes, gently cover ears with thumbs, inhale deeply, and hum like a bee on a prolonged exhalation.',
        benefit: 'Vibrational resonance stimulates cerebral nitric oxide and instantly quiets the amygdala.',
        animKey: 'pranayama'
      }
    ],
    measuresToTake: [
      { measure: 'Warm Sesame Foot Massage (Padabhyanga)', detail: 'Rub warm sesame oil on soles of feet for 3 minutes before sleeping to draw excessive mental energy downward.' },
      { measure: 'Strict 10:00 PM Digital Device Curfew', detail: 'Put phones outside the bedroom or switch to red-light mode to prevent melatonin suppression.' },
      { measure: 'Thermoregulatory Bedroom Drop', detail: 'Keep bedroom cool (19°C / 66°F); body temperature must drop by 1°C to initiate sleep.' },
      { measure: '432 Hz Solfeggio Audio Soundscape', detail: 'Use the integrated PranaFit audio soundscape during bed preparations.' }
    ],
    recoveryMilestone: 'Falling asleep within 15 minutes within 3 days; uninterrupted deep sleep restorative cycles within 1 week.'
  },

  knee_joint: {
    key: 'knee_joint',
    badge: 'Articular & Meniscal',
    title: 'Knee Joint Pain, Patellar Crepitus & Stiffness',
    icon: '🦵',
    rootCause: 'Quadriceps-hamstring muscular imbalance, tight IT band pulling patella laterally, or reduced synovial fluid viscosity in the joint capsule.',
    ayurvedicDosha: 'Sandhigata Vata (Degenerative dry Vata lodged in Shleshaka Kapha lubricating membranes).',
    whatToEat: [
      { food: 'Turmeric + Black Pepper + A2 Cow Ghee (Golden Paste)', why: 'Curcuminoids inhibit NF-kB joint inflammation, while piperine boosts absorption by 2000%.' },
      { food: 'Soaked Walnuts & Flaxseed Meal', why: 'High in plant-based ALA Omega-3 fatty acids that dampen joint cartilage degradation.' },
      { food: 'Bone Broth or Moringa Drumstick Soup', why: 'Supplies glycosaminoglycans and chondroitin directly to articular cartilege.' }
    ],
    foodsToAvoid: [
      { food: 'Excessive White Potato, Eggplants & Highly Acidic Foods', why: 'May promote calcium crystal irritation in sensitized synovium.' },
      { food: 'Cold Refrigerated Water & Chilled Foods', why: 'Constricts periarticular capillary beds and stiffens connective tissue.' }
    ],
    exercises: [
      {
        id: 'pose_isometric_quads',
        name: 'Isometric Quad Sets & Straight Leg Raises',
        sanskrit: 'Quadriceps Stabilizer',
        duration: '3.0 min',
        target: 'Vastus Medialis Oblique (VMO)',
        cue: 'Sit tall, tighten front thigh muscle to press back of knee flat to floor. Hold 8s, release.',
        benefit: 'Strengthens knee stabilizers without creating patellofemoral friction.',
        animKey: 'bridge'
      },
      {
        id: 'pose_bridge_knee',
        name: 'Glute Bridge with Neutral Knees',
        sanskrit: 'Setu Bandhasana Alignment',
        duration: '3.0 min',
        target: 'Hamstring & Hip Synergy',
        cue: 'Keep knees tracking directly over toes; do not allow knees to flare out or cave in.',
        benefit: 'Unloads knee joints by teaching the hips and glutes to absorb ground impact.',
        animKey: 'bridge'
      }
    ],
    measuresToTake: [
      { measure: 'Warm Mahanarayan / Castor Oil Massage', detail: 'Gently rub warm oil clockwise around the knee cap for 4 minutes every morning.' },
      { measure: 'Cushioned Footwear & Avoid Barefoot Concrete', detail: 'Never walk on hard tile or concrete barefoot; wear shock-absorbing slippers.' },
      { measure: 'Moist Heat Compress Before Movement', detail: 'Apply warm moist towel for 10 minutes to loosen morning knee stiffness.' },
      { measure: 'Acupressure Point ST-36 (Zusanli)', detail: 'Four finger-widths below outer knee joint; massage with thumb for 90 seconds.' }
    ],
    recoveryMilestone: 'Morning knee stiffness reduced by 50% in 5 days; comfortable stair climbing restored in 2 to 3 weeks.'
  },

  migraine: {
    key: 'migraine',
    badge: 'Neurovascular & Cranial',
    title: 'Migraine Headaches, Sensory Sensitivity & Tension',
    icon: '⚡',
    rootCause: 'Trigeminal nerve hyperexcitation, neurogenic sterile inflammation of meningeal blood vessels, and fluctuating serotonin levels triggered by stress, weather, or dietary triggers.',
    ayurvedicDosha: 'Ardhavabhedaka (Vata-Pitta disorder involving cranial vessel constriction followed by painful rebound vasodilation).',
    whatToEat: [
      { food: 'Fresh Tender Coconut Water with a Pinch of Pink Salt', why: 'Rapidly replenishes potassium and intracellular electrolytes to stabilize nerve membranes.' },
      { food: 'Ginger Root Infusion with Fresh Coriander Seeds', why: 'Ginger works as effectively as sumatriptan in clinical trials for acute headache relief without side effects.' },
      { food: 'Magnesium-Rich Spinach, Almonds & Pumpkin Seeds', why: 'Relaxes cerebral vascular tone and prevents cortical spreading depression.' }
    ],
    foodsToAvoid: [
      { food: 'Aged Cheeses, Nitrates & Cured Meats', why: 'Contains tyramine and vasoactive amines that trigger acute vascular spasms.' },
      { food: 'Artificial Sweeteners (Aspartame, Sucralose) & MSG', why: 'Excitotoxins that overstimulate cerebral NMDA receptors.' }
    ],
    exercises: [
      {
        id: 'pose_childs_migraine',
        name: 'Supported Child\'s Pose with Head Rest',
        sanskrit: 'Balasana Supported',
        duration: '5.0 min',
        target: 'Cranial Pressure Equalization',
        cue: 'Rest forehead on a soft pillow. Close eyes and take gentle, slow breaths through the nose.',
        benefit: 'Reduces intracranial pressure and calms visual-auditory sensory overload.',
        animKey: 'childs_pose'
      },
      {
        id: 'pose_nadi_migraine',
        name: 'Cooling Left-Nostril Breathing (Chandra Bhedana)',
        sanskrit: 'Chandra Bhedana Pranayama',
        duration: '4.0 min',
        target: 'Sympathetic Quieting',
        cue: 'Inhale through left nostril only, exhale smoothly through right nostril.',
        benefit: 'Directly stimulates the cooling, parasympathetic neural pathways.',
        animKey: 'pranayama'
      }
    ],
    measuresToTake: [
      { measure: 'Head Cold Pack + Foot Hot Soak Diverter', detail: 'Place an ice pack on back of neck while soaking feet in warm water; this draws blood away from the head.' },
      { measure: 'Dark, Silent Sensory Rest Chamber', detail: 'Lie down in a pitch-dark room with earplugs at the first hint of headache aura.' },
      { measure: 'Hydration Hydrometer Tracking', detail: 'Drink 500ml water immediately upon waking; dehydration is the #1 silent migraine trigger.' },
      { measure: 'Acupressure Point LI-4 (Hegu) & GB-20', detail: 'Pinch the webbing between thumb and index finger firmly for 90 seconds on both hands.' }
    ],
    recoveryMilestone: 'Acute headache intensity drops within 30 minutes; migraine frequency cut by 70% within 3 weeks.'
  },

  sluggish_metabolism: {
    key: 'sluggish_metabolism',
    badge: 'Metabolic & Hepatic',
    title: 'Sluggish Metabolism, Stubborn Weight & Fatty Liver',
    icon: '⚖️',
    rootCause: 'Reduced mitochondrial density, cellular insulin resistance, low thyroid hormone conversion (T4 to T3 in liver), and suppressed NEAT (non-exercise activity thermogenesis).',
    ayurvedicDosha: 'Manda Agni with Ama (toxic metabolic byproduct accumulation) and excessive Medo Dhatu (adipose tissue retention).',
    whatToEat: [
      { food: 'Warm Water with 1 tbsp Apple Cider Vinegar & Fresh Ginger', why: 'Stimulates hydrochloric acid, activates AMP-activated protein kinase (AMPK) for fat burning.' },
      { food: 'Roasted Barley (Jau) Sattu & Moong Sprout Salad', why: 'Packed with resistant starch and high fiber that feeds Akkermansia muciniphila gut bacteria.' },
      { food: 'Triphala Infusion Before Sleep', why: 'Cleanses hepatic bile ducts, detoxifies colon, and balances gut microbiome balance.' }
    ],
    foodsToAvoid: [
      { food: 'Refined Seed Oils (Palm, Corn, Soy, Cottonseed)', why: 'Damages mitochondrial membranes and promotes hepatic lipid accumulation.' },
      { food: 'Liquid High-Fructose Corn Syrup & Packaged Juices', why: 'Goes straight to liver de novo lipogenesis, promoting visceral belly fat.' }
    ],
    exercises: [
      {
        id: 'pose_surya_metabolic',
        name: 'Brisk Surya Namaskar (Sun Salutations)',
        sanskrit: 'Surya Namaskara Dynamism',
        duration: '8.0 min',
        target: 'Total Thermogenic Activation',
        cue: 'Flow smoothly between the 12 classical positions, keeping breath synchronized with each transition.',
        benefit: 'Fires up the central metabolic engine and enhances glucose clearance into muscle tissue.',
        animKey: 'warrior2'
      },
      {
        id: 'pose_squats_metabolic',
        name: 'Bodyweight Functional Deep Squats',
        sanskrit: 'Utkatasana to Malasana Flow',
        duration: '4.0 min',
        target: 'Largest Muscle Group Glucose Burn',
        cue: 'Perform 3 sets of 12 controlled squats, squeezing glutes and thighs at the top.',
        benefit: 'Activates GLUT4 glucose transporters in quadriceps without requiring heavy weights.',
        animKey: 'squats'
      }
    ],
    measuresToTake: [
      { measure: '14:10 Intermittent Fasting Protocol', detail: 'Finish dinner by 7:30 PM and eat breakfast at 9:30 AM to allow 14 hours of cellular autophagy.' },
      { measure: 'Cold Water Finish Shower (30 Seconds)', detail: 'End morning shower with 30 seconds of cold water to activate thermogenic brown adipose tissue.' },
      { measure: 'Daily 8,000 Step Benchmark', detail: 'Break desk stagnation by accumulating 8,000 walking steps throughout the day.' },
      { measure: 'Acupressure Point SP-9 & Ren-12', detail: 'Stimulates spleen and stomach energy channels for healthy nutrient absorption.' }
    ],
    recoveryMilestone: 'Digestive lightness within 3 days; 1.5 to 2.5 kg healthy fat reduction within 30 days.'
  },

  high_bp_stress: {
    key: 'high_bp_stress',
    badge: 'Cardiovascular & Autonomic',
    title: 'Elevated Blood Pressure, Arterial Stiffness & Chronic Stress',
    icon: '❤️',
    rootCause: 'Chronic sympathetic vasoconstriction, endothelial nitric oxide depletion, and renal sodium retention caused by prolonged psychological stress and cortisol.',
    ayurvedicDosha: 'Aggravated Vyana Vayu and Rakta Pitta causing excessive arterial pressure and cardiac strain.',
    whatToEat: [
      { food: 'Fresh Beetroot Juice with Lemon (1 small glass daily)', why: 'Rich in dietary inorganic nitrates which convert directly into arterial-dilating nitric oxide.' },
      { food: 'Raw Garlic Clove (Crushed and rested for 10 mins with olive oil)', why: 'Releases allicin, clinically proven to lower systolic BP by 8 to 10 mmHg.' },
      { food: 'Hibiscus Flower Infusion (2 cups daily)', why: 'Natural ACE-inhibiting properties without synthetic pharmaceutical side effects.' },
      { food: 'Potassium-Rich Bananas & Tender Coconut Water', why: 'Counters excess extracellular sodium and promotes renal fluid balance.' }
    ],
    foodsToAvoid: [
      { food: 'Excessive Sodium (>2,300 mg/day) in Packaged Snacks', why: 'Draws water into vascular space, increasing arterial wall shear stress.' },
      { food: 'Energy Drinks & High Licorice Teas', why: 'Stimulates adrenal epinephrine receptors and inhibits cortisol breakdown.' }
    ],
    exercises: [
      {
        id: 'pose_bridge_cardio',
        name: 'Supported Bridge Pose with Bolster',
        sanskrit: 'Setu Bandhasana Restorative',
        duration: '5.0 min',
        target: 'Baroreceptor Resetting',
        cue: 'Rest pelvis on a supportive block or cushion, arms outstretched, slow diaphragmatic breathing.',
        benefit: 'Gently stimulates carotid baroreceptors to signal the brain to lower arterial heart rate and pressure.',
        animKey: 'bridge'
      },
      {
        id: 'pose_nadi_cardio',
        name: 'Slow Rhythmic Alternate Nostril Breathing (4:4:4)',
        sanskrit: 'Nadi Shodhana Pranayama',
        duration: '6.0 min',
        target: 'Sympathovagal Balance',
        cue: 'Inhale left nostril 4s, hold 4s, exhale right nostril 4s. Reverse and repeat smoothly.',
        benefit: 'Lowers systemic vascular resistance within 5 minutes of practice.',
        animKey: 'pranayama'
      }
    ],
    measuresToTake: [
      { measure: '6-Breaths-Per-Minute Coherence Breathing', detail: 'Practice 5 seconds in, 5 seconds out for 5 minutes twice daily to trigger peak heart rate variability (HRV).' },
      { measure: 'Magnesium Glycinate (300mg before bed)', detail: 'Directly relaxes smooth vascular muscle cells in the arterial tree.' },
      { measure: 'Gratitude Journaling & Cortisol Unloading', detail: 'Write 3 specific things you are grateful for before bed to turn off sympathetic alarm signals.' },
      { measure: 'Acupressure Point LV-3 (Taichong)', detail: 'In webbing between big toe and second toe; press firmly for 2 minutes to vent liver fire.' }
    ],
    recoveryMilestone: 'Systolic blood pressure drops 5 to 8 points within 7 days; sustained calm HRV within 3 weeks.'
  },

  constipation: {
    key: 'constipation',
    badge: 'Colonic & Motility',
    title: 'Chronic Constipation, Bowel Sluggishness & Pelvic Floor Tightness',
    icon: '🌾',
    rootCause: 'Inadequate soluble/insoluble fiber ratio, intracellular dehydration, pelvic floor puborectalis dyssynergia, and suppressed gastrocolic reflex.',
    ayurvedicDosha: 'Aggravated Apana Vayu (the downward-moving energetic force is blocked and dry, turning purisha stool into hard dry pellets).',
    whatToEat: [
      { food: 'Soaked Black Prunes & Ripe Papaya with Pinch of Rock Salt', why: 'Supplies natural sorbitol and active papain enzymes that draw moisture into the bowel lumen.' },
      { food: 'Warm Water with 1 tbsp Organic Isabgol (Psyllium Husk) + 1 tsp Ghee', why: 'Mucilage forms a gentle lubricating gel that sweeps colonic diverticula without cramping.' },
      { food: 'Boiled Spinach & Golden Moong Khichdi with Cumin', why: 'Soft dietary fiber and magnesium that stimulate natural peristalsis.' }
    ],
    foodsToAvoid: [
      { food: 'Dry Baked Crackers, White Bread (Maida) & Dry Popcorn', why: 'Absorbs valuable moisture in the colon, exacerbating hard dry stools.' },
      { food: 'Black Tea on an Empty Stomach', why: 'High tannin content causes intestinal astringency and halts peristalsis.' }
    ],
    exercises: [
      {
        id: 'pose_malasana_colonic',
        name: 'Malasana (Deep Squat with Belly Expansion)',
        sanskrit: 'Malasana',
        duration: '4.0 min',
        target: 'Anorectal Angle Alignment',
        cue: 'Squat deeply, press elbows against inner knees, and take deep belly breaths expanding the lower abdomen.',
        benefit: 'Straightens the puborectalis muscle from 90° to 180°, allowing completely effortless bowel evacuation.',
        animKey: 'squats'
      },
      {
        id: 'pose_pawan_colonic',
        name: 'Pawanmuktasana (Wind-Relieving Pose)',
        sanskrit: 'Pawanmuktasana',
        duration: '3.5 min',
        target: 'Ascending & Descending Colon Massage',
        cue: 'Lie on back, hug right knee to chest for 1 min (ascending colon), then left knee for 1 min (descending colon).',
        benefit: 'Direct mechanical compression stimulates sluggish peristalsis and expels trapped intestinal gas.',
        animKey: 'childs_pose'
      }
    ],
    measuresToTake: [
      { measure: 'Squatting Footstool (Squatty Potty)', detail: 'Place a 7-inch stool under your feet while using the toilet to elevate knees above hips.' },
      { measure: 'Morning Usha Pana (2 Glasses Warm Water)', detail: 'Drink 500ml of warm water immediately upon getting out of bed before looking at your phone.' },
      { measure: 'Clockwise Abdominal Castor Oil Massage', detail: 'Massage belly in a clockwise circular motion for 3 minutes following the direction of the large intestine.' },
      { measure: 'Acupressure Point ST-25 (Tianshu)', detail: 'Two thumb-widths on either side of the navel; press gently while taking deep breaths.' }
    ],
    recoveryMilestone: 'Smooth, effortless morning bowel movement restored within 24 to 48 hours.'
  },

  plantar_heel: {
    key: 'plantar_heel',
    badge: 'Podiatric & Fascial',
    title: 'Plantar Fasciitis, Morning Heel Pain & Achilles Tightness',
    icon: '🦶',
    rootCause: 'Micro-tearing and chronic collagen degeneration at the calcaneal tuberosity origin of the plantar fascia, exacerbated by tight gastrocnemius/soleus calves and improper footwear.',
    ayurvedicDosha: 'Vata-Kapha accumulation in Pada (feet) and Snayu (tendons/ligaments), producing severe morning stiffness.',
    whatToEat: [
      { food: 'Anti-inflammatory Turmeric Ginger Broth', why: 'Reduces local substance-P pain signaling at the calcaneal attachment.' },
      { food: 'Vitamin C Rich Amla & Citrus Fruits', why: 'Essential cofactor for collagen hydroxylase to repair micro-tears in the plantar fascia.' },
      { food: 'Soaked Walnuts & Chia Seeds', why: 'Enhances cellular membrane flexibility and tendon elasticity.' }
    ],
    foodsToAvoid: [
      { food: 'Excessive Inflammatory Refined Sugar', why: 'Triggers collagen stiffening through advanced glycation cross-linking.' }
    ],
    exercises: [
      {
        id: 'pose_frozen_bottle_roll',
        name: 'Frozen Water Bottle Arch Roll',
        sanskrit: 'Cryo-Fascial Mobilization',
        duration: '5.0 min (Morning & Night)',
        target: 'Plantar Fascia Decompression',
        cue: 'Roll the arch of your foot over a frozen cylindrical water bottle with moderate pressure.',
        benefit: 'Combines cold therapy to vasoconstrict inflammation with mechanical cross-friction massage.',
        animKey: 'bridge'
      },
      {
        id: 'pose_calf_stretch_heel',
        name: 'Downward Dog Pedal Calf Stretch',
        sanskrit: 'Adho Mukha Svanasana Heel Press',
        duration: '3.0 min',
        target: 'Gastroc-Soleus Complex Lengthening',
        cue: 'In downward dog, pedal heels alternately down toward the mat, holding each heel down for 5 seconds.',
        benefit: 'Releases the posterior superficial back line of fascia that anchors into the heel.',
        animKey: 'downward_dog'
      }
    ],
    measuresToTake: [
      { measure: 'Never Take First Morning Steps Barefoot', detail: 'Keep cushioned recovery slide sandals right next to your bed; never step on cold hard floors.' },
      { measure: 'Night Splint or Gentle Toe Dorsiflexion', detail: 'Keeps plantar fascia lengthened while sleeping so morning weight-bearing does not re-tear healing fibers.' },
      { measure: 'Towel Scrunch Toe Flexion', detail: 'Scrunch a hand towel on the floor using only your toes to strengthen the intrinsic arch muscles.' },
      { measure: 'Acupressure Point KD-1 (Yongquan)', detail: 'Depression on sole of foot behind ball; massage with thumb for 60 seconds.' }
    ],
    recoveryMilestone: 'First-step morning stabbing pain drops by 60% in 5 days; full structural healing in 3 to 4 weeks.'
  },

  low_immunity: {
    key: 'low_immunity',
    badge: 'Immune & Lymphatic',
    title: 'Recurrent Colds, Sinus Congestion, Fatigue & Low Immunity',
    icon: '🛡️',
    rootCause: 'Depleted mucosal secretory IgA antibodies, sluggish lymphatic drainage, poor gut microbiome diversity, and chronic micro-inflammation.',
    ayurvedicDosha: 'Depleted Ojas (the subtle vital immune essence) and accumulated Kapha-Ama in Pranavaha Srotas (respiratory tract).',
    whatToEat: [
      { food: 'Traditional Ayurvedic Ayush Kadha (Tulsi, Dalchini, Sunthi, Kali Mirch)', why: 'Contains high eugenol and piperine, enhancing macrophage phagocytosis and antiviral defense.' },
      { food: 'Raw Organic Honey with Crushed Black Pepper & Turmeric', why: 'Coats throat tissues with natural antimicrobial bee defensin-1 enzymes.' },
      { food: 'Hot Moringa Drumstick & Garlic Soup with Cumin', why: 'Packed with bioactive zinc, vitamin A, and allicin for white blood cell production.' }
    ],
    foodsToAvoid: [
      { food: 'Refrigerated Ice Creams, Chilled Sodas & Cold Milk at Night', why: 'Creates immediate mucus congestion (Kapha) and lowers respiratory epithelial temperature.' },
      { food: 'Heavy Deep-Fried Cheese & Heavy Pastries', why: 'Stagnates lymphatic flow and taxes digestive energy.' }
    ],
    exercises: [
      {
        id: 'pose_kapala_immune',
        name: 'Kapalabhati Breath of Fire',
        sanskrit: 'Kapalabhati Pranayama',
        duration: '4.0 min',
        target: 'Sinus & Cranial Mucus Clearance',
        cue: '3 rounds of 30 forceful exhales with passive inhales. Keep spine straight and chest open.',
        benefit: 'Expels stagnant mucus from maxillary sinuses and oxygenates cranial tissue.',
        animKey: 'pranayama'
      },
      {
        id: 'pose_cobra_immune',
        name: 'Cobra Pose Chest & Thymus Expansion',
        sanskrit: 'Bhujangasana Thymus Awakening',
        duration: '3.0 min',
        target: 'Thymus Gland & Thoracic Duct Stimulation',
        cue: 'Inhale and arch chest upward proudly, rolling shoulders back and expanding ribs.',
        benefit: 'Stimulates T-cell maturation in the thymus and pumps thoracic lymphatic drainage.',
        animKey: 'cobra'
      }
    ],
    measuresToTake: [
      { measure: 'Steam Inhalation with Eucalyptus & Ajwain', detail: 'Inhale steam from hot water with 2 drops eucalyptus oil and crushed carom seeds for 8 minutes before bed.' },
      { measure: 'Warm Salt Water Gargle (Twice Daily)', detail: 'Gargle warm water with 1/2 tsp pink salt and 1/4 tsp turmeric to osmotic-rinse pharyngeal pathogens.' },
      { measure: 'Circadian 8-Hour Deep Sleep Window', detail: 'T-cell cytokine release peaks during non-REM stage 3 deep sleep; prioritize 10:30 PM bed time.' },
      { measure: 'Acupressure Point LI-11 (Quchi) & LU-7', detail: 'At the outer crease of the elbow; massage for 90 seconds to activate protective Wei Qi.' }
    ],
    recoveryMilestone: 'Sinus congestion clears within 24 hours; immune resilience and energy rebound within 7 days.'
  }
};

// NLP & Semantic Multi-Diet Clinical Problem Analyzer
function analyzeHealthProblem(queryText = '') {
  const DB = (typeof window !== 'undefined' && window.PROBLEM_HEALING_DATABASE) ? window.PROBLEM_HEALING_DATABASE : PROBLEM_HEALING_DATABASE;
  const query = (queryText || '').toLowerCase().trim();

  let targetCondition = null;

  // Direct match to preset keys
  if (DB[query]) {
    targetCondition = DB[query];
  } else {
    // Multi-factor keyword scoring across all 20 conditions
    const scores = {};
    for (const key in DB) scores[key] = 0;

    // Sciatica
    if (query.match(/sciatica|radiating|shoot|piriformis|buttock down|posterior thigh|hamstring numb|electric shock leg|nerve shoot|l5-s1/)) scores.sciatica_nerve = (scores.sciatica_nerve || 0) + 14;
    // Cervical spondylosis
    if (query.match(/cervical spondylosis|spondylosis|neck disc|c5|c6|c7|arm numb|finger numb|tingling hand|arm pain from neck|vertigo.*neck|dizziness.*neck/)) scores.cervical_spondylosis = (scores.cervical_spondylosis || 0) + 14;
    // Lower back pain
    if (query.match(/back|lumbar|spine|lower back|l4|l5|s1|disc compression|psoas|sitting slouch|sacral|waist/)) scores.back_pain = (scores.back_pain || 0) + 10;
    // Neck strain
    if (query.match(/neck|trapezius|tech neck|screen craning|laptop neck|stiff neck|shoulder blade|upper back strain/)) scores.neck_strain = (scores.neck_strain || 0) + 10;
    // Acid reflux
    if (query.match(/acid|reflux|gerd|heartburn|burning chest|sour burp|stomach burn|belching|regurgitation|gastritis|sour mouth/)) scores.acid_reflux = (scores.acid_reflux || 0) + 12;
    // PCOS / Hormone
    if (query.match(/pcos|pcod|irregular period|cysts|androgen|facial hair|hirsutism|cystic acne|missed cycle|hormonal|ovary|fertility/)) scores.pcos_hormone = (scores.pcos_hormone || 0) + 12;
    // Insomnia
    if (query.match(/sleep|insomnia|can't sleep|cannot sleep|wake up|awake|tossing|restless night|midnight wake|racing mind|sleep quality/)) scores.insomnia = (scores.insomnia || 0) + 12;
    // Knee joint
    if (query.match(/knee|patella|cartilage|creaking|crepitus|stiff knee|squatting hurts|stairs hurt|meniscus|synovial|joint ache/)) scores.knee_joint = (scores.knee_joint || 0) + 12;
    // Migraine
    if (query.match(/migraine|headache|throbbing temple|one sided head|light sensitive|aura|visual flash|nausea headache|pounding head/)) scores.migraine = (scores.migraine || 0) + 12;
    // Sluggish metabolism
    if (query.match(/metabolism|stubborn weight|weight plateau|visceral fat|sluggish|heavy after food|low thyroid|slow burn|belly fat/)) scores.sluggish_metabolism = (scores.sluggish_metabolism || 0) + 10;
    // Fatty liver
    if (query.match(/fatty liver|liver|nafld|sgpt|sgot|hepatic|right upper abdomen|liver detox|sluggish bile/)) scores.fatty_liver = (scores.fatty_liver || 0) + 14;
    // IBS / Bloating
    if (query.match(/ibs|irritable bowel|bloating|distended|abdominal cramp|visceral spasms|alternating stool|spasmodic bowel|stomach gas/)) scores.ibs_bloating = (scores.ibs_bloating || 0) + 12;
    // Constipation
    if (query.match(/constipation|hard stool|dry stool|straining|incomplete evacuation|sluggish colon|bowel movement|toilet struggle/)) scores.constipation = (scores.constipation || 0) + 12;
    // High BP / Stress
    if (query.match(/blood pressure|bp|hypertension|systolic|diastolic|pulse|racing heart|heart rate|stress bp/)) scores.high_bp_stress = (scores.high_bp_stress || 0) + 12;
    // Anxiety / Vata Burnout
    if (query.match(/anxiety|panic|nervous|dread|overwhelmed|breathless|tremor|internal shaking|restless nervous|vata burnout/)) scores.anxiety_stress = (scores.anxiety_stress || 0) + 12;
    // Plantar Fasciitis
    if (query.match(/heel|foot sole|plantar|fasciitis|morning first step|stepping on needle|stepping on pin|achilles|heel spur/)) scores.plantar_heel = (scores.plantar_heel || 0) + 14;
    // Frozen Shoulder
    if (query.match(/frozen shoulder|adhesive capsulitis|cannot lift arm|reach back|bra strap|shoulder rotation|deltoid stiffness/)) scores.frozen_shoulder = (scores.frozen_shoulder || 0) + 14;
    // Uric Acid / Gout
    if (query.match(/uric acid|gout|big toe|swollen toe|joint crystal|hyperuricemia|purine|hot red toe/)) scores.uric_acid_gout = (scores.uric_acid_gout || 0) + 14;
    // Eczema / Skin Rash
    if (query.match(/eczema|psoriasis|skin rash|itchy skin|hives|urticaria|red patches|inflamed skin|pitta heat rash|dermatitis/)) scores.eczema_skin_rash = (scores.eczema_skin_rash || 0) + 14;
    // Low Immunity
    if (query.match(/cold|cough|sinus|mucus|phlegm|throat|immunity|frequent sick|feverish|nasal congestion|respiratory/)) scores.low_immunity = (scores.low_immunity || 0) + 10;

    let highestKey = 'back_pain';
    let maxScore = -1;
    for (const k in scores) {
      if (scores[k] > maxScore) {
        maxScore = scores[k];
        highestKey = k;
      }
    }

    targetCondition = (maxScore > 0 && DB[highestKey]) ? DB[highestKey] : (DB[state.activeProblemPreset] || DB['back_pain']);
  }

  // Clone condition and individualize with clinical patient context
  const analysis = JSON.parse(JSON.stringify(targetCondition));
  analysis.userQuery = queryText;
  analysis.duration = state.problemDuration || 'chronic';
  analysis.severity = state.problemSeverity || 'moderate';
  analysis.activeTriggers = state.problemTriggers ? [...state.problemTriggers] : ['sitting', 'stress'];
  analysis.activeDiet = state.problemDietContext || state.userDiet || 'veg';
  analysis.activeFastingType = state.problemFastingType || state.userFastingType || 'intermittent';

  return analysis;
}

function selectProblemPreset(presetKey) {
  state.activeProblemPreset = presetKey;
  const textarea = document.getElementById('problem-input-text');
  const chipButtons = document.querySelectorAll('.problem-preset-btn');
  
  chipButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.problem === presetKey);
  });

  const DB = (typeof window !== 'undefined' && window.PROBLEM_HEALING_DATABASE) ? window.PROBLEM_HEALING_DATABASE : PROBLEM_HEALING_DATABASE;
  const preset = DB[presetKey];
  if (preset && textarea) {
    textarea.value = `I am experiencing ${preset.title.toLowerCase()}. It feels tight, uncomfortable and impacts my daily energy and focus.`;
    const charCounter = document.getElementById('problem-char-count');
    if (charCounter) charCounter.innerText = `${textarea.value.length} / 500`;
  }

  triggerProblemAnalysis(presetKey);
}

function triggerProblemAnalysis(directKey = null) {
  const textarea = document.getElementById('problem-input-text');
  const userQuery = directKey ? directKey : (textarea ? textarea.value : '');
  const container = document.getElementById('problem-healing-output');
  if (!container) return;

  const data = analyzeHealthProblem(userQuery || state.activeProblemPreset || 'back_pain');
  state.lastProblemAnalysis = data;

  renderProblemHealingProtocol(data, userQuery);
  synth.playSingingBowlTone(280, 1.2);
}

function clearProblemInput() {
  const textarea = document.getElementById('problem-input-text');
  if (textarea) {
    textarea.value = '';
    const charCounter = document.getElementById('problem-char-count');
    if (charCounter) charCounter.innerText = `0 / 500`;
  }
  document.querySelectorAll('.problem-preset-btn').forEach(b => b.classList.remove('active'));
}

function toggleProblemVoiceDictation() {
  const textarea = document.getElementById('problem-input-text');
  if (!textarea) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      showToast('🎙️ Listening... Describe your symptoms now');
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        textarea.value = transcript;
        const charCounter = document.getElementById('problem-char-count');
        if (charCounter) charCounter.innerText = `${transcript.length} / 500`;
        showToast('✓ Speech captured! Analyzing problem...');
        triggerProblemAnalysis();
      };

      recognition.onerror = () => {
        showToast('⚠️ Microphone input paused or not permitted.');
      };

      recognition.start();
      return;
    } catch(e) {}
  }

  textarea.value = "I feel persistent soreness and sharp stiffness in my lower back after working on my computer for hours.";
  const charCounter = document.getElementById('problem-char-count');
  if (charCounter) charCounter.innerText = `${textarea.value.length} / 500`;
  showToast('🎙️ Sample voice dictation loaded. Analyzing...');
  triggerProblemAnalysis();
}

function renderProblemHealingProtocol(data, userQuery = '') {
  const container = document.getElementById('problem-healing-output');
  if (!container || !data) return;

  const activeDiet = data.activeDiet || state.problemDietContext || state.userDiet || 'veg';
  const activeFastingType = data.activeFastingType || state.problemFastingType || state.userFastingType || 'intermittent';

  // Determine prescribed foods based on active diet
  let prescribedFoods = [];
  if (data.whatToEatByDiet && data.whatToEatByDiet[activeDiet]) {
    prescribedFoods = data.whatToEatByDiet[activeDiet];
  } else if (data.whatToEat) {
    prescribedFoods = data.whatToEat;
  }

  const dietTitles = {
    veg: 'Vegetarian Healing Foods & Elixirs',
    nonveg: 'Non-Vegetarian Lean Broths & Marine Proteins',
    vegan: '100% Plant-Based Anti-Inflammatory Foods',
    fasting: `Fasting-Compatible Medicinal Elixirs (${getFastingLabel(activeFastingType)})`
  };

  const dietPills = {
    veg: '🥗 Vegetarian',
    nonveg: '🍗 Non-Vegetarian',
    vegan: '🌱 Vegan',
    fasting: `🪔 Fasting (${getFastingLabel(activeFastingType)})`
  };

  const dietIcons = {
    veg: '🥗',
    nonveg: '🍗',
    vegan: '🌱',
    fasting: '🪔'
  };

  const fastingNotice = activeDiet === 'fasting' ? `
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: #92400e; line-height: 1.4;">
      <strong>🪔 Fasting-Safe Therapeutic Protocol:</strong> These remedies provide essential cellular electrolytes, carminative herbs, and tissue repair without breaking your sacred fast vows or interrupting metabolic autophagy.
    </div>
  ` : '';

  // What to eat cards
  const eatCardsHtml = prescribedFoods.map(item => `
    <div class="healing-pill-item healing-pill-eat">
      <span style="font-size: 18px;">${dietIcons[activeDiet] || '🥗'}</span>
      <div>
        <strong style="color: #14532d; display: block; font-size: 13px;">${item.food}</strong>
        <span style="color: #166534; font-size: 12px; line-height: 1.4; display: block; margin-top: 2px;">${item.why}</span>
      </div>
    </div>
  `).join('');

  // Foods to avoid cards
  const avoidCardsHtml = data.foodsToAvoid.map(item => `
    <div class="healing-pill-item healing-pill-avoid">
      <span style="font-size: 18px;">🚫</span>
      <div>
        <strong style="color: #881337; display: block; font-size: 13px;">${item.food}</strong>
        <span style="color: #9f1239; font-size: 12px; line-height: 1.4; display: block; margin-top: 2px;">${item.why}</span>
      </div>
    </div>
  `).join('');

  // Measures to take
  const measuresHtml = data.measuresToTake.map(m => `
    <div class="healing-pill-item healing-pill-measure">
      <span style="font-size: 18px;">🛡️</span>
      <div>
        <strong style="color: #1e3a8a; display: block; font-size: 13px;">${m.measure}</strong>
        <span style="color: #1e40af; font-size: 12px; line-height: 1.4; display: block; margin-top: 2px;">${m.detail}</span>
      </div>
    </div>
  `).join('');

  // Animated Exercise cards with inline preview and Play Animation trigger
  const exercisesHtml = data.exercises.map((ex, idx) => {
    const animSvg = renderPoseAnimationSVG(ex.animKey || 'cat_cow', 'sm');
    return `
      <div style="background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <!-- Inline Animated Thumbnail -->
          <div class="pose-thumbnail-svg" onclick="openPoseAnimationModal('${ex.id}', '${state.yogaTime}')" title="Click to view kinetic exercise guide">
            ${animSvg}
            <span class="play-badge">▶ Kinetic Guide</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div>
              <h5 style="font-family: var(--font-heading); font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">
                ${idx + 1}. ${ex.name}
              </h5>
              <span style="font-size: 11px; color: #64748b; font-style: italic;">${ex.sanskrit}</span>
            </div>
            <span style="font-size: 10px; font-weight: 700; background: #dcfce7; color: #047857; padding: 2px 6px; border-radius: 4px;">
              ⏱️ ${ex.duration}
            </span>
          </div>

          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #059669; margin-bottom: 6px;">
            🎯 ${ex.target}
          </div>

          <p style="font-size: 12px; color: #334155; line-height: 1.5; margin: 0 0 6px;">
            <strong>Alignment Cue:</strong> ${ex.cue}
          </p>

          <p style="font-size: 11px; color: #64748b; line-height: 1.4; margin: 0 0 10px;">
            💡 <em>${ex.benefit}</em>
          </p>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; padding-top: 8px; border-top: 1px solid var(--border);">
          <button class="btn-primary" onclick="openPoseAnimationModal('${ex.id}', '${state.yogaTime}')" style="padding: 4px 10px; font-size: 11px; flex: 1;">
            <span>▶ Play Kinetic Animation</span>
          </button>
          <button class="btn-secondary" onclick="speakYogaPose('${ex.id}')" style="padding: 4px 8px; font-size: 11px;" title="Listen to alignment cues">
            <span>🔊 Audio</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // 7-Day Precision Roadmap
  const roadmap = data.healingRoadmap || {
    stage1: 'Days 1–2: Acute Symptom Relief, Inflammation Damping & Hydration',
    stage2: 'Days 3–5: Tissue Remodeling, Metabolic Balancing & Synovial Activation',
    stage3: 'Days 6–7+: Musculoskeletal Stabilization, Cellular Strength & Recurrence Prevention'
  };

  const roadmapHtml = `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-lg); padding: 18px; margin-top: 20px;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px;">📅</span>
          <h4 style="font-family: var(--font-heading); font-size: 16px; font-weight: 800; color: #0f172a; margin: 0;">
            7-Day Clinical Recovery Roadmap & Healing Timeline
          </h4>
        </div>
        <span style="font-size: 11px; color: #047857; font-weight: 700; background: #ecfdf5; padding: 2px 8px; border-radius: 999px;">
          Evidence-Based Progression
        </span>
      </div>
      <div class="roadmap-timeline-grid">
        <div class="roadmap-step-card stage-acute">
          <span style="font-size: 10px; font-weight: 800; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px;">Phase 1: Days 1–2</span>
          <p style="font-size: 12px; color: #334155; margin: 4px 0 0; line-height: 1.4;">${roadmap.stage1}</p>
        </div>
        <div class="roadmap-step-card stage-repair">
          <span style="font-size: 10px; font-weight: 800; color: #d97706; text-transform: uppercase; letter-spacing: 0.5px;">Phase 2: Days 3–5</span>
          <p style="font-size: 12px; color: #334155; margin: 4px 0 0; line-height: 1.4;">${roadmap.stage2}</p>
        </div>
        <div class="roadmap-step-card stage-strengthen">
          <span style="font-size: 10px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">Phase 3: Days 6–7+</span>
          <p style="font-size: 12px; color: #334155; margin: 4px 0 0; line-height: 1.4;">${roadmap.stage3}</p>
        </div>
      </div>
    </div>
  `;

  // Clinical Red Flags Warning
  const redFlags = data.clinicalRedFlags || [
    'Progressive numbness, sudden shooting sensations, or loss of motor function',
    'Severe unrelenting pain that awakens you from sleep while lying completely still',
    'Unexplained fever, systemic chills, or sudden unintended weight loss'
  ];

  const redFlagsHtml = `
    <div class="clinical-red-flags-card" style="margin-top: 16px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="font-size: 16px;">🚨</span>
        <strong style="color: #9f1239; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          Clinical Safety Warning & Red Flags (When to Seek In-Person Physician Evaluation):
        </strong>
      </div>
      <ul style="margin: 0; padding-left: 20px; font-size: 11px; color: #881337; line-height: 1.5;">
        ${redFlags.map(rf => `<li>${rf}</li>`).join('')}
      </ul>
    </div>
  `;

  // Duration label
  const durationLabels = {
    acute: '⚡ Acute (<7 Days)',
    subacute: '⏳ Subacute (1–4 Weeks)',
    chronic: '🔄 Chronic (1–6 Months)',
    longstanding: '📅 Longstanding (>6 Months)'
  };
  const durationLabel = durationLabels[data.duration] || durationLabels.chronic;

  // Severity label
  const severityLabels = {
    mild: '🟢 Mild Discomfort',
    moderate: '🟡 Moderate / Daily Limit',
    severe: '🔴 Severe / High Discomfort'
  };
  const severityLabel = severityLabels[data.severity] || severityLabels.moderate;

  // Triggers labels
  const triggerMap = {
    sitting: '🪑 Desk Sitting (>6h)',
    screen: '📱 Screen Strain',
    stress: '😰 Mental Stress',
    spicy_food: '🍔 Late/Spicy Meals',
    sleep_loss: '💤 Disrupted Sleep',
    strain: '🏋️ Physical Strain',
    hormones: '🩸 Hormonal Fluctuations'
  };
  const triggersText = (data.activeTriggers && data.activeTriggers.length > 0)
    ? data.activeTriggers.map(t => triggerMap[t] || t).join(' • ')
    : 'Standard Daily Demands';

  const html = `
    <div class="healing-protocol-card" id="active-healing-blueprint">
      <!-- HEADER DIAGNOSTIC BANNER -->
      <div class="healing-diagnostic-header">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
              <span class="tag-badge tag-rose">🩺 Clinical Problem Diagnostic</span>
              <span class="tag-badge tag-indigo">${data.badge}</span>
              <span class="tag-badge tag-emerald">🎁 +30 Green Points</span>
            </div>
            <h3 style="font-family: var(--font-heading); font-size: 22px; font-weight: 800; color: #0f172a; margin: 4px 0;">
              ${data.icon} ${data.title}
            </h3>

            <!-- Clinical Context Badges -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0;">
              <span style="font-size: 11px; font-weight: 700; background: #ffffff; border: 1px solid #fecdd3; color: #9f1239; padding: 3px 8px; border-radius: 6px;">
                ${durationLabel}
              </span>
              <span style="font-size: 11px; font-weight: 700; background: #ffffff; border: 1px solid #fecdd3; color: #9f1239; padding: 3px 8px; border-radius: 6px;">
                ${severityLabel}
              </span>
              <span style="font-size: 11px; font-weight: 700; background: #ffffff; border: 1px solid #fecdd3; color: #9f1239; padding: 3px 8px; border-radius: 6px;">
                ⚡ Aggravators: ${triggersText}
              </span>
              <span style="font-size: 11px; font-weight: 700; background: #ecfdf5; border: 1px solid #86efac; color: #065f46; padding: 3px 8px; border-radius: 6px;">
                ${dietPills[activeDiet]} Active
              </span>
            </div>

            <p style="font-size: 13px; color: #334155; margin: 6px 0 0; line-height: 1.5;">
              <strong>Biological Root Cause:</strong> ${data.rootCause}
            </p>
            <p style="font-size: 12px; color: #9f1239; margin: 6px 0 0; font-weight: 600;">
              🌿 <strong>Ayurvedic Diagnostic:</strong> ${data.ayurvedicDosha}
            </p>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn-secondary" onclick="speakHealingProtocol()" style="padding: 6px 12px; font-size: 12px;">
              <span>🔊 Listen to Audio Coach</span>
            </button>
            <button class="btn-secondary" onclick="copyHealingPrescription()" style="padding: 6px 12px; font-size: 12px;">
              <span>📋 Copy Protocol</span>
            </button>
          </div>
        </div>
      </div>

      <!-- IN-PRESCRIPTION 1-TAP DIETARY SWITCHER BAR -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-lg); padding: 12px 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">
            🥗 Calibrate Prescription to Patient Dietary Healing Mode:
          </span>
          <span style="font-size: 11px; font-weight: 700; color: #047857;">
            Currently Viewing: <strong>${dietPills[activeDiet]}</strong>
          </span>
        </div>
        <div class="diet-tabs-strip">
          <button type="button" class="diet-tab-btn ${activeDiet === 'veg' ? 'active' : ''}" onclick="setHealerDiet('veg')">🥗 Vegetarian</button>
          <button type="button" class="diet-tab-btn ${activeDiet === 'nonveg' ? 'active' : ''}" onclick="setHealerDiet('nonveg')">🍗 Non-Vegetarian</button>
          <button type="button" class="diet-tab-btn ${activeDiet === 'vegan' ? 'active' : ''}" onclick="setHealerDiet('vegan')">🌱 100% Plant-Based Vegan</button>
          <button type="button" class="diet-tab-btn ${activeDiet === 'fasting' ? 'active' : ''}" onclick="setHealerDiet('fasting')">🪔 Fasting / Vrat Mode</button>
        </div>
        ${activeDiet === 'fasting' ? `
          <div class="fasting-subtypes-strip" style="margin-top: 8px;">
            <span style="font-size: 11px; font-weight: 700; color: #92400e;">🪔 Select Fasting Protocol:</span>
            <button type="button" class="fasting-subtype-btn ${activeFastingType === 'intermittent' ? 'active' : ''}" onclick="setHealerFastingType('intermittent')">⏳ 16:8 Intermittent Fasting</button>
            <button type="button" class="fasting-subtype-btn ${activeFastingType === 'vrat_ekadashi' ? 'active' : ''}" onclick="setHealerFastingType('vrat_ekadashi')">🪔 Sacred Vrat / Ekadashi</button>
            <button type="button" class="fasting-subtype-btn ${activeFastingType === 'navratri_phalahar' ? 'active' : ''}" onclick="setHealerFastingType('navratri_phalahar')">🍎 Fruit Fast (Phalahar)</button>
            <button type="button" class="fasting-subtype-btn ${activeFastingType === 'water_detox' ? 'active' : ''}" onclick="setHealerFastingType('water_detox')">💧 Liquid & Water Detox</button>
          </div>
        ` : ''}
      </div>

      <!-- 3-COLUMN CLINICAL HEALING MATRIX -->
      <div class="healing-grid-4">
        <!-- 1. WHAT TO EAT -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-lg); padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">${dietIcons[activeDiet] || '🥗'}</span>
              <h4 style="font-family: var(--font-heading); font-size: 15px; font-weight: 800; color: #166534; margin: 0;">
                What to Eat & Drink
              </h4>
            </div>
            <span style="font-size: 10px; font-weight: 700; background: #dcfce7; color: #065f46; padding: 2px 6px; border-radius: 4px;">
              ${dietPills[activeDiet]}
            </span>
          </div>
          <p style="font-size: 12px; color: #64748b; margin: 0 0 10px;">
            ${dietTitles[activeDiet] || 'Targeted medicinal nutrition:'}
          </p>
          ${fastingNotice}
          ${eatCardsHtml}
        </div>

        <!-- 2. FOODS TO STRICTLY AVOID -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-lg); padding: 16px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <span style="font-size: 20px;">🚫</span>
            <h4 style="font-family: var(--font-heading); font-size: 15px; font-weight: 800; color: #9f1239; margin: 0;">
              Foods to Strictly Avoid
            </h4>
          </div>
          <p style="font-size: 12px; color: #64748b; margin: 0 0 10px;">
            Pro-inflammatory compounds that delay healing:
          </p>
          ${avoidCardsHtml}
        </div>

        <!-- 3. MEASURES TO TAKE TO HEAL -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-lg); padding: 16px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <span style="font-size: 20px;">🛡️</span>
            <h4 style="font-family: var(--font-heading); font-size: 15px; font-weight: 800; color: #1e40af; margin: 0;">
              Measures & Acupressure
            </h4>
          </div>
          <p style="font-size: 12px; color: #64748b; margin: 0 0 10px;">
            Ergonomics, hot/cold therapy, acupressure & sleep posture:
          </p>
          ${measuresHtml}
        </div>
      </div>

      <!-- TARGETED ANIMATED YOGA & EXERCISES SECTION -->
      <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
          <div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="tag-badge tag-emerald">Kinetic Asana Rehabilitation</span>
              <span style="font-size: 11px; color: var(--text-muted);">Interactive Visual Form Coaching</span>
            </div>
            <h4 style="font-family: var(--font-heading); font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0;">
              🧘 Targeted Remedial Exercises & Kinetic Animations
            </h4>
          </div>
          <span style="font-size: 12px; color: #047857; font-weight: 600; background: #dcfce7; padding: 4px 10px; border-radius: 999px;">
            ⚡ Tap Any Animation to Practice in Real-Time
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          ${exercisesHtml}
        </div>
      </div>

      <!-- 7-DAY PRECISION ROADMAP -->
      ${roadmapHtml}

      <!-- RED FLAGS SAFETY WARNING -->
      ${redFlagsHtml}

      <!-- RECOVERY TIMELINE & ACTION BUTTONS -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1.5px solid #bbf7d0; border-radius: var(--radius-lg); padding: 18px 20px; margin-top: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <strong style="color: #14532d; font-size: 13px; display: flex; align-items: center; gap: 6px;">
            <span>⏱️ Expected Recovery Milestone:</span>
          </strong>
          <p style="font-size: 13px; color: #166534; margin: 2px 0 0; line-height: 1.5;">
            ${data.recoveryMilestone}
          </p>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn-primary" onclick="logHealingPlanDone()" style="padding: 8px 16px; font-size: 12px;">
            <span>✓ Log Healing Adherence (+30 Pts)</span>
          </button>
          <button class="btn-secondary" onclick="applyHealingToDailyPlan()" style="padding: 8px 16px; font-size: 12px;">
            <span>🌟 Add Asanas to Today's Yoga Plan</span>
          </button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function speakHealingProtocol() {
  const DB = (typeof window !== 'undefined' && window.PROBLEM_HEALING_DATABASE) ? window.PROBLEM_HEALING_DATABASE : PROBLEM_HEALING_DATABASE;
  const data = state.lastProblemAnalysis || DB.back_pain;
  if (!data) return;

  const activeDiet = data.activeDiet || state.problemDietContext || state.userDiet || 'veg';
  let foods = [];
  if (data.whatToEatByDiet && data.whatToEatByDiet[activeDiet]) {
    foods = data.whatToEatByDiet[activeDiet].map(e => e.food);
  } else if (data.whatToEat) {
    foods = data.whatToEat.map(e => e.food);
  }

  const msg = `Healing protocol for ${data.title}. Biological root cause: ${data.rootCause}. Recommended foods to eat for your ${activeDiet} lifestyle: ${foods.join(', ')}. Avoid: ${data.foodsToAvoid.map(a => a.food).join(', ')}. Key remedial exercise: ${data.exercises[0].name}. Expected recovery: ${data.recoveryMilestone}`;
  speakCoach(msg);
  showToast('🔊 Audio Coach reciting tailored healing protocol');
}

function copyHealingPrescription() {
  const DB = (typeof window !== 'undefined' && window.PROBLEM_HEALING_DATABASE) ? window.PROBLEM_HEALING_DATABASE : PROBLEM_HEALING_DATABASE;
  const data = state.lastProblemAnalysis || DB.back_pain;
  if (!data) return;

  const activeDiet = data.activeDiet || state.problemDietContext || state.userDiet || 'veg';
  const activeFastingType = data.activeFastingType || state.problemFastingType || state.userFastingType || 'intermittent';

  let foods = [];
  if (data.whatToEatByDiet && data.whatToEatByDiet[activeDiet]) {
    foods = data.whatToEatByDiet[activeDiet];
  } else if (data.whatToEat) {
    foods = data.whatToEat;
  }

  const roadmap = data.healingRoadmap || {
    stage1: 'Days 1–2: Acute Symptom Relief',
    stage2: 'Days 3–5: Core Remodeling',
    stage3: 'Days 6–7+: Long-term Resilience'
  };

  const text = `
=== PRANAFIT CLINICAL HEALING PROTOCOL ===
Condition: ${data.title}
Biological Root Cause: ${data.rootCause}
Ayurvedic Dosha: ${data.ayurvedicDosha}
Active Diet Mode: ${activeDiet.toUpperCase()}${activeDiet === 'fasting' ? ` (${getFastingLabel(activeFastingType)})` : ''}
Duration: ${data.duration || 'Chronic'} | Severity: ${data.severity || 'Moderate'}

WHAT TO EAT & DRINK (${activeDiet.toUpperCase()} PROTOCOL):
${foods.map(e => `• ${e.food} (${e.why})`).join('\n')}

FOODS TO STRICTLY AVOID:
${data.foodsToAvoid.map(a => `• ${a.food} (${a.why})`).join('\n')}

TARGETED REMEDIAL EXERCISES:
${data.exercises.map(ex => `• ${ex.name} (${ex.duration}) - ${ex.cue}`).join('\n')}

HEALING MEASURES & ACUPRESSURE:
${data.measuresToTake.map(m => `• ${m.measure}: ${m.detail}`).join('\n')}

7-DAY HEALING ROADMAP:
• Phase 1 (Days 1–2): ${roadmap.stage1}
• Phase 2 (Days 3–5): ${roadmap.stage2}
• Phase 3 (Days 6–7+): ${roadmap.stage3}

EXPECTED RECOVERY MILESTONE:
${data.recoveryMilestone}
==========================================
Generated by PranaFit Integrated AI Health Platform
  `.trim();

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 Full Healing Prescription copied to clipboard!');
    });
  } else {
    showToast('📋 Healing Prescription prepared!');
  }
}

function applyHealingToDailyPlan() {
  const data = state.lastProblemAnalysis || PROBLEM_HEALING_DATABASE.back_pain;
  if (!data) return;

  // Insert poses into current routine
  const routine = YOGA_ROUTINES_DATA[state.yogaTime];
  if (routine && routine.poses) {
    data.exercises.forEach(ex => {
      if (!routine.poses.some(p => p.id === ex.id)) {
        routine.poses.unshift({
          id: ex.id,
          name: ex.name,
          sanskrit: ex.sanskrit,
          duration: ex.duration,
          target: ex.target,
          cue: ex.cue,
          benefit: ex.benefit,
          icon: '🌿'
        });
      }
    });
  }

  synth.playSuccessChime();
  renderDailyYogaPlan();
  showToast(`🌟 Recommended remedial asanas added to your ${state.yogaTime}-min Daily Yoga Plan!`);
  switchTab('today');
  setTimeout(() => {
    jumpToSection('daily-yoga-plan-section');
  }, 300);
}

function logHealingPlanDone() {
  addGreenPoints(30);
  synth.playSuccessChime();
  showToast('🎉 Problem healing adherence logged! +30 Green Points awarded.');
}

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast-notice');
  if (!toast) return;

  toast.innerText = message;
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// --- TAB SWITCHING ---
function switchTab(tabId) {
  state.activeTab = tabId;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabId}`);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Window exposures for inline event handlers and component interactions
window.openPoseAnimationModal = openPoseAnimationModal;
window.closePoseAnimationModal = closePoseAnimationModal;
window.navigateModalPose = navigateModalPose;
window.speakCurrentModalPose = speakCurrentModalPose;
window.markCurrentModalPoseDone = markCurrentModalPoseDone;
window.openExerciseAnimationByKeywords = openExerciseAnimationByKeywords;
window.selectProblemPreset = selectProblemPreset;
window.triggerProblemAnalysis = triggerProblemAnalysis;
window.clearProblemInput = clearProblemInput;
window.toggleProblemVoiceDictation = toggleProblemVoiceDictation;
window.speakHealingProtocol = speakHealingProtocol;
window.copyHealingPrescription = copyHealingPrescription;
window.applyHealingToDailyPlan = applyHealingToDailyPlan;
window.logHealingPlanDone = logHealingPlanDone;
window.jumpToSection = jumpToSection;
window.switchTab = switchTab;
window.showToast = showToast;
window.speakYogaPose = speakYogaPose;
window.speakEntireYogaRoutine = speakEntireYogaRoutine;
window.completeDailyYogaPlan = completeDailyYogaPlan;
window.resetDailyYogaPlan = resetDailyYogaPlan;
window.toggleYogaPoseDone = toggleYogaPoseDone;
window.setYogaTime = setYogaTime;
window.renderProblemHealingProtocol = renderProblemHealingProtocol;
window.analyzeHealthProblem = analyzeHealthProblem;
window.setDiet = setDiet;
window.setHealerDiet = setHealerDiet;
window.setHealerFastingType = setHealerFastingType;
window.setProblemDuration = setProblemDuration;
window.setProblemSeverity = setProblemSeverity;
window.toggleProblemTrigger = toggleProblemTrigger;
window.onProfileDietChanged = onProfileDietChanged;
window.onProfileFastingTypeChanged = onProfileFastingTypeChanged;
window.getFastingLabel = getFastingLabel;

// --- INITIALIZATION ON PAGE LOAD ---
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Authentication & Persistence (Remember Me)
  initAuthSystem();

  // Setup points UI
  updatePointsUI();

  // Setup gender
  setGender(state.userGender);

  // Setup initial region
  setRegion(state.userRegion);

  // Wire today answers chip listeners
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const group = btn.dataset.group;
      const val = btn.dataset.val;
      if (!group || !val) return;

      state.todayAnswers[group] = val;
      if (group === 'time') {
        state.yogaTime = val;
        try { localStorage.setItem('prana_yoga_time', val); } catch (e) {}
      }

      document.querySelectorAll(`.chip-btn[data-group="${group}"]`).forEach(b => {
        b.classList.toggle('active', b === btn);
      });

      renderTodayDiagnostic();
    });
  });

  // Voice toggle button
  const voiceToggle = document.getElementById('btn-voice-toggle');
  if (voiceToggle) {
    voiceToggle.classList.toggle('active', state.isVoiceActive);
    voiceToggle.addEventListener('click', () => {
      state.isVoiceActive = !state.isVoiceActive;
      localStorage.setItem('prana_voice', state.isVoiceActive.toString());
      voiceToggle.classList.toggle('active', state.isVoiceActive);
      showToast(state.isVoiceActive ? '🔊 Audio Coach Voice enabled' : '🔇 Audio Coach Voice muted');
    });
  }

  // Setup Problem Healer Textarea Character Counter & Enter key
  const problemInput = document.getElementById('problem-input-text');
  if (problemInput) {
    problemInput.addEventListener('input', () => {
      const charCounter = document.getElementById('problem-char-count');
      if (charCounter) charCounter.innerText = `${problemInput.value.length} / 500`;
    });
    problemInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        triggerProblemAnalysis();
      }
    });
  }

  // Pose Animation Modal Backdrop Click to Close & Escape Key
  const poseModal = document.getElementById('pose-animation-modal');
  if (poseModal) {
    poseModal.addEventListener('click', (e) => {
      if (e.target === poseModal) {
        closePoseAnimationModal();
      }
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePoseAnimationModal();
    }
  });

  // Initial render
  populateProfileForms();
  updateProfileBadge();
  renderTodayDiagnostic();
  renderLocationNutrition();
  renderGenderSection();
  renderDashboardProfile();
  setFemalePhase('follicular');

  // Initialize Default Problem Healer condition (Lower Back Pain)
  selectProblemPreset('back_pain');
});
