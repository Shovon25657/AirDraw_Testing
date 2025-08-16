import React, { useEffect, useRef } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

const HandTracking = ({ onStroke, canvasRef }) => {
  const videoRef = useRef(null);
  const lastPointRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef(null);

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults((results) => {
      if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
        isDrawingRef.current = false;
        if (currentStrokeRef.current) {
          onStroke(currentStrokeRef.current);
          currentStrokeRef.current = null;
        }
        return;
      }

      const landmarks = results.multiHandLandmarks[0];
      const indexTip = landmarks[8]; // Index finger tip
      const thumbTip = landmarks[4]; // Thumb tip

      // Calculate distance between index and thumb
      const distance = Math.sqrt(
        Math.pow(indexTip.x - thumbTip.x, 2) + 
        Math.pow(indexTip.y - thumbTip.y, 2)
      );

      const isPinching = distance < 0.05;

      if (isPinching && !isDrawingRef.current) {
        // Start new stroke
        isDrawingRef.current = true;
        currentStrokeRef.current = {
          id: Date.now(),
          color: '#000',
          width: 5,
          pts: []
        };
      } else if (!isPinching && isDrawingRef.current) {
        // End stroke
        isDrawingRef.current = false;
        if (currentStrokeRef.current) {
          onStroke(currentStrokeRef.current);
          currentStrokeRef.current = null;
        }
      }

      if (isDrawingRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const x = indexTip.x * canvas.width;
        const y = indexTip.y * canvas.height;
        
        currentStrokeRef.current.pts.push({ x, y, t: Date.now() });
        
        // Draw locally for immediate feedback
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = currentStrokeRef.current.color;
        ctx.lineWidth = currentStrokeRef.current.width;
        
        if (!lastPointRef.current) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          lastPointRef.current = { x, y };
        } else {
          ctx.lineTo(x, y);
          ctx.stroke();
          lastPointRef.current = { x, y };
        }
      } else {
        lastPointRef.current = null;
      }
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 640,
      height: 480
    });
    camera.start();

    return () => {
      camera.stop();
    };
  }, [onStroke, canvasRef]);

  return (
    <div className="hand-tracking">
      <video 
        ref={videoRef} 
        style={{ display: 'none' }}
        playsInline
      />
    </div>
  );
};

export default HandTracking;