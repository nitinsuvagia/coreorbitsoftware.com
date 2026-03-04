// Hand-drawn style SVG illustrations for the landing page
// These are custom illustrations with a friendly, approachable look

export const HeroIllustration = () => (
  <svg viewBox="0 0 600 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    {/* Background elements */}
    <defs>
      <linearGradient id="bgGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.1" />
      </linearGradient>
      <linearGradient id="aiGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="50%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
      <filter id="handDrawn">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="warp" />
        <feDisplacementMap xChannelSelector="R" yChannelSelector="G" scale="2" in="SourceGraphic" in2="warp" />
      </filter>
    </defs>

    {/* Floating shapes - hand drawn feel */}
    <ellipse cx="100" cy="80" rx="30" ry="25" fill="url(#bgGradient1)" className="animate-pulse" />
    <ellipse cx="500" cy="100" rx="40" ry="35" fill="url(#bgGradient1)" className="animate-pulse" style={{ animationDelay: '1s' }} />
    <ellipse cx="550" cy="380" rx="25" ry="20" fill="url(#bgGradient1)" className="animate-pulse" style={{ animationDelay: '0.5s' }} />

    {/* Main workspace illustration */}
    <g transform="translate(80, 100)">
      {/* Desk */}
      <path 
        d="M20 280 C25 278 35 275 100 275 L350 275 C380 275 395 278 400 280 L410 290 C412 295 410 300 400 300 L20 300 C10 300 8 295 10 290 Z" 
        fill="#1E293B" 
        stroke="#334155" 
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Desk front */}
      <rect x="30" y="300" width="360" height="80" rx="4" fill="#334155" stroke="#475569" strokeWidth="2" />
      <rect x="50" y="310" width="80" height="60" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="1" />
      <ellipse cx="170" cy="340" rx="25" ry="25" fill="#1E293B" stroke="#475569" strokeWidth="1" />
      
      {/* Monitor */}
      <rect x="120" y="120" width="200" height="140" rx="8" fill="#1E293B" stroke="#475569" strokeWidth="3" />
      <rect x="130" y="130" width="180" height="110" rx="4" fill="#0F172A" />
      
      {/* Screen content - Dashboard */}
      <rect x="140" y="140" width="60" height="40" rx="2" fill="#3B82F6" fillOpacity="0.3" />
      <rect x="210" y="140" width="90" height="20" rx="2" fill="#8B5CF6" fillOpacity="0.3" />
      <rect x="210" y="165" width="70" height="15" rx="2" fill="#10B981" fillOpacity="0.3" />
      <rect x="140" y="190" width="160" height="8" rx="1" fill="#6366F1" fillOpacity="0.4" />
      <rect x="140" y="202" width="120" height="8" rx="1" fill="#6366F1" fillOpacity="0.3" />
      <rect x="140" y="214" width="140" height="8" rx="1" fill="#6366F1" fillOpacity="0.2" />
      
      {/* AI sparkle effect on screen */}
      <g className="animate-pulse">
        <circle cx="290" cy="150" r="8" fill="url(#aiGlow)" fillOpacity="0.6" />
        <path d="M290 140 L290 160 M280 150 L300 150" stroke="url(#aiGlow)" strokeWidth="2" strokeLinecap="round" />
      </g>
      
      {/* Monitor stand */}
      <path d="M200 260 L240 260 L235 275 L205 275 Z" fill="#475569" />
      <rect x="195" y="275" width="50" height="5" rx="2" fill="#334155" />
      
      {/* Keyboard */}
      <rect x="140" y="285" width="140" height="35" rx="4" fill="#1E293B" stroke="#475569" strokeWidth="2" />
      {/* Keyboard keys - simplified */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <rect key={i} x={150 + i * 12} y="292" width="10" height="8" rx="1" fill="#334155" />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <rect key={`r2-${i}`} x={155 + i * 12} y="303" width="10" height="8" rx="1" fill="#334155" />
      ))}
      
      {/* Mouse */}
      <ellipse cx="320" cy="295" rx="15" ry="20" fill="#1E293B" stroke="#475569" strokeWidth="2" />
      <line x1="320" y1="280" x2="320" y2="290" stroke="#475569" strokeWidth="2" />
      
      {/* Coffee mug */}
      <path d="M60 240 L60 280 Q60 290 70 290 L90 290 Q100 290 100 280 L100 240 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
      <path d="M100 250 Q115 250 115 265 Q115 280 100 280" fill="none" stroke="#D97706" strokeWidth="2" />
      {/* Steam */}
      <path d="M75 230 Q78 220 75 210" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" className="animate-pulse" />
      <path d="M85 230 Q82 218 85 205" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
      
      {/* Plant */}
      <rect x="370" y="220" width="30" height="55" rx="4" fill="#7C3AED" stroke="#6D28D9" strokeWidth="2" />
      {/* Leaves */}
      <path d="M385 220 Q385 200 370 190 Q390 195 385 220" fill="#10B981" />
      <path d="M385 220 Q385 195 400 185 Q380 190 385 220" fill="#059669" />
      <path d="M385 220 Q390 200 405 200 Q390 205 385 220" fill="#10B981" />
    </g>

    {/* Person working - simplified, friendly character */}
    <g transform="translate(230, 50)">
      {/* Hair */}
      <ellipse cx="70" cy="40" rx="35" ry="32" fill="#1E293B" />
      {/* Head */}
      <ellipse cx="70" cy="50" rx="28" ry="30" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" />
      {/* Expression - happy */}
      <ellipse cx="58" cy="45" rx="4" ry="5" fill="#1E293B" />
      <ellipse cx="82" cy="45" rx="4" ry="5" fill="#1E293B" />
      <path d="M58 60 Q70 72 82 60" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
      {/* Glasses */}
      <rect x="48" y="38" width="18" height="14" rx="3" fill="none" stroke="#6366F1" strokeWidth="2" />
      <rect x="74" y="38" width="18" height="14" rx="3" fill="none" stroke="#6366F1" strokeWidth="2" />
      <line x1="66" y1="45" x2="74" y2="45" stroke="#6366F1" strokeWidth="2" />
      
      {/* Body */}
      <path d="M40 85 Q30 100 35 160 L105 160 Q110 100 100 85 Q85 75 55 75 Q42 80 40 85" fill="#3B82F6" stroke="#2563EB" strokeWidth="2" />
      {/* Collar */}
      <path d="M55 85 L70 100 L85 85" fill="#1E293B" />
      
      {/* Arms */}
      <path d="M35 100 Q15 110 20 160" fill="none" stroke="#FBBF24" strokeWidth="12" strokeLinecap="round" />
      <path d="M105 100 Q125 110 120 160" fill="none" stroke="#FBBF24" strokeWidth="12" strokeLinecap="round" />
      
      {/* Hands on keyboard area */}
      <ellipse cx="25" cy="165" rx="12" ry="10" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" />
      <ellipse cx="115" cy="165" rx="12" ry="10" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" />
    </g>

    {/* AI Assistant floating elements */}
    <g transform="translate(420, 80)" className="animate-bounce" style={{ animationDuration: '3s' }}>
      {/* AI Bot */}
      <rect x="0" y="20" width="80" height="60" rx="12" fill="url(#aiGlow)" fillOpacity="0.2" stroke="url(#aiGlow)" strokeWidth="2" />
      <circle cx="25" cy="45" r="8" fill="#3B82F6" />
      <circle cx="55" cy="45" r="8" fill="#3B82F6" />
      <circle cx="25" cy="43" r="3" fill="white" />
      <circle cx="55" cy="43" r="3" fill="white" />
      <path d="M30 60 Q40 68 50 60" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
      {/* Antenna */}
      <line x1="40" y1="20" x2="40" y2="5" stroke="url(#aiGlow)" strokeWidth="2" />
      <circle cx="40" cy="5" r="5" fill="url(#aiGlow)" className="animate-ping" style={{ animationDuration: '2s' }} />
      
      {/* Chat bubbles */}
      <g transform="translate(-30, 90)">
        <rect x="0" y="0" width="100" height="25" rx="8" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1" />
        <text x="10" y="17" fill="#64748B" fontSize="10">How can I help?</text>
      </g>
    </g>

    {/* Floating icons around */}
    <g className="animate-pulse" style={{ animationDuration: '4s' }}>
      <circle cx="60" cy="200" r="20" fill="#10B981" fillOpacity="0.2" />
      <text x="52" y="206" fill="#10B981" fontSize="16">✓</text>
    </g>
    
    <g className="animate-pulse" style={{ animationDuration: '3s', animationDelay: '1s' }}>
      <circle cx="540" cy="250" r="20" fill="#F59E0B" fillOpacity="0.2" />
      <text x="532" y="256" fill="#F59E0B" fontSize="16">⚡</text>
    </g>
    
    <g className="animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }}>
      <circle cx="50" cy="350" r="18" fill="#8B5CF6" fillOpacity="0.2" />
      <text x="42" y="356" fill="#8B5CF6" fontSize="14">🤖</text>
    </g>
  </svg>
);

