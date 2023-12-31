(() => {
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

    registerServiceWorker();

    let filterTimeout;
    let gatingTimeout;
    let filterInterval;
    let gatingInterval;
    let firstInteraction = false;
    let beatsPlaying = false;
    let currentVolume = 1;
    let ramp = .15;
    let panningRamp = .45;
    let sampleTracks = [];

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
    const shuffleBtn = document.getElementById("shuffleBtn");

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
        dynamicBinauralBeat: dyanmicBinauralBeat.checked,
        shuffle: true
    };

    // Initialize Audio Nodes and connect them
    const initAudioNodes = () => {
        sourceNode = audioContext.createMediaElementSource(audioPlayer);
        filterNode = audioContext.createBiquadFilter();
        gainNode = audioContext.createGain();
        pannerNode = audioContext.createStereoPanner();

        // Connect the nodes
        sourceNode.connect(filterNode);
        filterNode.connect(pannerNode);
        pannerNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
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

        dynamicGatingLogic();

        setFilterFreq();

        if (!settings.dynamicGating) {
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
        if(!gainNode) return;
        currentVolume = settings.dynamicGating ? getRandomBetween(0.1, settings.volume) : settings.volume;
        gainNode.gain.linearRampToValueAtTime(currentVolume, audioContext.currentTime + ramp);
        setBeatGain();
    }

    const setBeatGain = () => {
        if(!gainNodeLeft || !gainNodeRight) return;
        const gain = getRandomBetween(0.004, 0.012)  * currentVolume;
        gainNodeLeft.gain.value = gain;
        gainNodeRight.gain.value = gain;
    }


    const setBinauralBeatFreq = (beatFrequency) => {
        if (!beatsPlaying) return;
        const base = getRandomBetween(settings.filterMin, beatFrequency) / getRandomBetween(3, 6);
        const targetWave = getRandomBetween(0.5, 19); // delta 0.5-4, theta 4-8, alpha 8-14, beta 14-30, gamma 30-100
        const low = base - targetWave / 2;

        const high = base + targetWave / 2;
        const lowLeft = getRandomBetween(0, 1) > 0.5;

        const rampFactor = getRandomBetween(0.7, 2.5);
        oscillatorNodeLeft.frequency.linearRampToValueAtTime(lowLeft ? low : high, audioContext.currentTime + ramp * rampFactor);
        oscillatorNodeRight.frequency.linearRampToValueAtTime(lowLeft ? high : low, audioContext.currentTime + ramp * rampFactor);
    }

    const setFilterFreq = (newFrequency) => {
        // If dynamic settings are not checked, apply the max value immediately
        if (!settings.dynamicFilter) {
            filterNode.type = "highpass";
            filterNode.frequency.linearRampToValueAtTime(settings.filterMin, audioContext.currentTime + ramp);
            return;
        }

       // filterNode.type = getRandomBetween(0, 1) > 0.4 ? 'highpass' : 'lowpass';
        filterNode.type = 'bandpass';
        filterNode.Q.value =  getRandomBetween(0, 1);
        filterNode.frequency.linearRampToValueAtTime(newFrequency || settings.filterMax, audioContext.currentTime + ramp);
    }

    // Dynamic Filter Logic
    const dynamicFilterLogic = () => {
        if (settings.dynamicFilter) {
            clearTimeout(filterTimeout);
            const newFrequency = getRandomBetween(settings.filterMin, settings.filterMax);
            setFilterFreq(newFrequency)

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
    };

    const dynamicPanningLogic = () => {
        const panValue = getRandomBetween(-1, 1); // -1 (full left) to 1 (full right)
        pannerNode.pan.linearRampToValueAtTime(panValue, audioContext.currentTime + panningRamp);
        setTimeout(dynamicPanningLogic, getRandomBetween(600, 7000));
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
        const objectURL = file instanceof File ? URL.createObjectURL(file) : file;
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

    const onPlayPressed = () => {
        if (settings.dynamicBinauralBeat && !audioPlayer.paused) startBinauralBeats();
        playAudio();
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
        setBeatGain();
    });
    dynamicFilter.addEventListener('change', updateSettings);
    dynamicGating.addEventListener('change', updateSettings);

    dynamicPlaybackRate.addEventListener('change', () => {
        updateSettings();
        dynamicPlaybackLogic();
    });
    dyanmicBinauralBeat.addEventListener('change', () => {
        updateSettings();
        dynamicBinauralBeatLogic();
    });

    audioPlayer.addEventListener('play', function () {
        onPlayPressed();
    });

    audioPlayer.addEventListener('pause', function () {
        stopBinauralBeats();
    });

    const fetchSampleTracks = () => {

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
                        changeAudio(track.audio, label);
                        $('#sampleTrackModal').modal('hide');
                    });
                    trackList.appendChild(listItem);
                    track.element = listItem;
                });
                sampleTracks = data;

            })
            .catch(error => console.error('Error fetching sample tracks:', error));

        document.getElementById('trackPickerBtn').addEventListener('click', function (evt) {
            evt.preventDefault();
            $('#sampleTrackModal').modal('show');
        });
    }

    const randomTrack = () => {
        const index = Math.floor(getRandomBetween(0, sampleTracks.length - 1));
        sampleTracks[index].element.click();
        audioPlayer.play();
        onPlayPressed();
    }

    window.addEventListener('DOMContentLoaded', () => {
        fetchSampleTracks();
        setTimeout(() => {
            const link = document.getElementById("welcomeModalLaunch");
            link.click();
            window.addEventListener('click', firstInteractionListener);
        }, 200);

        shuffleBtn.addEventListener("click", function () {
            if (this.classList.contains("btn-secondary")) {
                this.classList.remove("btn-secondary");
                this.classList.add("btn-success");
                settings.shuffle = true;
            } else {
                this.classList.remove("btn-success");
                this.classList.add("btn-secondary");
                settings.shuffle = false;
            }
        });

        audioPlayer.addEventListener("ended", function () {
            if (settings.shuffle) randomTrack();
        });
    })
})();