const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const dSlider = document.getElementById('densitySlider');
const hSlider = document.getElementById('heatSlider');
const resetBtn = document.getElementById('resetBtn');
const dDisp = document.getElementById('d-val');
const hDisp = document.getElementById('h-val');

let particles = [];
const radius = 5;

class Particle {
    constructor(x, y, speedMult) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        // Random direction, speed based on "temperature"
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speedMult;
        this.vy = Math.sin(angle) * speedMult;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wall Bounces
        if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) this.vx *= -1;
        if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) this.vy *= -1;
    }

    draw() {
        // Color based on Kinetic Energy (Speed)
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const hue = Math.max(240 - (speed * 40), 0); // 240 is Blue, 0 is Red
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
        ctx.fill();
        ctx.closePath();
    }
}

function initSim() {
    particles = [];
    const count = parseInt(dSlider.value);
    for (let i = 0; i < count; i++) {
        // Distribute particles across the canvas
        const x = Math.random() * (canvas.width - radius * 2) + radius;
        const y = Math.random() * (canvas.height - radius * 2) + radius;
        
        // Left side starts "Warm", Right side starts "Cold"
        const initialSpeed = x < canvas.width / 4 ? 4 : 0.5;
        particles.push(new Particle(x, y, initialSpeed));
    }
}

function injectHeat() {
    const heatVal = parseFloat(hSlider.value);
    particles.forEach(p => {
        if (p.x < canvas.width / 4) {
            p.vx *= heatVal * 0.5;
            p.vy *= heatVal * 0.5;
        }
    });
}

function checkCollisions() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < radius * 2) {
                // Simplistic Momentum Exchange (Elastic Collision)
                const tempVx = particles[i].vx;
                const tempVy = particles[i].vy;
                particles[i].vx = particles[j].vx;
                particles[i].vy = particles[j].vy;
                particles[j].vx = tempVx;
                particles[j].vy = tempVy;
                
                // Prevent overlapping stickiness
                particles[i].x += particles[i].vx;
                particles[i].y += particles[i].vy;
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
    dDisp.innerText = dSlider.value;
    hDisp.innerText = hSlider.value > 15 ? "Extreme" : hSlider.value > 8 ? "High" : "Low";

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    checkCollisions();

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(update);
}

window.addEventListener('resize', resize);
resetBtn.addEventListener('click', injectHeat);
dSlider.addEventListener('input', initSim);

resize();
update();