export const TeamCollaborationIllustration = () => (
  <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    <defs>
      <linearGradient id="teamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
    
    {/* Connection lines */}
    <path d="M100 150 L200 100 L300 150" fill="none" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="5 5" />
    <path d="M100 150 L200 200 L300 150" fill="none" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="5 5" />
    <path d="M200 100 L200 200" fill="none" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="5 5" />
    
    {/* Person 1 - Left */}
    <g transform="translate(60, 110)">
      <circle cx="40" cy="20" r="25" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" />
      <circle cx="32" cy="15" r="3" fill="#1E293B" />
      <circle cx="48" cy="15" r="3" fill="#1E293B" />
      <path d="M32 28 Q40 35 48 28" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
      <rect x="20" y="50" width="40" height="50" rx="8" fill="#10B981" stroke="#059669" strokeWidth="2" />
    </g>
    
    {/* Person 2 - Top center */}
    <g transform="translate(160, 40)">
      <circle cx="40" cy="20" r="25" fill="#FCA5A5" stroke="#F87171" strokeWidth="2" />
      <circle cx="32" cy="15" r="3" fill="#1E293B" />
      <circle cx="48" cy="15" r="3" fill="#1E293B" />
      <path d="M32 28 Q40 35 48 28" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="40" cy="8" rx="28" ry="15" fill="#7C3AED" />
      <rect x="20" y="50" width="40" height="50" rx="8" fill="#3B82F6" stroke="#2563EB" strokeWidth="2" />
    </g>
    
    {/* Person 3 - Right */}
    <g transform="translate(260, 110)">
      <circle cx="40" cy="20" r="25" fill="#A7F3D0" stroke="#6EE7B7" strokeWidth="2" />
      <circle cx="32" cy="15" r="3" fill="#1E293B" />
      <circle cx="48" cy="15" r="3" fill="#1E293B" />
      <path d="M32 28 Q40 35 48 28" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
      <rect x="20" y="50" width="40" height="50" rx="8" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
    </g>
    
    {/* Person 4 - Bottom center */}
    <g transform="translate(160, 180)">
      <circle cx="40" cy="20" r="25" fill="#93C5FD" stroke="#60A5FA" strokeWidth="2" />
      <circle cx="32" cy="15" r="3" fill="#1E293B" />
      <circle cx="48" cy="15" r="3" fill="#1E293B" />
      <path d="M32 28 Q40 35 48 28" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
      <rect x="20" y="50" width="40" height="50" rx="8" fill="#EC4899" stroke="#DB2777" strokeWidth="2" />
    </g>
    
    {/* Central AI hub */}
    <circle cx="200" cy="150" r="30" fill="url(#teamGrad)" fillOpacity="0.2" stroke="url(#teamGrad)" strokeWidth="2" className="animate-pulse" />
    <text x="187" y="156" fill="#6366F1" fontSize="20">🤖</text>
    
    {/* Data flow particles */}
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <circle 
        key={i} 
        cx={200 + Math.cos(i * Math.PI / 3) * 50} 
        cy={150 + Math.sin(i * Math.PI / 3) * 50} 
        r="4" 
        fill="#6366F1" 
        className="animate-ping"
        style={{ animationDelay: `${i * 0.3}s`, animationDuration: '2s' }}
      />
    ))}
  </svg>
);

