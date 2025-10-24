class PriorityQueue {
    constructor() { this.items = []; }
    enqueue(element, priority) {
        this.items.push({ element, priority });
        this.items.sort((a, b) => a.priority - b.priority);
    }
    dequeue() { return this.items.shift(); }
    isEmpty() { return this.items.length === 0; }
    contains(element) { return this.items.some(item => item.element.id === element.id); }
    updatePriority(element, newPriority) {
        const index = this.items.findIndex(item => item.element.id === element.id);
        if (index !== -1) {
            this.items[index].priority = newPriority;
            this.items.sort((a, b) => a.priority - b.priority);
        }
    }
}

class Graph {
    constructor() {
        this.nodes = []; this.edges = []; this.startNode = null; this.endNode = null;
    }
    addNode(x, y, id) { this.nodes.push({ id, x, y, distance: Infinity, previous: null, visited: false }); }
    addEdge(from, to, weight) {
        this.edges.push({ from, to, weight });
        this.edges.push({ from: to, to: from, weight });
    }

    // FIX: This method is now non-mutating. It only generates the steps.
    // The visualizer is now responsible for applying these steps to the graph.
    dijkstra() {
        if (!this.startNode) return [];

        const internalDistances = new Map();
        const internalPrevious = new Map();
        this.nodes.forEach(node => internalDistances.set(node.id, Infinity));
        internalDistances.set(this.startNode.id, 0);

        const pq = new PriorityQueue();
        pq.enqueue(this.startNode, 0);
        
        const steps = [];
        const visited = new Set();

        while (!pq.isEmpty()) {
            const { element: currentNode } = pq.dequeue();

            if (visited.has(currentNode.id)) continue;
            visited.add(currentNode.id);
            
            steps.push({ type: 'visit', nodeId: currentNode.id, pqItems: pq.items.map(i => ({ id: i.element.id, priority: i.priority })) });

            if (currentNode.id === this.endNode.id) break;

            this.edges.forEach(edge => {
                if (edge.from === currentNode.id) {
                    const neighborNode = this.nodes.find(n => n.id === edge.to);
                    if (neighborNode && !visited.has(neighborNode.id)) {
                        const newDist = internalDistances.get(currentNode.id) + edge.weight;
                        if (newDist < internalDistances.get(neighborNode.id)) {
                            internalDistances.set(neighborNode.id, newDist);
                            internalPrevious.set(neighborNode.id, currentNode.id);
                            
                            pq.enqueue(neighborNode, newDist);
                            
                            steps.push({
                                type: 'update',
                                nodeId: neighborNode.id,
                                fromNodeId: currentNode.id,
                                newDistance: newDist,
                                pqItems: pq.items.map(i => ({ id: i.element.id, priority: i.priority }))
                            });
                        }
                    }
                }
            });
        }

        const path = [];
        let currentId = this.endNode.id;
        while (currentId !== undefined) {
            path.unshift(currentId);
            currentId = internalPrevious.get(currentId);
        }

        if (path[0] === this.startNode.id) {
            steps.push({ type: 'path', path });
        }

        return steps;
    }
}

