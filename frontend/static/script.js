// script.js - UPDATED FOR LIVE SERVER
// ========== CONFIGURATION ==========
const FLASK_API = 'https://backend-exo-9mu0.onrender.com';  // Flask API endpoint

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
    if (valueSpan) {
        const numValue = parseFloat(value);
        valueSpan.textContent = numValue.toFixed(id === 'temp' ? 0 : 1);
        currentParameters[id] = numValue;
    }
    updateComparisonDisplay();
}

function updateComparisonDisplay() {
    document.getElementById('compRadius').textContent = currentParameters.radius.toFixed(1);
    document.getElementById('compMass').textContent = currentParameters.mass.toFixed(1);
    document.getElementById('compGravity').textContent = currentParameters.gravity.toFixed(1);
}

function loadSampleData() {
    const sampleSelect = document.getElementById('sampleSelect');
    const selected = sampleSelect.value;
    
    const samples = {
        'earth': { radius: 1.0, mass: 1.0, gravity: 1.0, period: 365.25, temp: 288, density: 5.51 },
        'super': { radius: 1.5, mass: 5.0, gravity: 2.2, period: 200, temp: 300, density: 6.0 },
        'ocean': { radius: 1.2, mass: 1.5, gravity: 1.1, period: 400, temp: 280, density: 4.0 },
        'mars': { radius: 0.53, mass: 0.11, gravity: 0.38, period: 687, temp: 210, density: 3.93 },
        'hot': { radius: 10.0, mass: 300.0, gravity: 3.0, period: 5, temp: 1500, density: 1.3 }
    };
    
    const sample = samples[selected];
    if (sample) {
        Object.keys(sample).forEach(key => {
            if (currentParameters.hasOwnProperty(key)) {
                const slider = document.getElementById(key);
                const valueSpan = document.getElementById(`${key}Value`);
                if (slider && valueSpan) {
                    slider.value = sample[key];
                    valueSpan.textContent = sample[key].toFixed(key === 'temp' ? 0 : 1);
                    currentParameters[key] = sample[key];
                }
            }
        });
    }
}

