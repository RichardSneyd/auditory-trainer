const pwaEnabled = true;
if (pwaEnabled && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('ServiceWorker registered:', registration);
            })
            .catch((registrationError) => {
                console.log('ServiceWorker registration failed:', registrationError);
            });
    });
}

let filterTimeout;
let gatingTimeout;
let filterInterval;
let gatingInterval;

// JavaScript Audio Context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// HTML Elements
const audioInput = document.getElementById('audioInput');
const audioPlayer = document.getElementById('audioPlayer');
const filterFrequencyMin = document.getElementById('filterFrequencyMin');
const filterFrequencyMax = document.getElementById('filterFrequencyMax');
const gatingFrequencyMin = document.getElementById('gatingFrequencyMin');
const gatingFrequencyMax = document.getElementById('gatingFrequencyMax');
const volumeControl = document.getElementById('volumeControl');
const dynamicFilter = document.getElementById('dynamicFilter');
const dynamicGating = document.getElementById('dynamicGating');
const dynamicPlaybackRate = document.getElementById('dynamicPlaybackRate');
const dyanmicBinauralBeat = document.getElementById('dynamicBinauralBeat');

// Audio Nodes
let sourceNode;
let filterNode;
let gainNode;
let pannerNode;

// Initialize new oscillator nodes for binaural beats
let oscillatorNodeLeft;
let oscillatorNodeRight;

let gainNodeLeft;
let gainNodeRight;

// Initialize new panner nodes for left and right oscillators
let pannerNodeLeft;
let pannerNodeRight;


// Initialize Settings
const settings = {
    filterMin: parseFloat(filterFrequencyMin.value),
    filterMax: parseFloat(filterFrequencyMax.value),
    gatingMin: parseFloat(gatingFrequencyMin.value),
    gatingMax: parseFloat(gatingFrequencyMax.value),
    volume: parseFloat(volumeControl.value),
    dynamicFilter: dynamicFilter.checked,
    dynamicGating: dynamicGating.checked,
    dynamicPlaybackRate: dynamicPlaybackRate.checked,
    dyanmicBinauralBeat: dyanmicBinauralBeat.checked
};

// Helper Functions
const getRandomBetween = (min, max) => Math.random() * (max - min) + min;

// Update Settings
const updateSettings = () => {
    settings.filterMin = parseFloat(filterFrequencyMin.value);
    settings.filterMax = parseFloat(filterFrequencyMax.value);
    settings.gatingMin = parseFloat(gatingFrequencyMin.value);
    settings.gatingMax = parseFloat(gatingFrequencyMax.value);
    settings.volume = parseFloat(volumeControl.value);
    settings.dynamicFilter = dynamicFilter.checked;
    settings.dynamicGating = dynamicGating.checked;
    settings.dynamicPlaybackRate = dynamicPlaybackRate.checked;
    settings.dyanmicBinauralBeat = dyanmicBinauralBeat.checked;
    dynamicPlaybackLogic();
    dynamicBinauralBeatLogic();

    // Apply immediate changes to the audio nodes
    gainNode.gain.setValueAtTime(settings.volume, audioContext.currentTime);

    // If dynamic settings are not checked, apply the max value immediately
    if (!settings.dynamicFilter) {
        filterNode.frequency.setValueAtTime(settings.filterMax, audioContext.currentTime);
    }
    if (!settings.dynamicGating) {
        // Reset to avoid sudden silence. A more complex gating logic can be applied here.
        gainNode.gain.setValueAtTime(settings.volume, audioContext.currentTime);
    }
};


const startBinauralBeats = () => {
    if (oscillatorNodeLeft) oscillatorNodeLeft.stop();
    if (oscillatorNodeRight) oscillatorNodeRight.stop();

    // Initialize new oscillator nodes for binaural beats
    oscillatorNodeLeft = audioContext.createOscillator();
    oscillatorNodeRight = audioContext.createOscillator();

    // Initialize gain nodes
    gainNodeLeft = audioContext.createGain();
    gainNodeRight = audioContext.createGain();

    // Initialize new panner nodes for left and right oscillators
    pannerNodeLeft = audioContext.createStereoPanner();
    pannerNodeRight = audioContext.createStereoPanner();

    // Set pan values
    pannerNodeLeft.pan.value = -1; // full left
    pannerNodeRight.pan.value = 1; // full right

    // Set gain values (1.0 is normal volume, 2.0 is twice the normal volume, etc.)
    const gain = getRandomBetween(0.0001, 0.006) * settings.volume;
    gainNodeLeft.gain.value = gain;
    gainNodeRight.gain.value = gain;

    // Connect nodes
    oscillatorNodeLeft.connect(gainNodeLeft);
    gainNodeLeft.connect(pannerNodeLeft);
    pannerNodeLeft.connect(audioContext.destination);

    oscillatorNodeRight.connect(gainNodeRight);
    gainNodeRight.connect(pannerNodeRight);
    pannerNodeRight.connect(audioContext.destination);

    // Start oscillators
    if (!audioPlayer.paused) oscillatorNodeLeft.start();
    if (!audioPlayer.paused) oscillatorNodeRight.start();
}

const stopBinauralBeats = () => {
    oscillatorNodeLeft.stop();
    oscillatorNodeRight.stop();
}

// Initialize Audio Nodes and connect them
const initAudioNodes = () => {
    sourceNode = audioContext.createMediaElementSource(audioPlayer);
    filterNode = audioContext.createBiquadFilter();
    gainNode = audioContext.createGain();
    pannerNode = audioContext.createStereoPanner();

    // Connect the nodes
    sourceNode.connect(filterNode);
    filterNode.connect(pannerNode);  // Connect the filter to the panner
    pannerNode.connect(gainNode);  // Connect the panner to the gain
    gainNode.connect(audioContext.destination);

   // startBinauralBeats();

};


