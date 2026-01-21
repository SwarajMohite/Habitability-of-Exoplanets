// script.js - SAFE & PRODUCTION READY
// =======================================================

// ========== CONFIGURATION ==========
const FLASK_API = "https://backend-exo-9mu0.onrender.com"; // Render backend base URL

let currentParameters = {
    radius: 1.0,
    mass: 1.0,
    gravity: 1.0,
    period: 365.0,
    temp: 288.0,
    density: 5.51
};

// ========== UI FUNCTIONS ==========
function updateValue(id, value) {
    const valueSpan = document.getElementById(`${id}Value`);
    if (!valueSpan) return;

    const numValue = parseFloat(value);
    valueSpan.textContent = !isNaN(numValue) ? numValue.toFixed(id === "temp" ? 0 : 1) : "0";
    currentParameters[id] = !isNaN(numValue) ? numValue : 0;

    updateComparisonDisplay();
}

function updateComparisonDisplay() {
    const compRadius = document.getElementById("compRadius");
    const compMass = document.getElementById("compMass");
    const compGravity = document.getElementById("compGravity");

    if (compRadius) compRadius.textContent = currentParameters.radius.toFixed(1);
    if (compMass) compMass.textContent = currentParameters.mass.toFixed(1);
    if (compGravity) compGravity.textContent = currentParameters.gravity.toFixed(1);
}

// ========== SAMPLE DATA ==========
function loadSampleData() {
    const selected = document.getElementById("sampleSelect")?.value;
    if (!selected) return;

    const samples = {
        earth: { radius: 1.0, mass: 1.0, gravity: 1.0, period: 365.25, temp: 288, density: 5.51 },
        super: { radius: 1.5, mass: 5.0, gravity: 2.2, period: 200, temp: 300, density: 6.0 },
        ocean: { radius: 1.2, mass: 1.5, gravity: 1.1, period: 400, temp: 280, density: 4.0 },
        mars: { radius: 0.53, mass: 0.11, gravity: 0.38, period: 687, temp: 210, density: 3.93 },
        hot: { radius: 10.0, mass: 300.0, gravity: 3.0, period: 5, temp: 1500, density: 1.3 }
    };

    const sample = samples[selected];
    if (!sample) return;

    Object.keys(sample).forEach(key => {
        const slider = document.getElementById(key);
        const valueSpan = document.getElementById(`${key}Value`);
        if (slider && valueSpan) {
            slider.value = sample[key];
            valueSpan.textContent = !isNaN(sample[key]) ? sample[key].toFixed(key === "temp" ? 0 : 1) : "0";
            currentParameters[key] = !isNaN(sample[key]) ? sample[key] : 0;
        }
    });

    updateComparisonDisplay();
}

// ========== API CALL ==========
async function predictHabitability() {
    const btn = document.querySelector(".btn-primary");
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = "Analyzing...";

    try {
        const payload = {
            // Frontend names
            radius: currentParameters.radius,
            mass: currentParameters.mass,
            gravity: currentParameters.gravity,
            period: currentParameters.period,
            temp: currentParameters.temp,
            density: currentParameters.density,

            // Model-compatible names
            P_RADIUS: currentParameters.radius,
            P_MASS: currentParameters.mass,
            P_GRAVITY: currentParameters.gravity,
            P_ORBPER: currentParameters.period,
            P_TEMP_EQUIL: currentParameters.temp,
            P_DENSITY: currentParameters.density
        };

        const response = await fetch(`${FLASK_API}/api/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API error ${response.status}: ${errText}`);
        }

        const result = await response.json();
        updatePredictionDisplay(result);
        showNotification("✅ Prediction successful", "success");

    } catch (error) {
        console.error("Prediction error:", error);
        showNotification(error.message || "Prediction failed", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-bolt"></i> Predict Habitability';
    }
}

// ========== UI UPDATES ==========
function updatePredictionDisplay(result) {
    const probability = Number(result?.probability ?? 0);
    const predictionLabel = result?.prediction_label ?? "Unknown";
    const confidence = result?.confidence ?? "--";
    const modelUsed = result?.model_used ?? "--";
    const earthSimilarity = result?.earth_similarity ?? "--";
    const probabilities = result?.probabilities ?? {
        Non_Habitable: 0,
        Potentially_Habitable: 0,
        Highly_Habitable: 0
    };

    const scoreEl = document.getElementById("scoreValue");
    if (scoreEl) scoreEl.textContent = probability.toFixed(1);

    const labelEl = document.getElementById("habitabilityLabel");
    if (labelEl) labelEl.textContent = predictionLabel;

    const descEl = document.getElementById("habitabilityDescription");
    if (descEl) descEl.textContent = `${predictionLabel} (${confidence} confidence)`;

    const confEl = document.getElementById("confidenceValue");
    if (confEl) confEl.textContent = confidence;

    const modelEl = document.getElementById("modelUsed");
    if (modelEl) modelEl.textContent = modelUsed;

    const earthEl = document.getElementById("earthSimilarity");
    if (earthEl) earthEl.textContent = `${earthSimilarity}%`;

    updateProbabilityBars(probabilities);
    drawScoreWheel(probability);
}

function updateProbabilityBars(probabilities) {
    const keysMap = {
        Non: probabilities.Non_Habitable ?? 0,
        Pot: probabilities.Potentially_Habitable ?? 0,
        High: probabilities.Highly_Habitable ?? 0
    };

    Object.keys(keysMap).forEach(key => {
        const val = keysMap[key];
        const textEl = document.getElementById(`prob${key}`);
        const fillEl = document.getElementById(`prob${key}Fill`);
        if (textEl) textEl.textContent = `${val}%`;
        if (fillEl) fillEl.style.width = `${val}%`;
    });
}

// ========== SCORE WHEEL ==========
function drawScoreWheel(score) {
    const canvas = document.getElementById("scoreCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(200,200,200,0.3)";
    ctx.lineWidth = 12;
    ctx.stroke();

    // Progress
    ctx.beginPath();
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (score / 100) * 2 * Math.PI;
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);

    // Gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    if (score < 33) {
        gradient.addColorStop(0, "#ff6b6b");
        gradient.addColorStop(1, "#ffb347");
    } else if (score < 66) {
        gradient.addColorStop(0, "#ffb347");
        gradient.addColorStop(1, "#00d4aa");
    } else {
        gradient.addColorStop(0, "#00d4aa");
        gradient.addColorStop(1, "#4a90e2");
    }
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.stroke();
}

// ========== NOTIFICATIONS ==========
function showNotification(message, type = "info") {
    const n = document.createElement("div");
    n.className = `notification notification-${type}`;
    n.innerHTML = message;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 4000);
}

// ========== INITIALIZATION ==========
document.addEventListener("DOMContentLoaded", () => {
    drawScoreWheel(0);
    updateComparisonDisplay();

    // Health check
    fetch(`${FLASK_API}/api/health`)
        .then(res => res.json())
        .then(data => {
            if (data.model_loaded) {
                showNotification("✅ Backend connected!", "success");
            } else {
                showNotification("⚠️ Backend running but model not loaded", "warning");
            }
        })
        .catch(() => {
            showNotification("❌ Cannot reach backend server", "error");
        });
});

// ========== GLOBAL FUNCTIONS ==========
window.updateValue = updateValue;
window.loadSampleData = loadSampleData;
window.predictHabitability = predictHabitability;
