import React, { useEffect, useRef } from 'react';

const PeerVideo = ({ peer }) => {
  const videoRef = useRef();

  useEffect(() => {
    peer.on('stream', stream => {
      videoRef.current.srcObject = stream;
    });
  }, [peer]);

  return (
    <video 
      ref={videoRef} 
      autoPlay 
      playsInline 
      className="peer-video"
    />
  );
};

export default PeerVideo;