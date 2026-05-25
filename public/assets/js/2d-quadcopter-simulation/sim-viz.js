// === Physics parameters (match Python simulation) ===
const m = 0.8;    // kg
const g = 9.81;   // m/s^2
const l = 0.5;    // m (arm half-length)
const I = 1e-3;   // kg*m^2

const t_start = 0.0;
const t_stop = 15.0;
const n_steps = 1000;
const dt = (t_stop - t_start) / (n_steps - 1);

function runSimulation(u0, u1) {
    function dynamics(x) {
        const phi = x[2];
        const y_dot = x[3];
        const z_dot = x[4];
        const phi_dot = x[5];
        return [
            y_dot,
            z_dot,
            phi_dot,
            -u0 / m * Math.sin(phi),
            u0 / m * Math.cos(phi) - g,
            u1 / I * l,
        ];
    }

    const states = new Array(n_steps);
    states[0] = new Float64Array(6);
    let takenOff = false;
    let count = 1;
    for (let i = 0; i < n_steps - 1; i++) {
        const x = states[i];
        const dx = dynamics(x);
        const xn = new Float64Array(6);
        for (let j = 0; j < 6; j++) xn[j] = x[j] + dx[j] * dt;
        states[i + 1] = xn;
        count++;
        if (!takenOff && xn[1] > 0.05) takenOff = true;
        if (takenOff && xn[1] < 0) break;
    }
    return states.slice(0, count);
}

