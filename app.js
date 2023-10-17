const registerServiceWorker = () => {
    if ('serviceWorker' in navigator) {
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
}

// registerServiceWorker();

let filterTimeout;
let gatingTimeout;
let filterInterval;
let gatingInterval;
let firstInteraction = false;
let firstPlay = false;
let beatsPlaying = false;
let currentVolume = 1;
let ramp = .15;
let panningRamp = .55;

// JavaScript Audio Context
let audioContext;

// HTML Elements
const audioInput = document.getElementById('audioInput');
const audioPlayer = document.getElementById('audioPlayer');
audioPlayer.disabled = true;
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
    dynamicBinauralBeat: dyanmicBinauralBeat.checked
};

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

    //  changeAudio(defaultAudioBlob);
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
    settings.dynamicBinauralBeat = dyanmicBinauralBeat.checked;
  //  dynamicBinauralBeatLogic();

    // Apply immediate changes to the audio nodes
    gainNode.gain.linearRampToValueAtTime(settings.volume, audioContext.currentTime + ramp);

    // If dynamic settings are not checked, apply the max value immediately
    if (!settings.dynamicFilter) {
        filterNode.frequency.linearRampToValueAtTime(settings.filterMax, audioContext.currentTime + ramp);
    }
    if (!settings.dynamicGating) {
        // Reset to avoid sudden silence. A more complex gating logic can be applied here.
        gainNode.gain.linearRampToValueAtTime(settings.volume, audioContext.currentTime + ramp);
    }
};

const stopBinauralBeats = () => {
    if (!beatsPlaying) return;
    beatsPlaying = false;
    if (oscillatorNodeLeft) oscillatorNodeLeft.stop();
    if (oscillatorNodeRight) oscillatorNodeRight.stop();
}

