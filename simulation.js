const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const molSelect = document.getElementById('moleculeSelect');
const coldSlider = document.getElementById('coldSlider');
const resetBtn = document.getElementById('resetBtn');
const cDisp = document.getElementById('c-val');
const molLabel = document.getElementById('label-mol');

let particles = [];
const radius = 6;
const particleCount = 150;

// GAS DEFINITIONS (Masses are comparative, not actual kg)
const gases = {
    H2: { mass: 1, color: '#f0f6fc', speedScaling: 5.3 }, // Light -> FAST
    N2: { mass: 14, color: '#c9d1d9', speedScaling: 1.4 } // Heavy -> SLOW
};

class Particle {
    constructor(x, y, vx, vy, type) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.type = type;
        this.mass = gases[type].mass;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // WALL INTERACTIONS:
        
        // 1. Hot Wall (Click Interaction handled separately)

        // 2. Cold Wall (Right Wall): Loses Energy
        if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            // Damping velocity based on the Cold Sink Slider
            this.vx *= -(parseFloat(coldSlider.value) / 100);
            this.vy *= 0.95; // Slight friction
        }

        // 3. Top and Bottom Walls (Ideal/Adiabatic)
        if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
            this.vy *= -1;
            this.y = this.y < this.radius ? this.radius : canvas.height - radius;
        }

        // 4. Left Wall (Adiabatic until clicked)
        if (this.x - this.radius < 0) {
            this.vx *= -1;
            this.x = this.radius;
        }
    }

    draw() {
        // Color based on Kinetic Energy (m * v^2)
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const ke = 0.5 * this.mass * (speed * speed);
        
        // Normalize KE color mapping based on gas mass
        const keNormalization = this.type === 'H2' ? 1.0 : 14.0;
        const normalizedKE = ke / keNormalization;
        const hue = Math.max(240 - (normalizedKE * 20), 0); // Blue to Red

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
        ctx.fill();
        ctx.strokeStyle = gases[this.type].color;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.closePath();
    }
}

function initSim() {
    particles = [];
    const type = molSelect.value;
    const gasData = gases[type];
    
    molLabel.innerText = type === 'H2' ? 'H₂ (Light)' : 'N₂ (Heavy)';

    for (let i = 0; i < particleCount; i++) {
        // Spawn particles in the middle region
        const x = Math.random() * (canvas.width * 0.6) + (canvas.width * 0.2);
        const y = Math.random() * (canvas.height - radius * 2) + radius;
        
        // Generate random initial velocity, scaled by molecule mass
        // Boltzmann Distribution Approximation: Lighter moves much faster
        const angle = Math.random() * Math.PI * 2;
        const speed = gasData.speedScaling * (Math.random() * 0.5 + 0.5); // Adds variance
        
        particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, type));
    }
}

// HOT WALL INTERACTION: Click on the Left Side
function handleHotClick(e) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    
    // Check if click is on the left 20% of the screen
    if (clickX < canvas.width * 0.2) {
        particles.forEach(p => {
            // Apply significant kinetic boost to particles in the Hot Zone
            if (p.x < canvas.width * 0.3) {
                // Boost speed, randomization keeps it looking like vapor
                const angle = Math.atan2(p.vy, p.vx) + (Math.random() - 0.5);
                const currentSpeed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
                const boost = gases[p.type].speedScaling * 2.5; 
                p.vx = Math.cos(angle) * (currentSpeed + boost);
                p.vy = Math.sin(angle) * (currentSpeed + boost);
            }
        });
    }
}

function checkCollisions() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const p1 = particles[i];
            const p2 = particles[j];

            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq < (radius * 2) * (radius * 2)) {
                // TRUE ELASTIC VECTOR COLLISION MATH (Conservation of Momentum)
                const distance = Math.sqrt(distanceSq);
                
                // Normal vector (normalized)
                const nx = dx / distance;
                const ny = dy / distance;

                // Relative velocity
                const rvx = p1.vx - p2.vx;
                const rvy = p1.vy - p2.vy;

                // Relative velocity along the normal
                const velAlongNormal = rvx * nx + rvy * ny;

                // Do not resolve if velocities are separating
                if (velAlongNormal > 0) continue;

                // Calculate impulse scalar
                const j_impulse = -(1 + 1.0) * velAlongNormal;
                const invMassSum = (1 / p1.mass) + (1 / p2.mass);
                const finalImpulse = j_impulse / invMassSum;

                // Apply impulse
                const impulseX = finalImpulse * nx;
                const impulseY = finalImpulse * ny;
                
                p1.vx += impulseX * (1 / p1.mass);
                p1.vy += impulseY * (1 / p1.mass);
                p2.vx -= impulseX * (1 / p2.mass);
                p2.vy -= impulseY * (1 / p2.mass);
                
                // Position Correction (prevent stickiness)
                const percent = 0.8; // overlap penetration percentage to fix
                const slope = 0.01; // linear projection threshold
                const penetration = (radius * 2) - distance;
                const correction = Math.max(penetration - slope, 0) / invMassSum * percent;
                const cx = correction * nx;
                const cy = correction * ny;
                
                p1.x += cx * (1 / p1.mass);
                p1.y += cy * (1 / p1.mass);
                p2.x -= cx * (1 / p2.mass);
                p2.y -= cy * (1 / p2.mass);
            }
        }
    }
}

function resize() {
    canvas.width = window.innerWidth;
    const controls = document.getElementById('controls');
    canvas.height = window.innerHeight - controls.offsetHeight;
    initSim();
}

function update() {
    cDisp.innerText = coldSlider.value + " K (Simulated)";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    checkCollisions();

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(update);
}

window.addEventListener('resize', resize);
resetBtn.addEventListener('click', initSim);
canvas.addEventListener('mousedown', handleHotClick);
molSelect.addEventListener('change', initSim); // Reset automatically when molecule changes

resize();
update();