export const AIFeatureIllustration = () => (
  <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    <defs>
      <linearGradient id="aiPurple" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
    
    {/* Brain/AI visualization */}
    <g transform="translate(100, 50)">
      {/* Main brain outline */}
      <path 
        d="M100 20 Q150 0 180 30 Q210 10 220 50 Q250 60 240 100 Q260 130 230 160 Q240 190 200 200 Q180 220 140 210 Q100 220 80 190 Q40 180 50 140 Q30 110 60 80 Q40 50 80 40 Q70 20 100 20" 
        fill="url(#aiPurple)" 
        fillOpacity="0.2" 
        stroke="url(#aiPurple)" 
        strokeWidth="3"
      />
      
      {/* Neural network nodes */}
      {[[80, 60], [140, 40], [180, 70], [100, 100], [160, 110], [200, 90], [120, 150], [180, 160], [140, 180]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="10" fill="white" stroke="#8B5CF6" strokeWidth="2" />
          <circle cx={x} cy={y} r="4" fill="#8B5CF6" className="animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
        </g>
      ))}
      
      {/* Connections */}
      <g stroke="#8B5CF6" strokeWidth="1" strokeOpacity="0.4">
        <line x1="80" y1="60" x2="140" y2="40" />
        <line x1="140" y1="40" x2="180" y2="70" />
        <line x1="80" y1="60" x2="100" y2="100" />
        <line x1="140" y1="40" x2="160" y2="110" />
        <line x1="180" y1="70" x2="200" y2="90" />
        <line x1="100" y1="100" x2="160" y2="110" />
        <line x1="160" y1="110" x2="200" y2="90" />
        <line x1="100" y1="100" x2="120" y2="150" />
        <line x1="160" y1="110" x2="180" y2="160" />
        <line x1="120" y1="150" x2="140" y2="180" />
        <line x1="180" y1="160" x2="140" y2="180" />
      </g>
    </g>
    
    {/* Floating data points */}
    <g>
      <rect x="30" y="80" width="60" height="40" rx="6" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1">
        <animate attributeName="y" values="80;70;80" dur="3s" repeatCount="indefinite" />
      </rect>
      <text x="40" y="105" fill="#64748B" fontSize="10">Data</text>
      
      <rect x="310" y="100" width="70" height="40" rx="6" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1">
        <animate attributeName="y" values="100;90;100" dur="4s" repeatCount="indefinite" />
      </rect>
      <text x="318" y="125" fill="#64748B" fontSize="10">Insights</text>
      
      <rect x="50" y="200" width="65" height="40" rx="6" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1">
        <animate attributeName="y" values="200;210;200" dur="3.5s" repeatCount="indefinite" />
      </rect>
      <text x="55" y="225" fill="#64748B" fontSize="10">Analytics</text>
      
      <rect x="290" y="200" width="80" height="40" rx="6" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1">
        <animate attributeName="y" values="200;190;200" dur="4.5s" repeatCount="indefinite" />
      </rect>
      <text x="298" y="225" fill="#64748B" fontSize="10">Predictions</text>
    </g>
    
    {/* Sparkles */}
    {[[60, 50], [340, 70], [380, 180], [20, 250]].map(([x, y], i) => (
      <g key={i} className="animate-ping" style={{ animationDelay: `${i * 0.5}s`, animationDuration: '2s' }}>
        <circle cx={x} cy={y} r="3" fill="#FBBF24" />
      </g>
    ))}
  </svg>
);