async function predictHabitability() {
    const predictBtn = document.querySelector('.btn-primary');
    const statusIndicator = document.getElementById('statusIndicator');
    
    // Show loading
    predictBtn.disabled = true;
    predictBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    setStatusIndicator('Querying XGBoost API...', 'info');
    
    try {
        // Prepare data - send both formats
        const inputData = {
            // Frontend parameter names
            radius: currentParameters.radius,
            mass: currentParameters.mass,
            gravity: currentParameters.gravity,
            period: currentParameters.period,
            temp: currentParameters.temp,
            density: currentParameters.density,
            
            // Model parameter names (from your test)
            P_RADIUS: currentParameters.radius,
            P_MASS: currentParameters.mass,
            P_GRAVITY: currentParameters.gravity,
            P_ORBPER: currentParameters.period,
            P_TEMP_EQUIL: currentParameters.temp,
            P_DENSITY: currentParameters.density
        };
        
        console.log('Sending to Flask API:', inputData);
        
        // Send to Flask API
        const response = await fetch(`${FLASK_API}/predict`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(inputData)
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Prediction result:', result);
        
        if (result.success) {
            updatePredictionDisplay(result);
            showNotification('XGBoost prediction successful!', 'success');
        } else {
            throw new Error(result.error || 'Prediction failed');
        }
        
    } catch (error) {
        console.error('Prediction error:', error);
        setStatusIndicator('Prediction failed', 'danger');
        showNotification('Error: ' + error.message, 'error');
    } finally {
        predictBtn.disabled = false;
        predictBtn.innerHTML = '<i class="fas fa-bolt"></i> Predict Habitability';
    }
}

function updatePredictionDisplay(result) {
    // Update score wheel
    document.getElementById('scoreValue').textContent = result.probability.toFixed(1);
    drawScoreWheel(result.probability);
    
    // Update labels
    document.getElementById('habitabilityLabel').textContent = result.prediction_label;
    document.getElementById('habitabilityDescription').textContent = 
        `${result.prediction_label} (${result.confidence} confidence)`;
    
    document.getElementById('confidenceValue').textContent = result.confidence;
    document.getElementById('modelUsed').textContent = result.model_used;
    document.getElementById('earthSimilarity').textContent = `${result.earth_similarity}%`;
    
    // Update status indicator
    const statusClass = result.prediction === 0 ? 'danger' : 
                       result.prediction === 1 ? 'warning' : 'success';
    setStatusIndicator(result.prediction_label, statusClass);
    
    // Update probability bars
    updateProbabilityBars(result.probabilities);
}

function updateProbabilityBars(probabilities) {
    const types = ['Non', 'Pot', 'High'];
    const keys = ['Non_Habitable', 'Potentially_Habitable', 'Highly_Habitable'];
    
    types.forEach((type, index) => {
        const value = probabilities[keys[index]];
        const valueEl = document.getElementById(`prob${type}`);
        const fillEl = document.getElementById(`prob${type}Fill`);
        
        if (valueEl && fillEl) {
            valueEl.textContent = `${value}%`;
            fillEl.style.width = `${value}%`;
        }
    });
}

function setStatusIndicator(text, type) {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;
    
    const icons = {
        'success': 'fas fa-check-circle',
        'warning': 'fas fa-exclamation-triangle',
        'danger': 'fas fa-times-circle',
        'info': 'fas fa-info-circle'
    };
    
    indicator.innerHTML = `<i class="${icons[type] || 'fas fa-info-circle'}"></i> ${text}`;
    indicator.className = `status-indicator status-${type}`;
}

function resetForm() {
    // Reset to Earth values
    const earthValues = { radius: 1.0, mass: 1.0, gravity: 1.0, period: 365, temp: 288, density: 5.51 };
    Object.keys(earthValues).forEach(key => {
        const slider = document.getElementById(key);
        const valueSpan = document.getElementById(`${key}Value`);
        if (slider && valueSpan) {
            slider.value = earthValues[key];
            valueSpan.textContent = earthValues[key].toFixed(key === 'temp' ? 0 : 1);
            currentParameters[key] = earthValues[key];
        }
    });
    
    // Reset results
    document.getElementById('scoreValue').textContent = '0';
    document.getElementById('habitabilityLabel').textContent = 'Habitability Score';
    document.getElementById('habitabilityDescription').textContent = 'Enter planetary parameters to get XGBoost prediction';
    document.getElementById('confidenceValue').textContent = '--';
    document.getElementById('earthSimilarity').textContent = '--';
    
    // Reset probability bars
    ['Non', 'Pot', 'High'].forEach(type => {
        document.getElementById(`prob${type}`).textContent = '0%';
        document.getElementById(`prob${type}Fill`).style.width = '0%';
    });
    
    // Reset status
    setStatusIndicator('Awaiting Input', 'info');
    
    // Reset sample selector
    document.getElementById('sampleSelect').value = '';
    
    drawScoreWheel(0);
    showNotification('Form reset to Earth values', 'info');
}

// ========== SCORE WHEEL ==========
function drawScoreWheel(score) {
    const canvas = document.getElementById('scoreCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(74, 144, 226, 0.2)';
    ctx.lineWidth = 12;
    ctx.stroke();
    
    // Progress
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (score / 100) * 2 * Math.PI;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    
    // Color gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    if (score < 33) {
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#ffb347');
    } else if (score < 66) {
        gradient.addColorStop(0, '#ffb347');
        gradient.addColorStop(1, '#00d4aa');
    } else {
        gradient.addColorStop(0, '#00d4aa');
        gradient.addColorStop(1, '#4a90e2');
    }
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();
}

// ========== NOTIFICATIONS ==========
function showNotification(message, type = 'info') {
    // Remove existing
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 
                         type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'rgba(0, 255, 157, 0.9)' :
                     type === 'error' ? 'rgba(255, 107, 107, 0.9)' :
                     type === 'warning' ? 'rgba(255, 215, 0, 0.9)' : 'rgba(74, 144, 226, 0.9)'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    // Initialize
    drawScoreWheel(0);
    updateComparisonDisplay();
    
    // Test API connection
    console.log('Testing Flask API connection...');
    fetch(`${FLASK_API}/health`)
        .then(res => {
            console.log('Health check status:', res.status);
            return res.json();
        })
        .then(data => {
            console.log('API health:', data);
            if (data.model_loaded) {
                showNotification('✅ XGBoost model connected!', 'success');
            } else {
                showNotification('⚠️ Model not loaded on server', 'warning');
            }
        })
        .catch(err => {
            console.error('API connection failed:', err);
            showNotification('❌ Cannot connect to Flask API. Make sure Flask is running on port 5000.', 'error');
        });
    
    console.log('AstroHab Live Server initialized');
});

// Make functions global
window.updateValue = updateValue;
window.loadSampleData = loadSampleData;
window.predictHabitability = predictHabitability;

window.resetForm = resetForm;