const startBinauralBeats = () => {
     if (beatsPlaying || !settings.dynamicBinauralBeat) return;
    beatsPlaying = true;

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

    setBeatGain();

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

const setCurrentVolume = () => {
    currentVolume = getRandomBetween(0, settings.volume);
}

const setBeatGain = () => {
    const gain = getRandomBetween(0, 0.019 * currentVolume);
    gainNodeLeft.gain.value = gain;
    gainNodeRight.gain.value = gain;
}


const setBinauralBeatFreq = (beatFrequency) => {
    if (!beatsPlaying) return;
    // const base = Math.max(100, beatFrequency);
    const base = getRandomBetween(settings.filterMin, beatFrequency) / getRandomBetween(3, 6);
    const targetWave = getRandomBetween(0.5, 19); // delta 0.5-4, theta 4-8, alpha 8-14, beta 14-30, gamma 30-100
    const low = base - targetWave / 2;

    const high = base + targetWave / 2;
    const lowLeft = getRandomBetween(0, 1) > 0.5;

    const rampFactor = getRandomBetween(0.7, 2.5);
    oscillatorNodeLeft.frequency.linearRampToValueAtTime(lowLeft ? low : high, audioContext.currentTime + ramp * rampFactor);
    oscillatorNodeRight.frequency.linearRampToValueAtTime(lowLeft ? high : low, audioContext.currentTime + ramp * rampFactor);
}

// Dynamic Filter Logic
const dynamicFilterLogic = () => {
    if (settings.dynamicFilter) {
        clearTimeout(filterTimeout);
        const newFrequency = getRandomBetween(settings.filterMin, settings.filterMax);
        filterNode.frequency.linearRampToValueAtTime(newFrequency, audioContext.currentTime + ramp);

        setBinauralBeatFreq(newFrequency);

        const newTime = getRandomBetween(900, 10000);

        // Schedule the next filter logic at the end of this one
        filterTimeout = setTimeout(dynamicFilterLogic, newTime);
    }
};

// Dynamic Gating Logic
const dynamicGatingLogic = () => {

    clearTimeout(gatingTimeout);
    const newTime = getRandomBetween(settings.gatingMin, settings.gatingMax);
    setCurrentVolume();
    if (settings.dynamicGating) gainNode.gain.linearRampToValueAtTime(currentVolume, audioContext.currentTime + ramp);
    setTimeout(() => {
        gainNode.gain.linearRampToValueAtTime(settings.volume, audioContext.currentTime + ramp);

        // Schedule the next gating logic at the end of this one
        gatingTimeout = setTimeout(dynamicGatingLogic, newTime * getRandomBetween(700, 11000));
    }, newTime * 1000);

};

const dynamicPanningLogic = () => {
    const panValue = getRandomBetween(-1, 1); // -1 (full left) to 1 (full right)
    pannerNode.pan.linearRampToValueAtTime(panValue, audioContext.currentTime + panningRamp);
    setTimeout(dynamicPanningLogic, getRandomBetween(600, 11000));
};

const dynamicPlaybackLogic = () => {
    audioPlayer.playbackRate = getRandomBetween(0.5, 1.5);
    setTimeout(dynamicPlaybackLogic, getRandomBetween(2000, 12000))
    if (!settings.dynamicPlaybackRate) audioPlayer.playbackRate = 1;
}

const dynamicBinauralBeatLogic = () => {
    setBeatGain();
    if (settings.dynamicBinauralBeat && !audioPlayer.paused) {
        startBinauralBeats();
    }
    else {
        stopBinauralBeats();
    }
}



const changeAudio = (file, name) => {
    const objectURL =  file instanceof File ? URL.createObjectURL(file) : file;
    audioPlayer.src = objectURL;
    document.getElementById('trackLabel').innerText = name;
    audioPlayer.load();

    if (!firstInteraction) {
        firstInteractionListener();
        return;
    }
    audioPlayer.disabled = false;
    stopBinauralBeats();

    configureAudio();
}

const configureAudio = () => {
    dynamicFilterLogic();
    dynamicGatingLogic();
    dynamicPanningLogic();
    dynamicPlaybackLogic();
}

const playAudio = () => {
    configureAudio();
    if (settings.dynamicBinauralBeat && !audioPlayer.paused) startBinauralBeats();
    if (!audioContext) {
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
}


const firstInteractionListener = async () => {
    if (firstInteraction) return;
    firstInteraction = true;
    window.removeEventListener('click', firstInteractionListener);

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    // await loadDefaultAudioBlob();
    initAudioNodes();
    playAudio();
    if (settings.dynamicBinauralBeat && !audioPlayer.paused) startBinauralBeats();
}

const playbackSpeedDisplay = document.getElementById('playbackSpeedDisplay');

audioPlayer.addEventListener('timeupdate', function () {
    playbackSpeedDisplay.innerHTML = `Playback Rate: ${audioPlayer.playbackRate.toFixed(2)}x`;
});

audioInput.addEventListener('change', event => {
    changeAudio(event.target.files[0], event.target.files[0].name);
});

// Event Listeners for updating settings
filterFrequencyMin.addEventListener('input', updateSettings);
filterFrequencyMax.addEventListener('input', updateSettings);
gatingFrequencyMin.addEventListener('input', updateSettings);
gatingFrequencyMax.addEventListener('input', updateSettings);
volumeControl.addEventListener('input', () => {
    updateSettings();
    setCurrentVolume();
    setBeatGain();
});
dynamicFilter.addEventListener('change', updateSettings);
dynamicGating.addEventListener('change', updateSettings);

dynamicPlaybackRate.addEventListener('change', () => {
    updateSettings();
    dynamicPlaybackLogic();
});
dyanmicBinauralBeat.addEventListener('change', ()=> {
    updateSettings();
    dynamicBinauralBeatLogic();
});

audioPlayer.addEventListener('play', function () {
   // if (audioPlayer.disabled) return;
    firstPlay = true;
    if (settings.dynamicBinauralBeat && !audioPlayer.paused)  startBinauralBeats();
    playAudio();
});

audioPlayer.addEventListener('pause', function () {
   // if (audioPlayer.disabled) return;
    stopBinauralBeats();
});

const fetchSampleTracks = () => {
    document.getElementById('trackPickerBtn').addEventListener('click', function (evt) {
        evt.preventDefault();
        fetch('/music/tracklist.json') 
            .then(response => response.json())
            .then(data => {
                const trackList = document.getElementById('sampleTrackList');
                trackList.innerHTML = '';
                data.forEach(track => { 
                    const listItem = document.createElement('li');
                    const label = track.name + " (" + track.artist_name + ")";
                    listItem.textContent = label;
                    listItem.addEventListener('click', function () {
                        console.log(track);
                        changeAudio(track.audio, label); 
                        $('#sampleTrackModal').modal('hide');
                    });
                    trackList.appendChild(listItem);
                });
                $('#sampleTrackModal').modal('show');
            })
            .catch(error => console.error('Error fetching sample tracks:', error));
    });
}



window.addEventListener('DOMContentLoaded', () => {
    fetchSampleTracks();
    setTimeout(() => {
        const link = document.getElementById("welcomeToNeuroTune");
        link.click();
        window.addEventListener('click', firstInteractionListener);
    }, 200);
})