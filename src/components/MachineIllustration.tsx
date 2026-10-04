import type { MachineId } from '../machines';

export default function MachineIllustration({ machine, compact = false }: { machine: MachineId; compact?: boolean }) {
  const gridId = `grid-${machine}-${compact ? 'compact' : 'large'}`;
  return (
    <svg viewBox="0 0 520 300" fill="none" aria-hidden="true" className="machine-illustration">
      <defs>
        <pattern id={gridId} width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" stroke="#203d3b" strokeOpacity=".06" /></pattern>
      </defs>
      <rect width="520" height="300" fill={machine === 'lever' ? '#eee7da' : '#e8ece4'} />
      <rect width="520" height="300" fill={`url(#${gridId})`} />
      {machine === 'lever' ? <>
        <ellipse cx="248" cy="246" rx="181" ry="12" fill="#203d3b" fillOpacity=".07" />
        <path d="M159 166L124 237H199L166 166Z" fill="#35635d" />
        <path d="M166 166L199 237H210L177 166Z" fill="#203d3b" />
        <rect x="116" y="233" width="101" height="12" rx="4" fill="#203d3b" />
        <g transform="rotate(-10 166 153)">
          <rect x="62" y="146" width="362" height="18" rx="7" fill="#a45540" />
          <rect x="62" y="140" width="362" height="16" rx="6" fill="#d88970" />
          {[104, 145, 186, 227, 268, 309, 350, 391].map(x => <path key={x} d={`M${x} 141V147`} stroke="#a45540" strokeWidth="2" />)}
          <path d="M89 140V121" stroke="#203d3b" strokeWidth="5" />
          <rect x="62" y="79" width="57" height="47" rx="7" fill="#edb348" />
          <path d="M73 79V67Q89 52 106 67V79" stroke="#203d3b" strokeWidth="6" />
          <text x="90" y="109" textAnchor="middle" fill="#644b22" fontSize="14" fontFamily="sans-serif" fontWeight="700">10 kg</text>
          <rect x="364" y="126" width="43" height="14" rx="7" fill="#203d3b" />
        </g>
        <circle cx="166" cy="158" r="9" fill="#edb348" stroke="#203d3b" strokeWidth="3" />
        <path d="M382 54V92M372 81L382 93L392 81" stroke="#203d3b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M90 170V209M81 180L90 168L99 180" stroke="#a45540" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M185 211H303" stroke="#203d3b" strokeWidth="1.5" strokeDasharray="5 5" />
        <text x="323" y="216" fill="#5d6e64" fontFamily="sans-serif" fontSize="12">a little push</text>
      </> : <>
        <ellipse cx="272" cy="260" rx="159" ry="10" fill="#203d3b" fillOpacity=".07" />
        <rect x="121" y="38" width="282" height="17" rx="5" fill="#35635d" />
        <path d="M141 55V253M384 55V253" stroke="#35635d" strokeWidth="15" />
        <rect x="117" y="250" width="48" height="9" rx="3" fill="#203d3b" />
        <rect x="360" y="250" width="48" height="9" rx="3" fill="#203d3b" />
        <path d="M270 55V68" stroke="#203d3b" strokeWidth="7" />
        <circle cx="270" cy="110" r="43" fill="#b07829" />
        <circle cx="270" cy="106" r="40" fill="#edb348" stroke="#203d3b" strokeWidth="3" />
        <circle cx="270" cy="106" r="27" stroke="#c28b32" strokeWidth="3" />
        <path d="M246 82L294 130M294 82L246 130" stroke="#c28b32" strokeWidth="6" />
        <circle cx="270" cy="106" r="10" fill="#203d3b" />
        <path d="M229 198V106A41 41 0 0 1 311 106V198" stroke="#f5f4ed" strokeWidth="5" strokeLinecap="round" />
        <path d="M229 199V210Q229 222 240 219" stroke="#203d3b" strokeWidth="4" strokeLinecap="round" />
        <rect x="198" y="220" width="63" height="34" rx="6" fill="#d88970" />
        <text x="229" y="241" textAnchor="middle" fill="#6f3d2e" fontSize="13" fontFamily="sans-serif" fontWeight="700">10 kg</text>
        <rect x="299" y="192" width="24" height="12" rx="5" fill="#203d3b" />
        <path d="M341 176V211M332 200L341 212L350 200" stroke="#203d3b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M180 229V195M171 206L180 194L189 206" stroke="#a45540" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="143" cy="45" r="4" fill="#edb348" /><circle cx="383" cy="45" r="4" fill="#edb348" />
      </>}
    </svg>
  );
}
