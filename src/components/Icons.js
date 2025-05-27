import React from 'react';

export const XIcon = ({ isLarge = false, customClass = '', color = 'black' }) => (
  <svg 
    className={`icon-svg ${customClass}`}
    viewBox='0 0 24 24' 
    width={isLarge ? '100%' : '70%'} 
    height={isLarge ? '100%' : '70%'} 
    preserveAspectRatio='xMidYMid meet' 
    style={{ display: 'block', margin: isLarge ? '0' : 'auto', color: color }}
  >
    <path stroke='currentColor' strokeWidth={isLarge ? 2 : 3} strokeLinecap='square' d='M6 6 L18 18 M6 18 L18 6'/>
  </svg>
);

export const OIcon = ({ isLarge = false, customClass = '', color = 'black' }) => (
  <svg 
    className={`icon-svg ${customClass}`}
    viewBox='0 0 24 24' 
    width={isLarge ? '100%' : '70%'} 
    height={isLarge ? '100%' : '70%'} 
    preserveAspectRatio='xMidYMid meet' 
    style={{ display: 'block', margin: isLarge ? '0' : 'auto', color: color }}
  >
    <circle cx='12' cy='12' r='8' stroke='currentColor' strokeWidth={isLarge ? 2 : 3} fill='none'/>
  </svg>
); 