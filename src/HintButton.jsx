import React from 'react';

const HintButton = ({ round, onUseHint, usedHints }) => {
  const hints = [
    { type: 'firstLetter', cost: 20, label: 'First Letter' },
    { type: 'category', cost: 30, label: 'Category' },
    { type: 'silhouette', cost: 50, label: 'Silhouette' }
  ];

  return (
    <div className="hint-buttons">
      {hints.map(hint => (
        <button
          key={hint.type}
          onClick={() => onUseHint(hint.type, hint.cost)}
          disabled={usedHints.includes(hint.type) || usedHints.length >= 3}
          className="hint-button"
        >
          {hint.label} (-{hint.cost}pts)
        </button>
      ))}
    </div>
  );
};

export default HintButton;