class DijkstraVisualizer {
    constructor() {
        this.canvas = document.getElementById('graphCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.graph = new Graph();
        this.animationSpeed = 1000;
        this.nodeRadius = 20;
        this.isDragging = false;
        this.draggedNode = null;
        this.state = 'idle'; // idle, playing, paused, finished
        this.currentStep = 0;
        this.animationSteps = [];
        this.finalPath = [];
        this.setupEventListeners();
        this.resizeCanvas();
        this.loadPreset('simple');
    }

    setupEventListeners() {
        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab)));
        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => btn.addEventListener('click', (e) => this.loadPreset(e.target.dataset.preset)));
        // Input buttons
        document.getElementById('applyMatrix')?.addEventListener('click', () => this.applyMatrix());
        document.getElementById('applyEdges')?.addEventListener('click', () => this.applyEdges());
        document.getElementById('generateRandom')?.addEventListener('click', () => this.generateRandomGraph());
        document.getElementById('solveQuestion')?.addEventListener('click', () => this.solveQuestion());
        // Sliders
        document.getElementById('randomNodes')?.addEventListener('input', e => document.getElementById('randomNodesDisplay').textContent = e.target.value);
        document.getElementById('edgeProbability')?.addEventListener('input', e => document.getElementById('edgeProbabilityDisplay').textContent = e.target.value);
        const matrixSizeSlider = document.getElementById('matrixSize');
        if (matrixSizeSlider) {
            matrixSizeSlider.addEventListener('input', e => {
                document.getElementById('matrixSizeDisplay').textContent = e.target.value;
                this.generateMatrixInput();
            });
        }
        // Algorithm controls
        document.getElementById('startBtn')?.addEventListener('click', () => this.startVisualization());
        document.getElementById('pauseBtn')?.addEventListener('click', () => this.pauseVisualization());
        document.getElementById('stepBackBtn')?.addEventListener('click', () => this.stepBackVisualization());
        document.getElementById('stepBtn')?.addEventListener('click', () => this.stepVisualization());
        document.getElementById('resetBtn')?.addEventListener('click', () => this.reset(true));
        document.getElementById('speedSlider')?.addEventListener('input', e => this.animationSpeed = 2000 - e.target.value);
        // Node selectors
        document.getElementById('startNodeSelect')?.addEventListener('change', e => { this.graph.startNode = this.graph.nodes.find(n => String(n.id) === e.target.value); this.reset(false); });
        document.getElementById('endNodeSelect')?.addEventListener('change', e => { this.graph.endNode = this.graph.nodes.find(n => String(n.id) === e.target.value); this.reset(false); });
        // Header and Modal
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
        document.getElementById('helpBtn')?.addEventListener('click', () => document.getElementById('infoModal').style.display = 'block');
        document.getElementById('closeModal')?.addEventListener('click', () => document.getElementById('infoModal').style.display = 'none');
        // Canvas listeners
        this.canvas.addEventListener('mousedown', e => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', e => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        window.addEventListener('resize', () => this.resizeCanvas());
        this.generateMatrixInput();
    }

    calculateNodePositions(nodeCount) {
        const positions = [];
        const margin = this.nodeRadius + 40;
        const radius = Math.min(this.canvas.width, this.canvas.height) / 2 - margin;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        for (let i = 0; i < nodeCount; i++) {
            const angle = (i / nodeCount) * 2 * Math.PI - (Math.PI / 2);
            positions.push({ x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) });
        }
        return positions;
    }

    loadPreset(presetName) {
        this.graph = new Graph();
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-preset="${presetName}"]`)?.classList.add('active');
        let nodeData = [];
        switch (presetName) {
            case 'simple': nodeData = [{id:0}, {id:1}, {id:2}]; this.graph.addEdge(0, 1, 4); this.graph.addEdge(0, 2, 2); this.graph.addEdge(1, 2, 1); break;
            case 'complex': nodeData = [{id:0}, {id:1}, {id:2}, {id:3}, {id:4}, {id:5}]; this.graph.addEdge(0, 1, 7); this.graph.addEdge(0, 2, 9); this.graph.addEdge(1, 3, 15); this.graph.addEdge(2, 5, 2); this.graph.addEdge(3, 4, 6); this.graph.addEdge(4, 5, 9); break;
            case 'large': nodeData = Array.from({length: 8}, (_, i) => ({id: i})); this.graph.addEdge(0, 1, 2); this.graph.addEdge(0, 2, 5); this.graph.addEdge(1, 3, 3); this.graph.addEdge(1, 4, 1); this.graph.addEdge(2, 5, 4); this.graph.addEdge(3, 6, 3); this.graph.addEdge(4, 7, 4); this.graph.addEdge(5, 7, 1); break;
        }
        const positions = this.calculateNodePositions(nodeData.length);
        nodeData.forEach((node, i) => this.graph.addNode(positions[i].x, positions[i].y, node.id));
        this.reset(true);
    }
    
    generateRandomGraph() {
        this.graph = new Graph();
        const numNodes = parseInt(document.getElementById('randomNodes').value);
        const probability = parseInt(document.getElementById('edgeProbability').value);
        const positions = this.calculateNodePositions(numNodes);
        for (let i = 0; i < numNodes; i++) this.graph.addNode(positions[i].x, positions[i].y, i);
        for (let i = 0; i < numNodes; i++) {
            for (let j = i + 1; j < numNodes; j++) {
                if (Math.random() * 100 < probability) this.graph.addEdge(i, j, Math.floor(Math.random() * 20) + 1);
            }
        }
        this.reset(true);
    }

    applyEdges() {
        this.graph = new Graph();
        const nodeIds = new Set();
        try {
            const edges = document.getElementById('edgeList').value.trim().split('\n').filter(s => s.trim() !== '');
            for (const edgeStr of edges) {
                const parts = edgeStr.trim().split(/\s+/);
                if (parts.length !== 3) throw new Error(`Invalid edge format: "${edgeStr}"`);
                const from = parts[0];
                const to = parts[1];
                const weight = Number(parts[2]);
                if (isNaN(weight)) throw new Error(`Invalid weight in edge: "${edgeStr}"`);
                if (weight <= 0) throw new Error(`Edge weights must be positive. Found invalid weight: ${weight}`);
                nodeIds.add(from); nodeIds.add(to); this.graph.addEdge(from, to, weight);
            }
        } catch (error) { return alert(error.message); }
        const sortedNodeIds = Array.from(nodeIds).sort((a, b) => String(a).localeCompare(String(b)));
        const positions = this.calculateNodePositions(sortedNodeIds.length);
        sortedNodeIds.forEach((id, i) => this.graph.addNode(positions[i].x, positions[i].y, id));
        this.reset(true);
    }
    
    solveQuestion() {
        this.graph = new Graph();
        try {
            const text = document.getElementById('questionInput').value;
            const nodesMatch = text.match(/nodes:\s*([0-9,\s]+)/i);
            const edgesMatch = text.match(/edges:\s*([0-9,\s\-]+)/i);
            const startMatch = text.match(/start:\s*(\d+)/i);
            const endMatch = text.match(/end:\s*(\d+)/i);
            if (!nodesMatch || !edgesMatch || !startMatch || !endMatch) throw new Error("Invalid format. Use 'nodes:', 'edges:', 'start:', 'end:'.");
            const nodeIds = nodesMatch[1].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
            const edgeStrings = edgesMatch[1].split(',').map(s => s.trim());
            for (const edgeStr of edgeStrings) {
                const parts = edgeStr.split(/[\s-]+/);
                if (parts.length !== 3) continue;
                const [from, to, weight] = parts.map(Number);
                if (isNaN(from) || isNaN(to) || isNaN(weight)) continue;
                if (weight <= 0) throw new Error(`Edge weights must be positive. Found invalid weight: ${weight}`);
                this.graph.addEdge(from, to, weight);
            }
            const positions = this.calculateNodePositions(nodeIds.length);
            nodeIds.sort((a,b) => a - b).forEach((id, i) => this.graph.addNode(positions[i].x, positions[i].y, id));
            this.reset(true);
            this.graph.startNode = this.graph.nodes.find(n => n.id === parseInt(startMatch[1]));
            this.graph.endNode = this.graph.nodes.find(n => n.id === parseInt(endMatch[1]));
            if (!this.graph.startNode || !this.graph.endNode) throw new Error("Start or End node not found in the list of nodes.");
            this.updateUIState();
            this.draw();
        } catch (error) { return alert(error.message); }
    }

    applyMatrix() {
        const size = parseInt(document.getElementById('matrixSize').value);
        for (const input of document.querySelectorAll('.matrix-cell:not(:disabled)')) {
            if (parseInt(input.value) < 0) return alert('Edge weights cannot be negative.');
        }
        this.graph = new Graph();
        const positions = this.calculateNodePositions(size);
        for (let i = 0; i < size; i++) this.graph.addNode(positions[i].x, positions[i].y, i);
        for (let i = 0; i < size; i++) {
            for (let j = i + 1; j < size; j++) {
                const weight = parseInt(document.querySelector(`.matrix-cell[data-row="${i}"][data-col="${j}"]`).value);
                if (weight > 0) this.graph.addEdge(i, j, weight);
            }
        }
        this.reset(true);
    }
    
    startVisualization() {
        if (this.state !== 'idle' && this.state !== 'finished') return;
        if (!this.graph.startNode || !this.graph.endNode) return alert('Please select a start and end node.');
        this.reset(false);
        this.animationSteps = this.graph.dijkstra();
        if (this.animationSteps.length === 0) return;
        this.state = 'playing';
        this.updateButtonStates();
        this.animate();
    }

    pauseVisualization() {
        if (this.state !== 'playing' && this.state !== 'paused') return;
        this.state = this.state === 'paused' ? 'playing' : 'paused';
        this.updateButtonStates();
        if (this.state === 'playing') this.animate();
    }

    stepVisualization() {
        if (this.state === 'playing' || this.state === 'finished') return;
        if (this.state === 'idle') {
            if (!this.graph.startNode || !this.graph.endNode) return alert('Please select a start and end node.');
            this.reset(false);
            this.animationSteps = this.graph.dijkstra();
            if (this.animationSteps.length === 0) return;
            this.state = 'paused';
        }
        if (this.currentStep >= this.animationSteps.length) {
            this.finishAnimation();
            return;
        }
        this.processStep(this.animationSteps[this.currentStep]);
        this.currentStep++;
        if (this.currentStep >= this.animationSteps.length) this.finishAnimation();
        this.updateButtonStates();
    }

    stepBackVisualization() {
        if (this.state === 'playing') return;
        if (this.state === 'idle' || this.currentStep === 0) return;
        
        // If we're at finished state, go back to paused
        if (this.state === 'finished') {
            this.state = 'paused';
        }
        
        // Move back one step
        this.currentStep--;
        
        // Reset the graph to initial state
        this.graph.nodes.forEach(node => {
            node.visited = false;
            node.distance = Infinity;
            node.previous = null;
        });
        this.finalPath = [];
        
        // Replay all steps up to current step
        for (let i = 0; i < this.currentStep; i++) {
            this.replayStep(this.animationSteps[i]);
        }
        
        // Draw the current state
        const currentStepData = this.currentStep > 0 ? this.animationSteps[this.currentStep - 1] : null;
        this.draw(currentStepData);
        this.updateRoutingTable(currentStepData);
        this.updatePriorityQueue(currentStepData);
        this.updateButtonStates();
    }
    
    replayStep(step) {
        if (!step) return;
        let fromNode, toNode;
        switch (step.type) {
            case 'visit':
                toNode = this.graph.nodes.find(n => n.id === step.nodeId);
                if (toNode) toNode.visited = true;
                break;
            case 'update':
                toNode = this.graph.nodes.find(n => n.id === step.nodeId);
                fromNode = this.graph.nodes.find(n => n.id === step.fromNodeId);
                if (toNode && fromNode) {
                    toNode.distance = step.newDistance;
                    toNode.previous = fromNode;
                }
                break;
            case 'path':
                this.finalPath = step.path;
                break;
        }
    }
    
    animate() {
        if (this.state !== 'playing') return;
        if (this.currentStep >= this.animationSteps.length) {
            this.finishAnimation();
            return;
        }
        this.processStep(this.animationSteps[this.currentStep]);
        this.currentStep++;
        setTimeout(() => this.animate(), this.animationSpeed);
    }
    
    finishAnimation() {
        this.state = 'finished';
        this.updateButtonStates();
    }
    
    reset(fullGraphReset) {
        this.state = 'idle'; this.currentStep = 0; this.animationSteps = []; this.finalPath = [];
        this.graph.nodes.forEach(node => {
            node.visited = false; node.distance = Infinity; node.previous = null;
        });
        if (fullGraphReset && this.graph.nodes.length > 0) {
            const sortedNodes = [...this.graph.nodes].sort((a,b) => a.id - b.id);
            this.graph.startNode = sortedNodes[0];
            this.graph.endNode = sortedNodes[sortedNodes.length - 1];
        }
        this.updateUIState();
        this.updateRoutingTable();
        this.updatePriorityQueue();
        this.draw();
        this.updateButtonStates();
    }
    
    draw(step = null) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const style = getComputedStyle(document.documentElement);
        this.graph.edges.forEach(edge => {
            const fromNode = this.graph.nodes.find(n => n.id === edge.from);
            const toNode = this.graph.nodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return;
            const isPathEdge = this.finalPath.includes(fromNode.id) && this.finalPath.includes(toNode.id) && (this.finalPath.indexOf(toNode.id) === this.finalPath.indexOf(fromNode.id) + 1 || this.finalPath.indexOf(fromNode.id) === this.finalPath.indexOf(toNode.id) + 1);
            this.ctx.beginPath(); this.ctx.moveTo(fromNode.x, fromNode.y); this.ctx.lineTo(toNode.x, toNode.y);
            this.ctx.strokeStyle = isPathEdge ? style.getPropertyValue('--color-error') : style.getPropertyValue('--color-border');
            this.ctx.lineWidth = isPathEdge ? 4 : 2; this.ctx.stroke();
            this.ctx.fillStyle = style.getPropertyValue('--color-text-secondary');
            this.ctx.font = '14px sans-serif'; this.ctx.textAlign = 'center';
            this.ctx.fillText(edge.weight, (fromNode.x + toNode.x) / 2, (fromNode.y + toNode.y) / 2 - 8);
        });
        if (step && step.type === 'update') {
            const fromNode = this.graph.nodes.find(n => n.id === step.fromNodeId);
            const toNode = this.graph.nodes.find(n => n.id === step.nodeId);
            if (fromNode && toNode) {
                this.ctx.beginPath(); this.ctx.moveTo(fromNode.x, fromNode.y); this.ctx.lineTo(toNode.x, toNode.y);
                this.ctx.strokeStyle = style.getPropertyValue('--color-primary'); this.ctx.lineWidth = 4; this.ctx.stroke();
            }
        }
        this.graph.nodes.forEach(node => {
            this.ctx.beginPath(); this.ctx.arc(node.x, node.y, this.nodeRadius, 0, Math.PI * 2);
            let fillStyle = style.getPropertyValue('--color-secondary');
            if (node.visited) fillStyle = style.getPropertyValue('--color-success');
            if (step && step.type === 'visit' && node.id === step.nodeId) fillStyle = style.getPropertyValue('--color-primary-hover');
            this.ctx.fillStyle = fillStyle; this.ctx.fill();
            if (this.graph.startNode && node.id === this.graph.startNode.id) this.ctx.strokeStyle = style.getPropertyValue('--color-success');
            else if (this.graph.endNode && node.id === this.graph.endNode.id) this.ctx.strokeStyle = style.getPropertyValue('--color-error');
            else this.ctx.strokeStyle = style.getPropertyValue('--color-primary');
            this.ctx.lineWidth = 3; this.ctx.stroke();
            const isDarkMode = document.documentElement.getAttribute('data-color-scheme') === 'dark';
            this.ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#000000';
            this.ctx.font = `bold ${this.nodeRadius * 0.8}px sans-serif`;
            this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
            this.ctx.fillText(node.id, node.x, node.y);
            if (node.distance !== Infinity) {
                this.ctx.fillStyle = style.getPropertyValue('--color-text');
                this.ctx.font = `500 ${this.nodeRadius * 0.7}px sans-serif`;
                this.ctx.fillText(node.distance, node.x, node.y - this.nodeRadius - 8);
            }
        });
    }

    updateButtonStates() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const stepBtn = document.getElementById('stepBtn');
        const stepBackBtn = document.getElementById('stepBackBtn');
        startBtn.style.display = (this.state === 'playing' || this.state === 'paused') ? 'none' : 'inline-block';
        pauseBtn.style.display = (this.state === 'playing' || this.state === 'paused') ? 'inline-block' : 'none';
        startBtn.disabled = this.state === 'finished';
        stepBtn.disabled = this.state === 'playing' || this.state === 'finished';
        stepBackBtn.disabled = this.state === 'playing' || this.state === 'idle' || this.currentStep === 0;
        pauseBtn.textContent = this.state === 'paused' ? '▶️ Resume' : '⏸️ Pause';
    }

    updateUIState() {
        document.getElementById('nodeCount').textContent = this.graph.nodes.length;
        document.getElementById('edgeCount').textContent = this.graph.edges.length / 2;
        const startSelect = document.getElementById('startNodeSelect');
        const endSelect = document.getElementById('endNodeSelect');
        startSelect.innerHTML = ''; endSelect.innerHTML = '';
        const sortedNodes = [...this.graph.nodes].sort((a,b) => String(a.id).localeCompare(String(b.id)));
        sortedNodes.forEach(node => {
            const startOption = document.createElement('option');
            startOption.value = node.id; startOption.textContent = `Node ${node.id}`;
            if (this.graph.startNode && node.id === this.graph.startNode.id) startOption.selected = true;
            startSelect.appendChild(startOption);
            const endOption = document.createElement('option');
            endOption.value = node.id; endOption.textContent = `Node ${node.id}`;
            if (this.graph.endNode && node.id === this.graph.endNode.id) endOption.selected = true;
            endSelect.appendChild(endOption);
        });
    }
    
    switchTab(tabName) {
        document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(`${tabName}-tab`)?.classList.add('active');
        document.querySelector(`.tab-btn[data-tab="${tabName}"]`)?.classList.add('active');
    }
    
    processStep(step) {
        if (!step) return;
        let fromNode, toNode;
        switch (step.type) {
            case 'visit':
                toNode = this.graph.nodes.find(n => n.id === step.nodeId);
                if (toNode) toNode.visited = true;
                break;
            case 'update':
                toNode = this.graph.nodes.find(n => n.id === step.nodeId);
                fromNode = this.graph.nodes.find(n => n.id === step.fromNodeId);
                if (toNode && fromNode) { toNode.distance = step.newDistance; toNode.previous = fromNode; }
                break;
            case 'path': this.finalPath = step.path; break;
        }
        this.draw(step);
        this.updateRoutingTable(step);
        this.updatePriorityQueue(step);
    }
    updateRoutingTable(step = null) {
        const tbody = document.getElementById('routingTableBody');
        tbody.innerHTML = '';
        this.graph.nodes.sort((a, b) => a.id - b.id).forEach(node => {
            const row = document.createElement('tr');
            if (step && (step.type === 'visit' || step.type === 'update') && node.id === step.nodeId) {
                 row.style.backgroundColor = 'rgba(50, 130, 206, 0.3)';
            }
            row.innerHTML = `<td>${node.id}</td><td>${node.distance === Infinity ? '∞' : node.distance}</td><td>${node.previous ? node.previous.id : '–'}</td><td>${node.visited ? '✔️' : '❌'}</td>`;
            tbody.appendChild(row);
        });
    }
    updatePriorityQueue(step = null) {
        const pqDiv = document.getElementById('priorityQueue');
        pqDiv.innerHTML = '';
        const items = step ? step.pqItems : [];
        if (items.length === 0) {
            pqDiv.innerHTML = `<div class="queue-empty">${(this.state !== 'idle') ? 'Queue is empty.' : 'Waiting...'}</div>`;
            return;
        }
        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'pq-item';
            itemDiv.textContent = `Node ${item.id} (dist: ${item.priority})`;
            pqDiv.appendChild(itemDiv);
        });
    }
    resizeCanvas() {
        if (!this.canvas) return;
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth; this.canvas.height = container.clientHeight;
        if(this.graph.nodes.length > 0) {
            const positions = this.calculateNodePositions(this.graph.nodes.length);
            this.graph.nodes.sort((a,b)=>a.id - b.id).forEach((node, i) => {
                node.x = positions[i].x; node.y = positions[i].y;
            });
        }
        this.draw();
    }
    toggleTheme() {
        const root = document.documentElement;
        const newScheme = root.getAttribute('data-color-scheme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-color-scheme', newScheme);
        document.getElementById('themeToggle').textContent = newScheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
        this.draw();
    }
    generateMatrixInput() {
        const container = document.getElementById('matrixContainer');
        if (!container) return;
        container.innerHTML = '';
        const size = parseInt(document.getElementById('matrixSize')?.value) || 5;
        container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const cell = document.createElement('input');
                cell.type = 'number'; cell.className = 'matrix-cell'; cell.min = '0';
                cell.setAttribute('data-row', i); cell.setAttribute('data-col', j);
                if (i === j) { cell.value = 0; cell.disabled = true; }
                container.appendChild(cell);
            }
        }
    }
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        for (let i = this.graph.nodes.length - 1; i >= 0; i--) {
            const node = this.graph.nodes[i]; const dx = x - node.x; const dy = y - node.y;
            if (dx * dx + dy * dy < this.nodeRadius * this.nodeRadius) { this.isDragging = true; this.draggedNode = node; return; }
        }
    }
    handleMouseMove(e) {
        if (this.isDragging && this.draggedNode) {
            const rect = this.canvas.getBoundingClientRect();
            this.draggedNode.x = e.clientX - rect.left; this.draggedNode.y = e.clientY - rect.top;
            this.draw();
        }
    }
    handleMouseUp() { this.isDragging = false; this.draggedNode = null; }
}

document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new DijkstraVisualizer();
});


    