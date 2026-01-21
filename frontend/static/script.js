// script.js - UPDATED FOR RENDER BACKEND (PRODUCTION READY)
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
    valueSpan.textContent = numValue.toFixed(id === "temp" ? 0 : 1);
    currentParameters[id] = numValue;

    updateComparisonDisplay();
}

function updateComparisonDisplay() {
    document.getElementById("compRadius").textContent = currentParameters.radius.toFixed(1);
    document.getElementById("compMass").textContent = currentParameters.mass.toFixed(1);
    document.getElementById("compGravity").textContent = currentParameters.gravity.toFixed(1);
}

// ========== SAMPLE DATA ==========
function loadSampleData() {
    const selected = document.getElementById("sampleSelect").value;

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
            valueSpan.textContent = sample[key].toFixed(key === "temp" ? 0 : 1);
            currentParameters[key] = sample[key];
        }
    });

    updateComparisonDisplay();
}

// ========== API CALL ==========
async function predictHabitability() {
    const btn = document.querySelector(".btn-primary");
    btn.disabled = true;
    btn.innerHTML = "Analyzing...";

    try {
        const payload = {
            radius: currentParameters.radius,
            mass: currentParameters.mass,
            gravity: currentParameters.gravity,
            period: currentParameters.period,
            temp: currentParameters.temp,
            density: currentParameters.density,

            // model-compatible keys
            P_RADIUS: currentParameters.radius,
            P_MASS: currentParameters.mass,
            P_GRAVITY: currentParameters.gravity,
            P_ORBPER: currentParameters.period,
            P_TEMP_EQUIL: currentParameters.temp,
            P_DENSITY: currentParameters.density
        };

        const response = await fetch(`${FLASK_API}/api/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`API error ${response.status}: ${err}`);
        }

        const result = await response.json();
        updatePredictionDisplay(result);
        showNotification("Prediction successful", "success");

    } catch (error) {
        console.error(error);
        showNotification(error.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Predict Habitability";
    }
}

// ========== UI UPDATES ==========
function updatePredictionDisplay(result) {
    document.getElementById("scoreValue").textContent = result.probability.toFixed(1);
    document.getElementById("habitabilityLabel").textContent = result.prediction_label;
    document.getElementById("habitabilityDescription").textContent =
        `${result.prediction_label} (${result.confidence})`;

    document.getElementById("confidenceValue").textContent = result.confidence;
    document.getElementById("modelUsed").textContent = result.model_used;
    document.getElementById("earthSimilarity").textContent = `${result.earth_similarity}%`;

    updateProbabilityBars(result.probabilities);
    drawScoreWheel(result.probability);
}

function updateProbabilityBars(probabilities) {
    const map = {
        Non: probabilities.Non_Habitable,
        Pot: probabilities.Potentially_Habitable,
        High: probabilities.Highly_Habitable
    };

    Object.keys(map).forEach(key => {
        document.getElementById(`prob${key}`).textContent = `${map[key]}%`;
        document.getElementById(`prob${key}Fill`).style.width = `${map[key]}%`;
    });
}

// ========== SCORE WHEEL ==========
function drawScoreWheel(score) {
    const canvas = document.getElementById("scoreCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const center = canvas.width / 2;
    const radius = 80;

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 12;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + (score / 100) * 2 * Math.PI);
    ctx.strokeStyle = score < 33 ? "#ff6b6b" : score < 66 ? "#feca57" : "#1dd1a1";
    ctx.lineWidth = 12;
    ctx.stroke();
}

// ========== NOTIFICATION ==========
function showNotification(msg, type = "info") {
    const n = document.createElement("div");
    n.className = `notification ${type}`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 4000);
}

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
    drawScoreWheel(0);

    // Health check
    fetch(`${FLASK_API}/api/health`)
        .then(res => res.json())
        .then(data => {
            if (data.model_loaded) {
                showNotification("Backend connected successfully", "success");
            } else {
                showNotification("Backend running but model not loaded", "warning");
            }
        })
        .catch(() => {
            showNotification("Cannot reach backend server", "error");
        });
});

// ========== GLOBAL EXPORTS ==========
window.updateValue = updateValue;
window.loadSampleData = loadSampleData;
window.predictHabitability = predictHabitability;