function createSimViz(canvasId, states) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const ASPECT = 250 / 700;
    let CSS_W = 0;
    let CSS_H = 0;

    canvas.parentElement.style.width = "90%";
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.border = "1px solid #cccccc";

    function resizeCanvas() {
        CSS_W = canvas.clientWidth;
        CSS_H = Math.round(CSS_W * ASPECT);
        canvas.width = CSS_W * dpr;
        canvas.height = CSS_H * dpr;
        canvas.style.height = CSS_H + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const BASE_SCALE = 80; // pixels per meter at rest
    let scale = BASE_SCALE;

    function toCanvas(worldY, worldZ, camY, camZ) {
        return [
            CSS_W / 2 + (worldY - camY) * scale,
            CSS_H / 2 - (worldZ - camZ) * scale,
        ];
    }

    function drawGrid(camY, camZ) {
        const halfW = CSS_W / 2 / scale;
        const halfH = CSS_H / 2 / scale;

        const yMin = Math.floor(camY - halfW) - 1;
        const yMax = Math.ceil(camY + halfW) + 1;
        const zMin = Math.floor(camZ - halfH) - 1;
        const zMax = Math.ceil(camZ + halfH) + 1;

        ctx.lineWidth = 1;

        for (let wy = yMin; wy <= yMax; wy++) {
            ctx.strokeStyle = wy === 0 ? "#aaaaaa" : "#dddddd";
            ctx.beginPath();
            const [cx] = toCanvas(wy, 0, camY, camZ);
            ctx.moveTo(cx, 0);
            ctx.lineTo(cx, CSS_H);
            ctx.stroke();
        }

        for (let wz = zMin; wz <= zMax; wz++) {
            ctx.strokeStyle = wz === 0 ? "#aaaaaa" : "#dddddd";
            ctx.beginPath();
            const [, cy] = toCanvas(0, wz, camY, camZ);
            ctx.moveTo(0, cy);
            ctx.lineTo(CSS_W, cy);
            ctx.stroke();
        }
    }

    function drawDrone(worldY, worldZ, phi, camY, camZ) {
        const [cx, cy] = toCanvas(worldY, worldZ, camY, camZ);

        const s = scale / BASE_SCALE;  // shrink factor relative to base zoom
        const bodyW = 2 * l * scale; // scales with world
        const bodyH = 4 * s;
        const motorW = 10 * s;
        const motorH = 14 * s;
        const motorX = bodyW / 2;
        const propLobe = 15 * s;
        const propH = 5 * s;
        const propY = -(motorH / 2 + 7 * s);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-phi);

        // --- Propellers (behind everything else) ---
        for (const sign of [-1, 1]) {
            ctx.save();
            ctx.translate(sign * motorX, propY);

            // Figure-8 / infinity sign built from 4 cubic bezier curves
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(propLobe * 0.5, -propH * 2, propLobe, -propH * 2, propLobe, 0);
            ctx.bezierCurveTo(propLobe, propH * 2, propLobe * 0.5, propH * 2, 0, 0);
            ctx.bezierCurveTo(-propLobe * 0.5, propH * 2, -propLobe, propH * 2, -propLobe, 0);
            ctx.bezierCurveTo(-propLobe, -propH * 2, -propLobe * 0.5, -propH * 2, 0, 0);
            ctx.closePath();
            ctx.fillStyle = "rgba(160, 160, 160, 0.5)";
            ctx.strokeStyle = "#aaaaaa";
            ctx.lineWidth = 1;
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }

        // --- Body (arm) ---
        ctx.fillStyle = "#333333";
        ctx.fillRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);

        // --- Motors (rounded rectangles) ---
        for (const sign of [-1, 1]) {
            ctx.beginPath();
            ctx.roundRect(sign * motorX - motorW / 2, -motorH / 2, motorW, motorH, 3 * s);
            ctx.fillStyle = "#666666";
            ctx.fill();
        }

        // --- Center dot ---
        ctx.beginPath();
        ctx.arc(0, 0, 3 * s, 0, Math.PI * 2);
        ctx.fillStyle = "#000000";
        ctx.fill();

        ctx.restore();
    }

    // === Controls ===
    const controls = document.createElement("div");
    controls.style.cssText =
        "display:flex;align-items:center;gap:8px;margin-top:6px;" +
        "font-family:sans-serif;font-size:13px;";

    const playBtn = document.createElement("button");
    playBtn.textContent = "Pause";
    playBtn.style.cssText =
        "padding:3px 10px;cursor:pointer;font-size:13px;min-width:60px;";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = 0;
    slider.max = states.length - 1;
    slider.step = 1;
    slider.value = 0;
    slider.style.cssText = "flex:1;cursor:pointer;";

    const timeLabel = document.createElement("span");
    timeLabel.style.cssText = "min-width:42px;text-align:right;color:#555;";
    timeLabel.textContent = "0.00 s";

    controls.appendChild(playBtn);
    controls.appendChild(slider);
    controls.appendChild(timeLabel);
    canvas.insertAdjacentElement("afterend", controls);

    // === Animation state ===
    let currentStep = 0;
    let playing = true;
    let lastTimestamp = null;
    let accumulator = 0;

    playBtn.addEventListener("click", () => {
        playing = !playing;
        playBtn.textContent = playing ? "Pause" : "Play";
        if (!playing) lastTimestamp = null;
        if (playing && currentStep >= states.length - 1) {
            currentStep = 0;
            accumulator = 0;
        }
    });

    slider.addEventListener("input", () => {
        currentStep = parseInt(slider.value, 10);
        accumulator = 0;
        lastTimestamp = null;
    });

    // === Render loop ===
    function render(timestamp) {
        if (playing) {
            if (lastTimestamp !== null) {
                accumulator += (timestamp - lastTimestamp) / 1000;
                const steps = Math.floor(accumulator / dt);
                accumulator -= steps * dt;
                currentStep = Math.min(currentStep + steps, states.length - 1);
            }
            lastTimestamp = timestamp;

            if (currentStep >= states.length - 1) {
                playing = false;
                playBtn.textContent = "Play";
                lastTimestamp = null;
            }
        }

        slider.value = currentStep;
        timeLabel.textContent = (t_start + currentStep * dt).toFixed(2) + " s";

        const x = states[currentStep];
        const camY = x[0];
        const camZ = x[1];
        const speed = Math.hypot(x[3], x[4]);
        scale = BASE_SCALE / Math.max(1, speed * 0.4);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, CSS_W, CSS_H);

        drawGrid(camY, camZ);
        drawDrone(x[0], x[1], x[2], camY, camZ);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

createSimViz("canvas-sim-viz", runSimulation(m * g + 0.01, 0.0));
createSimViz("canvas-sim-viz-2", runSimulation(m * g + 0.5, 5e-5));
