const startBtn = document.getElementById('start-btn');
const statusText = document.getElementById('status');
// Generate 20 candles across the FRONT RIMS of tiers 1-4
// Cake is 600x500. Center is left: 300px. 
const tiers = [
    { count: 8, width: 450, roofCenter: 170, roofHeight: 110 },
    { count: 6, width: 370, roofCenter: 250, roofHeight: 90 },
    { count: 4, width: 290, roofCenter: 315, roofHeight: 70 },
    { count: 2, width: 210, roofCenter: 375, roofHeight: 60 }
];

const globalCandlesContainer = document.getElementById('global-candles');
let globalCandleIndex = 0;

if (globalCandlesContainer) {
    tiers.forEach(tier => {
        for (let i = 0; i < tier.count; i++) {
            const candle = document.createElement('div');
            candle.classList.add('candle');
            
            // x goes from -1 to 1
            const normalizedX = (i / Math.max(1, tier.count - 1)) * 2 - 1; 
            
            // scale X to 80% of tier radius so candles aren't falling off edges
            const leftPx = 300 + (normalizedX * (tier.width / 2) * 0.8);
            
            // Ellipse formula for front rim (curves downwards towards viewer)
            const yOffset = (tier.roofHeight / 2) * Math.sqrt(1 - Math.pow(normalizedX, 2));
            const bottomPx = tier.roofCenter - yOffset;
            
            // Convert to topPx because .candle uses transform: translate(-50%, -100%)
            // which anchors the bottom of the element to topPx
            const topPx = 500 - bottomPx;
            
            candle.style.left = `${leftPx}px`;
            candle.style.top = `${topPx}px`;
            
            const flame = document.createElement('div');
            flame.classList.add('flame');
            flame.style.animationDelay = `${(globalCandleIndex * 0.1) % 1}s`;
            
            candle.appendChild(flame);
            globalCandlesContainer.appendChild(candle);
            globalCandleIndex++;
        }
    });

    // Generate Number Candles on Tier 5
    // Tier 5 roof center is 430px from bottom
    const digits = [
        { digit: '2', left: '280px' },
        { digit: '1', left: '320px' }
    ];
    
    digits.forEach(d => {
        const bigCandle = document.createElement('div');
        bigCandle.classList.add('number-candle');
        
        bigCandle.style.left = d.left;
        bigCandle.style.bottom = '430px'; 
        
        const stick = document.createElement('div');
        stick.classList.add('stick');
        bigCandle.appendChild(stick);
        
        const text = document.createElement('div');
        text.classList.add('candle-text');
        text.innerText = d.digit;
        bigCandle.appendChild(text);
        
        const flame = document.createElement('div');
        flame.classList.add('flame');
        bigCandle.appendChild(flame);
        
        globalCandlesContainer.appendChild(bigCandle);
    });
}
let audioContext;
let analyser;
let microphone;
let dataArray;
let animationId;

// Parameter for blowing detection
// Adjust this threshold if it's too hard or too easy to blow out the candle
const BLOW_THRESHOLD = 0.15; 
let blownOut = false;

startBtn.addEventListener('click', async () => {
    if (blownOut) {
        // Reset candle if it was already blown out
        document.querySelectorAll('.flame').forEach(f => f.classList.remove('blown-out'));
        blownOut = false;
        startBtn.innerText = 'Tắt Micro';
        
        // resume audio context if suspended
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        detectBlow();
        return;
    }

    if (audioContext && audioContext.state === 'running') {
        stopListening();
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            } 
        });

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        startBtn.innerText = 'Tắt Micro';
        
        detectBlow();

    } catch (err) {
        console.error('Error accessing microphone:', err);
    }
});

function detectBlow() {
    if (!audioContext || blownOut) return;

    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    // Calculate average volume
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    let averageVolume = sum / dataArray.length;
    
    // Normalize volume to 0-1 range (max value is 255)
    let normalizedVolume = averageVolume / 255;
    
    // To see the volume level in console for debugging
    // console.log("Volume:", normalizedVolume);

    if (normalizedVolume > BLOW_THRESHOLD) {
        blowOutCandle();
    } else {
        // Continue checking
        animationId = requestAnimationFrame(detectBlow);
    }
}

function blowOutCandle() {
    blownOut = true;
    document.querySelectorAll('.flame').forEach(f => f.classList.add('blown-out'));
    startBtn.innerText = 'Thắp Sáng Lại Nến';
    
    // Confetti celebration
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffb6c1', '#ffd700', '#ffffff', '#81ecec'] // Pink, Gold, White, Light Blue
    });
    
    // Stop audio context to save resources
    if (audioContext && audioContext.state === 'running') {
        audioContext.suspend();
    }
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}

function stopListening() {
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    startBtn.innerText = 'Bật Micro';
    document.querySelectorAll('.flame').forEach(f => f.classList.remove('blown-out'));
    blownOut = false;
}
