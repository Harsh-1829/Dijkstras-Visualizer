# Dijkstra's Algorithm Visualizer

A interactive web-based visualizer for Dijkstra's shortest path algorithm with advanced features.

## ✨ Features

- **Interactive Graph Creation** - Multiple input methods (presets, matrix, edge list, random generation)
- **Step-by-Step Animation** - Play, pause, step forward, and **step backward** controls
- **Alphanumeric Node Support** - Use letters, numbers, or any text as node identifiers
- **Real-time Visualization** - Watch the algorithm unfold with priority queue updates
- **Dark/Light Theme** - Toggle between themes with persistent preference
- **Responsive Design** - Works on different screen sizes

## 🚀 How to Use

1. Open `index.html` in your web browser
2. Choose an input method:
   - **Presets**: Quick examples (3, 6, or 8 nodes)
   - **Matrix**: Enter weights in a grid format
   - **Edge List**: Define connections like `A B 4` or `Node1 Node2 10`
   - **Random**: Generate random graphs
3. Select start and end nodes from the dropdown
4. Click **Start** to run the algorithm
5. Use **Step Forward/Backward** buttons for detailed control

## 🛠️ Technologies Used

- **HTML5 Canvas** for graph visualization
- **JavaScript (ES6)** for algorithm implementation
- **CSS3** with CSS Variables for styling
- **Priority Queue** implementation for Dijkstra's algorithm

## 📁 Project Structure

```
├── index.html          # Main HTML file
├── app.js              # JavaScript logic and algorithm
├── style.css           # Styling and responsive design
└── start_server.bat    # Quick server startup script
```

## 🎯 Algorithm Features

- **Priority Queue Visualization** - See which nodes are being processed
- **Distance Table Updates** - Real-time distance and previous node tracking
- **Path Highlighting** - Final shortest path clearly marked in red
- **Step Backward** - Go back through the algorithm steps for better understanding

## 📝 Usage Examples

### Edge List Input:
```
A B 4
B C 2
A C 1
X Y 5
```

### Matrix Input:
- Enter weights in the symmetric matrix
- 0s on diagonal (no self-loops)
- Empty cells are disabled

## 🌟 Recent Updates

- ✅ **Step Backward Functionality** - Navigate through algorithm steps in reverse
- ✅ **Alphanumeric Node IDs** - Support for letters, numbers, and text labels
- ✅ **Enhanced UI Controls** - Better button states and user feedback

## 📖 About Dijkstra's Algorithm

Dijkstra's algorithm finds the shortest path between nodes in a graph with non-negative edge weights. This visualizer helps understand:

- How the priority queue works
- Node visiting order
- Distance updates and previous node tracking
- Final path construction

Perfect for learning data structures and algorithms! 🎓

## 🔧 Development

To run locally:
1. Clone or download the files
2. Open `index.html` in a web browser
3. Or run a local server: `python -m http.server 8000`

---

**Created for Data Structures and Algorithms coursework** 📚