const setBinauralBeatFreq = (beatFrequency) => {
    const low = beatFrequency - 10;
    const high = beatFrequency + 10;
    const lowLeft = getRandomBetween(0, 1) > 0.5;
    // Set base frequency of oscillator to be the same as newFrequency
    oscillatorNodeLeft.frequency.setValueAtTime(lowLeft ? low : high, audioContext.currentTime);

    // Set frequency of the right channel to be (newFrequency + beatFrequency)
    oscillatorNodeRight.frequency.setValueAtTime(lowLeft ? high : low, audioContext.currentTime + 0.01);
}

// Dynamic Filter Logic
const dynamicFilterLogic = () => {
    if (settings.dynamicFilter) {
        clearTimeout(filterTimeout);  // Cancel previous timeouts
        const newFrequency = getRandomBetween(settings.filterMin, settings.filterMax);
        filterNode.frequency.setValueAtTime(newFrequency, audioContext.currentTime);

        setBinauralBeatFreq(newFrequency);

        const newTime = getRandomBetween(500, 3000);  // For example, between 0.5 and 3 seconds
        // Schedule the next filter logic at the end of this one
        filterTimeout = setTimeout(dynamicFilterLogic, newTime);
    }
};

// Dynamic Gating Logic
const dynamicGatingLogic = () => {

    clearTimeout(gatingTimeout);  // Cancel previous timeouts
    const newTime = getRandomBetween(settings.gatingMin, settings.gatingMax);
    if (settings.dynamicGating) gainNode.gain.setValueAtTime(getRandomBetween(0, settings.volume), audioContext.currentTime);
    setTimeout(() => {
        gainNode.gain.setValueAtTime(settings.volume, audioContext.currentTime);
        // Schedule the next gating logic at the end of this one
        gatingTimeout = setTimeout(dynamicGatingLogic, newTime * getRandomBetween(500, 7000));
    }, newTime * 500);

};

const dynamicPanningLogic = () => {
    const panValue = getRandomBetween(-1, 1); // -1 (full left) to 1 (full right)
    pannerNode.pan.setValueAtTime(panValue, audioContext.currentTime);
    setTimeout(dynamicPanningLogic, getRandomBetween(100, 3000));
};

const dynamicPlaybackLogic = () => {
    audioPlayer.playbackRate = getRandomBetween(0.5, 1.5);
    setTimeout(dynamicPlaybackLogic, getRandomBetween(2000, 12000))
    if (!settings.dynamicPlaybackRate) audioPlayer.playbackRate = 1;
}

const dynamicBinauralBeatLogic = () => {
    if (settings.dyanmicBinauralBeat && !audioPlayer.paused) {
        startBinauralBeats();
    }
    else {
        stopBinauralBeats();
    }
}

// Main Functionality
audioInput.addEventListener('change', event => {
    const file = event.target.files[0];
    const objectURL = URL.createObjectURL(file);
    audioPlayer.src = objectURL;

    initAudioNodes();

    //redundant...
    dynamicFilterLogic();
    dynamicGatingLogic();
    dynamicPanningLogic();
    dynamicPlaybackLogic();
});

// Event Listeners for controls
audioInput.addEventListener('change', event => {
    stopBinauralBeats();
    const file = event.target.files[0];
    const objectURL = URL.createObjectURL(file);
    audioPlayer.src = objectURL;
    document.getElementById('trackLabel').innerText = file.name;
    audioPlayer.load();
    
});

audioPlayer.addEventListener('play', () => {
    if (!audioContext) {
        // Initialize the Audio Context if not already initialized
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    if (!sourceNode) {
        initAudioNodes();
    }

    // Cancel any existing intervals if they exist
    clearInterval(filterInterval);
    clearInterval(gatingInterval);

    // Dynamic filter logic with random interval
    filterInterval = setInterval(() => {
        const randomDelay = getRandomBetween(100, 3000); // 500ms to 3000ms
        setTimeout(dynamicFilterLogic, randomDelay);
    }, 1000);

    // Dynamic gating logic with random interval
    gatingInterval = setInterval(() => {
        const randomDelay = getRandomBetween(200, 4000); // 500ms to 3000ms
        setTimeout(dynamicGatingLogic, randomDelay);
    }, 1000);
});

const playbackSpeedDisplay = document.getElementById('playbackSpeedDisplay');

audioPlayer.addEventListener('timeupdate', function () {
    playbackSpeedDisplay.innerHTML = `Playback Speed: ${audioPlayer.playbackRate.toFixed(2)}x`;
});


// Event Listeners for updating settings
filterFrequencyMin.addEventListener('input', updateSettings);
filterFrequencyMax.addEventListener('input', updateSettings);
gatingFrequencyMin.addEventListener('input', updateSettings);
gatingFrequencyMax.addEventListener('input', updateSettings);
volumeControl.addEventListener('input', updateSettings);
dynamicFilter.addEventListener('change', updateSettings);
dynamicGating.addEventListener('change', updateSettings);
dynamicPlaybackRate.addEventListener('change', updateSettings);
dyanmicBinauralBeat.addEventListener('change', updateSettings);

audioPlayer.addEventListener('play', function () {
    if(settings.dyanmicBinauralBeat) startBinauralBeats();
});

audioPlayer.addEventListener('pause', function () {
    stopBinauralBeats();
});