export const DashboardIllustration = () => (
  <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    {/* Main dashboard frame */}
    <rect x="20" y="20" width="360" height="260" rx="12" fill="#1E293B" stroke="#334155" strokeWidth="2" />
    
    {/* Header bar */}
    <rect x="20" y="20" width="360" height="40" rx="12" fill="#334155" />
    <circle cx="45" cy="40" r="6" fill="#EF4444" />
    <circle cx="65" cy="40" r="6" fill="#F59E0B" />
    <circle cx="85" cy="40" r="6" fill="#10B981" />
    
    {/* Sidebar */}
    <rect x="20" y="60" width="60" height="220" fill="#0F172A" />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <rect key={i} x="30" y={80 + i * 35} width="40" height="25" rx="4" fill={i === 0 ? '#3B82F6' : '#334155'} />
    ))}
    
    {/* Main content area */}
    {/* Stats cards */}
    <g transform="translate(90, 70)">
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${i * 70}, 0)`}>
          <rect width="60" height="50" rx="6" fill="#1E293B" stroke="#334155" strokeWidth="1" />
          <rect x="8" y="8" width="20" height="20" rx="4" fill={['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][i]} fillOpacity="0.3" />
          <rect x="8" y="35" width="40" height="6" rx="2" fill="#334155" />
        </g>
      ))}
    </g>
    
    {/* Chart area */}
    <rect x="90" y="130" width="200" height="100" rx="8" fill="#0F172A" />
    <g transform="translate(100, 140)">
      {/* Bar chart */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect 
          key={i} 
          x={i * 25} 
          y={80 - [40, 60, 45, 70, 55, 80, 50][i]} 
          width="15" 
          height={[40, 60, 45, 70, 55, 80, 50][i]} 
          rx="2" 
          fill={i % 2 === 0 ? '#3B82F6' : '#8B5CF6'} 
          fillOpacity="0.8"
        />
      ))}
    </g>
    
    {/* Side panel */}
    <rect x="300" y="130" width="70" height="100" rx="8" fill="#0F172A" />
    {[0, 1, 2, 3].map((i) => (
      <g key={i} transform={`translate(308, ${140 + i * 22})`}>
        <circle r="6" cx="6" cy="6" fill={['#10B981', '#3B82F6', '#F59E0B', '#EF4444'][i]} />
        <rect x="16" y="2" width="40" height="8" rx="2" fill="#334155" />
      </g>
    ))}
    
    {/* Bottom section */}
    <rect x="90" y="240" width="280" height="30" rx="6" fill="#0F172A" />
    <rect x="100" y="250" width="260" height="10" rx="3" fill="#334155" />
    <rect x="100" y="250" width="180" height="10" rx="3" fill="url(#bgGradient1)" />
  </svg>
);

export const SecurityIllustration = () => (
  <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
    
    {/* Shield */}
    <path 
      d="M150 30 L250 70 L250 150 Q250 230 150 270 Q50 230 50 150 L50 70 Z" 
      fill="url(#shieldGrad)" 
      fillOpacity="0.15" 
      stroke="url(#shieldGrad)" 
      strokeWidth="3"
    />
    
    {/* Inner shield */}
    <path 
      d="M150 60 L220 90 L220 150 Q220 210 150 240 Q80 210 80 150 L80 90 Z" 
      fill="url(#shieldGrad)" 
      fillOpacity="0.1" 
      stroke="url(#shieldGrad)" 
      strokeWidth="2"
    />
    
    {/* Checkmark */}
    <path 
      d="M110 145 L140 175 L190 115" 
      fill="none" 
      stroke="#10B981" 
      strokeWidth="8" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    
    {/* Lock icon at top */}
    <g transform="translate(130, 50)">
      <rect x="5" y="10" width="30" height="25" rx="4" fill="#10B981" />
      <path d="M10 10 L10 5 Q10 -5 20 -5 Q30 -5 30 5 L30 10" fill="none" stroke="#10B981" strokeWidth="3" />
    </g>
    
    {/* Orbiting elements */}
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <circle 
        key={i}
        cx={150 + Math.cos(i * Math.PI / 3 + Math.PI/6) * 110}
        cy={150 + Math.sin(i * Math.PI / 3 + Math.PI/6) * 110}
        r="8"
        fill="#3B82F6"
        fillOpacity="0.5"
        className="animate-pulse"
        style={{ animationDelay: `${i * 0.3}s` }}
      />
    ))}
  </svg>
);

export const IntegrationIllustration = () => (
  <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    {/* Central hub */}
    <circle cx="200" cy="150" r="50" fill="#3B82F6" fillOpacity="0.1" stroke="#3B82F6" strokeWidth="2" />
    <circle cx="200" cy="150" r="30" fill="#3B82F6" fillOpacity="0.2" />
    <text x="180" y="157" fill="#3B82F6" fontSize="26">⚡</text>
    
    {/* Connected services */}
    {[
      { x: 60, y: 60, icon: '📧', color: '#EF4444' },
      { x: 340, y: 60, icon: '📅', color: '#F59E0B' },
      { x: 60, y: 240, icon: '💬', color: '#10B981' },
      { x: 340, y: 240, icon: '📊', color: '#8B5CF6' },
      { x: 60, y: 150, icon: '📁', color: '#EC4899' },
      { x: 340, y: 150, icon: '🔗', color: '#6366F1' },
    ].map((item, i) => (
      <g key={i}>
        {/* Connection line */}
        <line 
          x1="200" 
          y1="150" 
          x2={item.x} 
          y2={item.y} 
          stroke={item.color} 
          strokeWidth="2" 
          strokeDasharray="8 4"
          strokeOpacity="0.5"
        />
        {/* Service node */}
        <circle cx={item.x} cy={item.y} r="35" fill="white" stroke={item.color} strokeWidth="2" />
        <circle cx={item.x} cy={item.y} r="25" fill={item.color} fillOpacity="0.1" />
        <text x={item.x - 12} y={item.y + 8} fontSize="24">{item.icon}</text>
        
        {/* Data flow dot */}
        <circle r="4" fill={item.color}>
          <animateMotion 
            dur={`${2 + i * 0.5}s`}
            repeatCount="indefinite"
            path={`M${item.x},${item.y} L200,150`}
          />
        </circle>
      </g>
    ))}
  </svg>
);

// Character illustrations for testimonials and about section
export const CharacterWaving = () => (
  <svg viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    {/* Head */}
    <circle cx="60" cy="35" r="30" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" />
    {/* Hair */}
    <path d="M35 25 Q40 5 60 10 Q80 5 85 25 Q85 20 75 15 Q60 5 45 15 Q35 20 35 25" fill="#4B5563" />
    {/* Eyes */}
    <ellipse cx="48" cy="32" rx="4" ry="5" fill="#1E293B" />
    <ellipse cx="72" cy="32" rx="4" ry="5" fill="#1E293B" />
    {/* Smile */}
    <path d="M45 48 Q60 60 75 48" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
    
    {/* Body */}
    <path d="M35 68 Q25 80 30 120 L90 120 Q95 80 85 68 Q75 62 45 62 Q38 65 35 68" fill="#3B82F6" stroke="#2563EB" strokeWidth="2" />
    
    {/* Waving arm */}
    <g className="origin-bottom animate-bounce" style={{ animationDuration: '1s' }}>
      <path d="M85 75 Q105 60 115 45" fill="none" stroke="#FBBF24" strokeWidth="12" strokeLinecap="round" />
      <circle cx="115" cy="42" r="10" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" />
    </g>
    
    {/* Other arm */}
    <path d="M35 80 Q20 95 25 120" fill="none" stroke="#FBBF24" strokeWidth="12" strokeLinecap="round" />
    <circle cx="25" cy="122" r="10" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" />
  </svg>
);

export const CharacterThinking = () => (
  <svg viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    {/* Head */}
    <circle cx="60" cy="40" r="30" fill="#FCA5A5" stroke="#F87171" strokeWidth="2" />
    {/* Hair bun */}
    <ellipse cx="60" cy="15" rx="25" ry="12" fill="#7C3AED" />
    <circle cx="60" cy="10" r="10" fill="#7C3AED" />
    {/* Eyes looking up */}
    <ellipse cx="48" cy="35" rx="4" ry="3" fill="#1E293B" />
    <ellipse cx="72" cy="35" rx="4" ry="3" fill="#1E293B" />
    {/* Thinking expression */}
    <path d="M50 52 Q60 54 70 52" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
    
    {/* Body */}
    <path d="M35 73 Q25 85 30 130 L90 130 Q95 85 85 73 Q75 67 45 67 Q38 70 35 73" fill="#10B981" stroke="#059669" strokeWidth="2" />
    
    {/* Hand on chin */}
    <path d="M85 85 Q95 70 90 55" fill="none" stroke="#FCA5A5" strokeWidth="10" strokeLinecap="round" />
    <circle cx="88" cy="55" r="8" fill="#FCA5A5" stroke="#F87171" strokeWidth="2" />
    
    {/* Thought bubbles */}
    <g className="animate-pulse">
      <circle cx="105" cy="25" r="5" fill="#E2E8F0" />
      <circle cx="112" cy="15" r="4" fill="#E2E8F0" />
      <circle cx="116" cy="5" r="3" fill="#E2E8F0" />
    </g>
  </svg>
);

export const CharacterCelebrating = () => (
  <svg viewBox="0 0 140 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    {/* Confetti */}
    {[[20, 20, '#EF4444'], [120, 30, '#F59E0B'], [30, 50, '#10B981'], [110, 50, '#3B82F6'], [15, 80, '#8B5CF6'], [125, 80, '#EC4899']].map(([x, y, color], i) => (
      <rect 
        key={i} 
        x={Number(x)} 
        y={Number(y)} 
        width="8" 
        height="8" 
        rx="1" 
        fill={color as string}
        transform={`rotate(${i * 30} ${Number(x) + 4} ${Number(y) + 4})`}
        className="animate-bounce"
        style={{ animationDelay: `${i * 0.1}s`, animationDuration: '1.5s' }}
      />
    ))}
    
    {/* Head */}
    <circle cx="70" cy="50" r="30" fill="#A7F3D0" stroke="#6EE7B7" strokeWidth="2" />
    {/* Hair */}
    <path d="M45 40 Q50 20 70 25 Q90 20 95 40" fill="#1E293B" />
    {/* Happy eyes - closed */}
    <path d="M55 45 Q60 40 65 45" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
    <path d="M75 45 Q80 40 85 45" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
    {/* Big smile */}
    <path d="M55 60 Q70 75 85 60" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
    
    {/* Body */}
    <path d="M45 83 Q35 95 40 140 L100 140 Q105 95 95 83 Q85 77 55 77 Q48 80 45 83" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
    
    {/* Arms up */}
    <path d="M40 95 Q20 70 10 50" fill="none" stroke="#A7F3D0" strokeWidth="12" strokeLinecap="round" />
    <circle cx="10" cy="48" r="10" fill="#A7F3D0" stroke="#6EE7B7" strokeWidth="2" />
    
    <path d="M100 95 Q120 70 130 50" fill="none" stroke="#A7F3D0" strokeWidth="12" strokeLinecap="round" />
    <circle cx="130" cy="48" r="10" fill="#A7F3D0" stroke="#6EE7B7" strokeWidth="2" />
  </svg>
);
