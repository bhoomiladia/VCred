'use client';

import { useState, useEffect } from 'react';

interface AnimatedVCredProps {
  className?: string;
}

/**
 * AnimatedVCred — Expands from "VCred" to "Verifying Credentials" and back.
 *
 * Sequence (3 seconds animated part + 5 seconds wait):
 * - Expand takes ~1s
 * - Holds expanded for 1s
 * - Contract takes ~1s
 * (Total cycle = 3s active + 5s idle = 8s)
 */
export function AnimatedVCred({ className = '' }: AnimatedVCredProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const cycle = () => {
      // 1. Expand
      setExpanded(true);
      
      // 2. Wait 2 seconds (1s for expand animation + 1s hold) then contract
      timeout = setTimeout(() => {
        setExpanded(false);
        
        // 3. Wait 6 seconds (1s for contract animation + 5s pause) then repeat
        timeout = setTimeout(cycle, 6000);
      }, 2000);
    };

    // Initial wait before starting first animation
    timeout = setTimeout(cycle, 2000);

    return () => clearTimeout(timeout);
  }, []);

  // Use inline-block with max-width to smoothly animate the width of the hidden letters.
  // We use opacity as well to fade them in/out as they expand/contract.
  const hiddenSegmentStyle: React.CSSProperties = {
    display: 'inline-block',
    maxWidth: expanded ? '15em' : '0',
    opacity: expanded ? 1 : 0,
    overflow: 'hidden',
    verticalAlign: 'baseline',
    whiteSpace: 'nowrap',
    // Add right padding to prevent italic letter 's' from clipping on expansion
    paddingRight: expanded ? '0.15em' : '0',
    // Ultra-smooth transition for a fluid accordion look
    transition: 'max-width 1s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease-in-out, padding-right 1s ease',
  };

  return (
    <span 
      className={`inline-flex items-baseline whitespace-nowrap ${className}`} 
      aria-label="VCred - Verifying Credentials"
    >
      <span>V</span>
      <span style={hiddenSegmentStyle}>erifying&nbsp;</span>
      <span>C</span>
      <span>r</span>
      <span>e</span>
      <span>d</span>
      <span style={hiddenSegmentStyle}>entials</span>
    </span>
  );
}
