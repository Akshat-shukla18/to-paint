import React, { useRef, useEffect, useState } from 'react';
import './App.css';

const PaintApp = () => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('draw');
  const [image, setImage] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 800;
    canvas.height = 600;
    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;
    if (history.length === 0) {
      saveCanvasState();
    } else {
      restoreCanvasState();
    }
  }, [image, history, historyIndex]);

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    const data = canvas.toDataURL();
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, data];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const restoreCanvasState = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    const data = history[historyIndex];
    if (data) {
      const img = new Image();
      img.src = data;
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
    }
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        setImage(img);
        saveCanvasState();
      };
    }
  };

  const cancelImage = () => {
    setImage(null);
    saveCanvasState();
  };

  const startDrawing = ({ nativeEvent }) => {
    if (tool !== 'draw') return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing || tool !== 'draw') return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.strokeStyle = color;
    contextRef.current.lineWidth = brushSize;
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      contextRef.current.closePath();
      setIsDrawing(false);
      saveCanvasState();
    }
  };

  const floodFill = (startX, startY, fillColor) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const startColor = getPixelColor(data, startX, startY, canvas.width);
    if (colorsMatch(startColor, hexToRgb(fillColor))) return;

    const stack = [[startX, startY]];
    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;

      const currentColor = getPixelColor(data, x, y, canvas.width);
      if (!colorsMatch(currentColor, startColor)) continue;

      setPixelColor(data, x, y, canvas.width, hexToRgb(fillColor));
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
    saveCanvasState();
  };

  const getPixelColor = (data, x, y, width) => {
    const index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2], data[index + 3]];
  };

  const setPixelColor = (data, x, y, width, [r, g, b, a]) => {
    const index = (y * width + x) * 4;
    data[index] = r;
    data[index + 1] = g;
    data[index + 2] = b;
    data[index + 3] = a;
  };

  const colorsMatch = (color1, color2) =>
    color1[0] === color2[0] && color1[1] === color2[1] && color1[2] === color2[2];

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 255];
  };

  const handleCanvasClick = ({ nativeEvent }) => {
    if (tool === 'fill') {
      const { offsetX, offsetY } = nativeEvent;
      floodFill(Math.floor(offsetX), Math.floor(offsetY), color);
    }
  };

  const clearCanvas = () => {
    contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    if (image) {
      contextRef.current.drawImage(image, 0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    saveCanvasState();
  };

  const setEraser = () => {
    setColor('#ffffff');
    setBrushSize(20);
    setTool('draw');
  };

  return (
    <div className="paint-app">
      <div className="controls-container">
        <div className="controls">
          <label className="control-label">
            Upload Image:
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          </label>
          {image && (
            <button className="cancel-image" onClick={cancelImage} title="Remove Image">
              ✖
            </button>
          )}
          <label className="control-label">
            Color:
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="color-picker"
            />
          </label>
          <label className="control-label">
            Brush Size:
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(e.target.value)}
              disabled={tool === 'fill'}
              className="brush-slider"
            />
          </label>
          <button onClick={() => setTool('draw')} className={tool === 'draw' ? 'active' : ''}>
            Draw
          </button>
          <button onClick={() => setTool('fill')} className={tool === 'fill' ? 'active' : ''}>
            Fill
          </button>
          <button onClick={setEraser}>Eraser</button>
          <button onClick={clearCanvas}>Clear</button>
          <button onClick={saveCanvas} title="Save Image" className="save-button">
            💾
          </button>
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo"
            className="history-button"
          >
            ⟲
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo"
            className="history-button"
          >
            ⟳
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onClick={handleCanvasClick}
        className="paint-canvas"
      />
    </div>
  );
};

export default PaintApp;
