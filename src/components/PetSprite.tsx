/**
 * PetSprite — the visual representation of the desktop pet
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useDrag } from '../hooks/useDrag';
import { loadTheme, getSpriteUrl } from '../themes/ThemeLoader';
import type { PetState } from '../types';

function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

// ─── Default Theme ───────────────────────────────────────────────────────────
function DefaultPetSVG({ state, size }: { state: PetState; size: number }) {
  const bodyTransform = useMemo(() => {
    switch (state) {
      case 'walk_left': return 'scaleX(-1)';
      case 'excited': case 'celebrate': return 'translateY(-4px)';
      case 'sleep': return 'scaleY(0.9)';
      case 'drag': return 'rotate(-5deg)';
      default: return '';
    }
  }, [state]);
  const isActive = ['walk_left','walk_right','excited','celebrate','searching'].includes(state);
  const isSleeping = state === 'sleep';
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      style={{ transform: bodyTransform, transition: 'transform 0.3s ease', filter: isSleeping ? 'brightness(0.8)' : undefined }}>
      <ellipse cx="40" cy="48" rx="28" ry="24" fill="#6ee7b7" stroke="#34d399" strokeWidth="2">
        {isActive && <animate attributeName="ry" values="24;22;24" dur="0.4s" repeatCount="indefinite" />}
      </ellipse>
      <line x1="40" y1="24" x2="40" y2="12" stroke="#34d399" strokeWidth="2" />
      <circle cx="40" cy="10" r="3" fill="#fbbf24">
        {isActive && <animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite" />}
      </circle>
      {!isSleeping ? (
        <><circle cx="32" cy="44" r="4" fill="white" /><circle cx="48" cy="44" r="4" fill="white" />
        <circle cx="33" cy="44" r="2" fill="#1f2937" /><circle cx="49" cy="44" r="2" fill="#1f2937" /></>
      ) : (
        <><line x1="28" y1="44" x2="36" y2="44" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
        <line x1="44" y1="44" x2="52" y2="44" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
        <text x="56" y="30" fill="#94a3b8" fontSize="10" fontFamily="monospace">z</text>
        <text x="62" y="22" fill="#94a3b8" fontSize="8" fontFamily="monospace">z</text></>
      )}
      {state==='excited'||state==='celebrate' ? <ellipse cx="40" cy="56" rx="6" ry="4" fill="#1f2937" />
       : state==='sad' ? <path d="M 34 58 Q 40 54 46 58" fill="none" stroke="#1f2937" strokeWidth="1.5" />
       : !isSleeping ? <path d="M 34 56 Q 40 60 46 56" fill="none" stroke="#1f2937" strokeWidth="1.5" /> : null}
      <ellipse cx="30" cy="70" rx="8" ry="4" fill="#34d399" />
      <ellipse cx="50" cy="70" rx="8" ry="4" fill="#34d399" />
      {state==='searching' && <g>
        <circle cx="60" cy="20" r="8" fill="none" stroke="#fbbf24" strokeWidth="2">
          <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <text x="56" y="24" fill="#fbbf24" fontSize="12" fontFamily="monospace">?</text>
      </g>}
      {state==='matched' && <g>
        <text x="28" y="16" fill="#f472b6" fontSize="16">✨</text>
        <text x="48" y="10" fill="#fbbf24" fontSize="12">🎉</text>
      </g>}
      {state==='chatting' && <g>
        <circle cx="62" cy="30" r="6" fill="#3b82f6" opacity="0.8">
          <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="57" y="34" fill="white" fontSize="8" fontFamily="monospace">💬</text>
      </g>}
    </svg>
  );
}

// ─── Theme: Kanga 🦘 ─────────────────────────────────────────────────────────
function KangaPetSVG({ state, size }: { state: PetState; size: number }) {
  const isSleeping=state==='sleep', isWalking=state==='walk_left'||state==='walk_right';
  const isExcited=state==='excited'||state==='celebrate', isSad=state==='sad';
  const isSearching=state==='searching', isWaving=state==='wave', isSitting=state==='sit';
  const isDragging=state==='drag', isChatting=state==='chatting';
  const isThinking=state==='think', isMatched=state==='matched', flipX=state==='walk_left';
  const headY=isSleeping?44:isSitting?30:32;
  const mouthY=isSitting?43:45;
  const noseY=isSitting?37:39;
  const earY=isSitting?18:20;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={{
      transform: flipX?'scaleX(-1)':isDragging?'rotate(-8deg)':undefined,
      transition:'transform 0.2s ease',
      filter:isSleeping?'brightness(0.75)':undefined,
    }}>
      {isSleeping||isSitting
        ? <path d="M 24 68 Q 14 72 16 60 Q 18 50 26 54" fill="none" stroke="#c2773a" strokeWidth="5" strokeLinecap="round"/>
        : <ellipse cx="18" cy="62" rx="10" ry="6" fill="#c2773a" stroke="#a05a22" strokeWidth="1.5" transform="rotate(-20 18 62)">
            {isWalking && <animate attributeName="cy" values="62;58;62" dur="0.5s" repeatCount="indefinite"/>}
            {isExcited && <animate attributeName="cy" values="62;54;62" dur="0.3s" repeatCount="indefinite"/>}
          </ellipse>}
      {isSleeping
        ? <ellipse cx="40" cy="55" rx="22" ry="16" fill="#e8943a" stroke="#c2773a" strokeWidth="2"/>
        : <ellipse cx="40" cy="52" rx="18" ry="20" fill="#e8943a" stroke="#c2773a" strokeWidth="2">
            {isWalking && <animate attributeName="ry" values="20;18;20" dur="0.5s" repeatCount="indefinite"/>}
          </ellipse>}
      {!isSleeping && <path d="M 30 58 Q 40 66 50 58" fill="#d4722a" stroke="#c2773a" strokeWidth="1.5"/>}
      {!isSleeping && !isSitting && <>
        <line x1="28" y1="50" x2="20" y2={isSearching?42:isWaving?36:58} stroke="#c2773a" strokeWidth="4" strokeLinecap="round">
          {isWaving && <animate attributeName="y2" values="36;30;36" dur="0.4s" repeatCount="indefinite"/>}
        </line>
        <line x1="52" y1="50" x2="60" y2={isWaving?36:56} stroke="#c2773a" strokeWidth="4" strokeLinecap="round"/>
        {isSearching && <rect x="13" y="36" width="16" height="5" rx="2" fill="#c2773a"/>}
      </>}
      <ellipse cx="40" cy={headY} rx="16" ry="14" fill="#e8943a" stroke="#c2773a" strokeWidth="2">
        {isExcited && <animate attributeName="cy" values={`${headY};${headY-4};${headY}`} dur="0.3s" repeatCount="indefinite"/>}
      </ellipse>
      {isSleeping ? <>
        <ellipse cx="30" cy="40" rx="5" ry="8" fill="#e8943a" stroke="#c2773a" strokeWidth="1.5" transform="rotate(-60 30 40)"/>
        <ellipse cx="50" cy="40" rx="5" ry="8" fill="#e8943a" stroke="#c2773a" strokeWidth="1.5" transform="rotate(60 50 40)"/>
      </> : <>
        <ellipse cx="28" cy={earY} rx="6" ry="10" fill="#e8943a" stroke="#c2773a" strokeWidth="1.5" transform={`rotate(-15 28 ${earY})`}/>
        <ellipse cx="28" cy={earY} rx="3" ry="6" fill="#f4b07a" transform={`rotate(-15 28 ${earY})`}/>
        <ellipse cx="52" cy={earY} rx="6" ry="10" fill="#e8943a" stroke="#c2773a" strokeWidth="1.5" transform={`rotate(15 52 ${earY})`}/>
        <ellipse cx="52" cy={earY} rx="3" ry="6" fill="#f4b07a" transform={`rotate(15 52 ${earY})`}/>
      </>}
      {isSleeping ? <>
        <line x1="30" y1="44" x2="37" y2="44" stroke="#3a1a00" strokeWidth="2" strokeLinecap="round"/>
        <line x1="43" y1="44" x2="50" y2="44" stroke="#3a1a00" strokeWidth="2" strokeLinecap="round"/>
        <text x="54" y="36" fill="#c2773a" fontSize="9" fontFamily="sans-serif">z</text>
        <text x="60" y="28" fill="#c2773a" fontSize="7" fontFamily="sans-serif">z</text>
      </> : <>
        <circle cx="34" cy={headY} r="4" fill="white"/>
        <circle cx="46" cy={headY} r="4" fill="white"/>
        <circle cx="35" cy={headY} r="2" fill="#3a1a00"/>
        <circle cx="47" cy={headY} r="2" fill="#3a1a00"/>
        {isSad && <><path d={`M 31 ${headY-6} Q 34 ${headY-4} 37 ${headY-6}`} fill="none" stroke="#3a1a00" strokeWidth="1.5"/>
          <path d={`M 43 ${headY-6} Q 46 ${headY-4} 49 ${headY-6}`} fill="none" stroke="#3a1a00" strokeWidth="1.5"/></>}
        {isExcited && <><path d={`M 31 ${headY-5} Q 34 ${headY-7} 37 ${headY-5}`} fill="none" stroke="#3a1a00" strokeWidth="1.5"/>
          <path d={`M 43 ${headY-5} Q 46 ${headY-7} 49 ${headY-5}`} fill="none" stroke="#3a1a00" strokeWidth="1.5"/></>}
      </>}
      {!isSleeping && <ellipse cx="40" cy={noseY} rx="3" ry="2" fill="#3a1a00"/>}
      {!isSleeping && (isExcited
        ? <ellipse cx="40" cy={mouthY} rx="5" ry="3" fill="#3a1a00"/>
        : isSad ? <path d={`M 35 ${mouthY} Q 40 ${mouthY-3} 45 ${mouthY}`} fill="none" stroke="#3a1a00" strokeWidth="1.5"/>
        : <path d={`M 35 ${mouthY-2} Q 40 ${mouthY+2} 45 ${mouthY-2}`} fill="none" stroke="#3a1a00" strokeWidth="1.5"/>
      )}
      {!isSleeping && <>
        <ellipse cx="30" cy="70" rx="9" ry="5" fill="#c2773a" stroke="#a05a22" strokeWidth="1.5">
          {isWalking && <animate attributeName="cx" values="30;26;30" dur="0.5s" repeatCount="indefinite"/>}
        </ellipse>
        <ellipse cx="50" cy="70" rx="9" ry="5" fill="#c2773a" stroke="#a05a22" strokeWidth="1.5">
          {isWalking && <animate attributeName="cx" values="50;54;50" dur="0.5s" repeatCount="indefinite"/>}
        </ellipse>
      </>}
      {state==='celebrate' && <g>
        {([["12","10","#f472b6"],["20","6","#fbbf24"],["60","8","#34d399"],["68","14","#818cf8"]] as [string,string,string][]).map(
          ([cx,cy,fill],i) => <circle key={i} cx={cx} cy={cy} r="3" fill={fill}>
            <animate attributeName="cy" values={`${cy};${Number(cy)-8};${cy}`} dur={`${0.5+i*0.12}s`} repeatCount="indefinite"/>
          </circle>
        )}
      </g>}
      {isThinking && <g>
        <circle cx="58" cy="18" r="3" fill="#fde68a" stroke="#f59e0b" strokeWidth="1"/>
        <circle cx="64" cy="12" r="4" fill="#fde68a" stroke="#f59e0b" strokeWidth="1"/>
        <circle cx="70" cy="7" r="5" fill="#fde68a" stroke="#f59e0b" strokeWidth="1"/>
        <text x="67" y="10" fill="#92400e" fontSize="6" fontFamily="sans-serif">?</text>
      </g>}
      {isMatched && <g>
        <text x="5" y="18" fill="#f472b6" fontSize="14">✨</text>
        <text x="55" y="12" fill="#fbbf24" fontSize="11">⭐</text>
      </g>}
      {isChatting && <g>
        <rect x="50" y="8" width="26" height="16" rx="4" fill="white" stroke="#c2773a" strokeWidth="1.5"/>
        <path d="M 54 24 L 52 30 L 60 24" fill="white" stroke="#c2773a" strokeWidth="1.5" strokeLinejoin="round"/>
        <text x="53" y="20" fill="#c2773a" fontSize="8" fontFamily="sans-serif">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite"/>...
        </text>
      </g>}
    </svg>
  );
}

// ─── Theme: Pixel 👾 ──────────────────────────────────────────────────────────
function PixelPetSVG({ state, size }: { state: PetState; size: number }) {
  const P=5;
  const isSleeping=state==='sleep', isWalking=state==='walk_left'||state==='walk_right';
  const flipX=state==='walk_left', isExcited=state==='excited'||state==='celebrate';
  const isSad=state==='sad', isSearching=state==='searching', isWaving=state==='wave';
  const isSitting=state==='sit', isDragging=state==='drag', isChatting=state==='chatting';
  const isThinking=state==='think', isMatched=state==='matched';
  const D='#0f380f', M='#306230', L='#8bac0f', B='#9bbc0f', W='#e0f8d0';
  const px=(gx:number,gy:number,fill:string,key:string,w=1,h=1)=>(
    <rect key={key} x={gx*P} y={gy*P} width={P*w} height={P*h} fill={fill}/>
  );
  const bodyMap:number[][]=isSitting
    ?[[0,1,1,1,1,1,1,0],[1,2,2,2,2,2,2,1],[1,2,2,2,2,2,2,1],[1,2,2,2,2,2,2,1],[1,2,2,2,2,2,2,1],[0,1,1,1,1,1,1,0]]
    :isSleeping
    ?[[0,0,1,1,1,1,0,0],[0,1,2,2,2,2,1,0],[1,2,2,2,2,2,2,1],[1,2,2,2,2,2,2,1],[0,1,2,2,2,2,1,0],[0,0,1,1,1,1,0,0]]
    :[[0,0,1,1,1,1,0,0],[0,1,2,2,2,2,1,0],[1,2,2,2,2,2,2,1],[1,2,2,2,2,2,2,1],[1,2,2,2,2,2,2,1],[0,1,1,1,1,1,1,0]];
  const headMap=[[0,1,1,1,1,0],[1,2,2,2,2,1],[1,2,2,2,2,1],[1,2,2,2,2,1],[0,1,1,1,1,0]];
  const bOX=3, bOY=isSitting?6:isSleeping?5:5;
  const hOX=4, hOY=isSleeping?4:1;
  const eyeRow=hOY+2, lEye=hOX+1, rEye=hOX+4;
  const footRow=bOY+bodyMap.length;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80"
      style={{ transform:flipX?'scaleX(-1)':isDragging?'rotate(-5deg)':undefined, imageRendering:'pixelated' }}
      shapeRendering="crispEdges">
      {!isSleeping && !isSitting && <>
        {px(7,0,M,'ant1')}{px(7,1,M,'ant2')}
        <rect x={7*P-2} y={0} width={P+4} height={P} fill={B}>
          {isExcited && <animate attributeName="fill" values={`${B};${W};${B}`} dur="0.4s" repeatCount="indefinite"/>}
        </rect>
      </>}
      {headMap.map((row,ry)=>row.map((v,rx)=>v?px(hOX+rx,hOY+ry,v===2?L:M,`h${rx}${ry}`):null))}
      {isSleeping ? <>
        <rect x={lEye*P} y={eyeRow*P+2} width={P*2} height={2} fill={D}/>
        <rect x={rEye*P} y={eyeRow*P+2} width={P*2} height={2} fill={D}/>
        <text x="54" y="20" fill={M} fontSize="9" fontFamily="monospace">z</text>
        <text x="60" y="12" fill={M} fontSize="7" fontFamily="monospace">z</text>
      </> : <>
        {px(lEye,eyeRow,D,'el')}{px(rEye,eyeRow,D,'er')}
        {isExcited && <>{px(lEye-1,eyeRow-1,W,'elg')}{px(rEye-1,eyeRow-1,W,'erg')}</>}
      </>}
      {!isSleeping && (isSad
        ? <>{px(hOX+1,hOY+3,M,'msl')}{px(hOX+4,hOY+3,M,'msr')}</>
        : isExcited ? px(hOX+2,hOY+3,D,'mx',2)
        : px(hOX+2,hOY+3,M,'m',2)
      )}
      {bodyMap.map((row,ry)=>row.map((v,rx)=>v?px(bOX+rx,bOY+ry,v===2?L:M,`b${rx}${ry}`):null))}
      {!isSleeping && <>
        <rect x={(bOX-1)*P} y={(bOY+1)*P} width={P} height={P*2} fill={M}>
          {isWaving && <animate attributeName="y" values={`${(bOY+1)*P};${(bOY-1)*P};${(bOY+1)*P}`} dur="0.4s" repeatCount="indefinite"/>}
        </rect>
        <rect x={(bOX+8)*P} y={(bOY+1)*P} width={P} height={P*2} fill={M}/>
      </>}
      {!isSleeping && <>
        <rect x={(bOX+1)*P} y={footRow*P} width={P*2} height={P} fill={M}>
          {isWalking && <animate attributeName="y" values={`${footRow*P};${(footRow-1)*P};${footRow*P}`} dur="0.5s" repeatCount="indefinite"/>}
        </rect>
        <rect x={(bOX+5)*P} y={footRow*P} width={P*2} height={P} fill={M}>
          {isWalking && <animate attributeName="y" values={`${footRow*P};${(footRow+1)*P};${footRow*P}`} dur="0.5s" repeatCount="indefinite"/>}
        </rect>
      </>}
      {isSearching && <g>
        <rect x={58} y={8} width={14} height={14} fill="none" stroke={B} strokeWidth="2">
          <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/>
        </rect>
        <rect x={69} y={20} width={P} height={P} fill={B}/>
        <text x="61" y="20" fill={B} fontSize="7" fontFamily="monospace">?</text>
      </g>}
      {state==='celebrate' && <g>
        {([[1,1,L],[3,0,B],[13,2,W],[1,3,M]] as [number,number,string][]).map(([gx,gy,fill],i)=>(
          <rect key={i} x={gx*P} y={gy*P} width={P} height={P} fill={fill}>
            <animate attributeName="y" values={`${gy*P};${(gy+3)*P};${gy*P}`} dur={`${0.4+i*0.1}s`} repeatCount="indefinite"/>
          </rect>
        ))}
      </g>}
      {isThinking && <g>
        {px(12,1,M,'tb1')}{px(13,0,L,'tb2')}{px(14,0,B,'tb3')}
        <text x="70" y="8" fill={B} fontSize="6" fontFamily="monospace">?</text>
      </g>}
      {isMatched && <g>
        <rect x={1*P} y={0} width={P*2} height={P*2} fill={B}>
          <animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite"/>
        </rect>
        <rect x={12*P} y={P} width={P*2} height={P*2} fill={L}>
          <animate attributeName="opacity" values="0;1;0" dur="0.8s" repeatCount="indefinite"/>
        </rect>
      </g>}
      {isChatting && <g>
        <rect x={52} y={6} width={24} height={14} fill={M}/>
        <rect x={54} y={8} width={20} height={10} fill={D}/>
        <rect x={54} y={20} width={P*2} height={P} fill={M}/>
        <text x="56" y="16" fill={B} fontSize="7" fontFamily="monospace">
          <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>...
        </text>
      </g>}
    </svg>
  );
}

// ─── Theme: Neko 🐱 ───────────────────────────────────────────────────────────
function NekoPetSVG({ state, size }: { state: PetState; size: number }) {
  const isSleeping=state==='sleep', isWalking=state==='walk_left'||state==='walk_right';
  const isExcited=state==='excited'||state==='celebrate', isSad=state==='sad';
  const isSearching=state==='searching', isWaving=state==='wave', isSitting=state==='sit';
  const isDragging=state==='drag', isChatting=state==='chatting';
  const isThinking=state==='think', isMatched=state==='matched', flipX=state==='walk_left';
  const OR='#f97316', LO='#fdba74', WH='#fff7ed', DK='#1c0a00', GR='#6b7280';
  const headY=isSleeping?52:isSitting?30:32;
  const bodyY=isSleeping?58:isSitting?50:52;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={{
      transform:flipX?'scaleX(-1)':isDragging?'rotate(-6deg)':isExcited?'translateY(-3px)':undefined,
      transition:'transform 0.2s ease',
      filter:isSleeping?'brightness(0.7)':undefined,
    }}>
      {/* Tail */}
      {isSleeping
        ? <path d="M 52 62 Q 62 58 66 50 Q 70 42 58 44 Q 46 46 50 54" fill="none" stroke={OR} strokeWidth="5" strokeLinecap="round"/>
        : isExcited
        ? <path d={`M 56 ${bodyY+10} Q 68 ${bodyY} 72 ${bodyY-10} Q 74 ${bodyY-18} 68 ${bodyY-14}`} fill="none" stroke={OR} strokeWidth="5" strokeLinecap="round">
            <animate attributeName="d" values={`M 56 ${bodyY+10} Q 68 ${bodyY} 72 ${bodyY-10} Q 74 ${bodyY-18} 68 ${bodyY-14};M 56 ${bodyY+10} Q 70 ${bodyY-2} 74 ${bodyY-12} Q 76 ${bodyY-20} 70 ${bodyY-16};M 56 ${bodyY+10} Q 68 ${bodyY} 72 ${bodyY-10} Q 74 ${bodyY-18} 68 ${bodyY-14}`} dur="0.5s" repeatCount="indefinite"/>
          </path>
        : <path d={`M 56 ${bodyY+10} Q 65 ${bodyY+5} 68 ${bodyY-5} Q 70 ${bodyY-14} 65 ${bodyY-10}`} fill="none" stroke={OR} strokeWidth="4" strokeLinecap="round">
            {isWalking && <animate attributeName="d" values={`M 56 ${bodyY+10} Q 65 ${bodyY+5} 68 ${bodyY-5} Q 70 ${bodyY-14} 65 ${bodyY-10};M 56 ${bodyY+10} Q 66 ${bodyY+8} 72 ${bodyY} Q 76 ${bodyY-10} 70 ${bodyY-8};M 56 ${bodyY+10} Q 65 ${bodyY+5} 68 ${bodyY-5} Q 70 ${bodyY-14} 65 ${bodyY-10}`} dur="0.5s" repeatCount="indefinite"/>}
          </path>
      }
      {/* Body */}
      {isSleeping
        ? <ellipse cx="44" cy={bodyY} rx="20" ry="14" fill={OR} stroke={LO} strokeWidth="1.5"/>
        : <ellipse cx="40" cy={bodyY} rx="18" ry={isSitting?16:20} fill={OR} stroke={LO} strokeWidth="1.5">
            {isExcited && <animate attributeName="ry" values={`${isSitting?16:20};${isSitting?18:22};${isSitting?16:20}`} dur="0.4s" repeatCount="indefinite"/>}
          </ellipse>}
      {/* Belly patch */}
      {!isSleeping && <ellipse cx="40" cy={bodyY+2} rx="10" ry={isSitting?10:12} fill={WH}/>}
      {/* Front paws */}
      {!isSleeping && !isSitting && <>
        <line x1="30" y1={bodyY+10} x2={isWaving?20:26} y2={isWaving?bodyY-2:bodyY+18} stroke={OR} strokeWidth="4" strokeLinecap="round">
          {isWaving && <animate attributeName="x2" values="20;16;20" dur="0.4s" repeatCount="indefinite"/>}
          {isWaving && <animate attributeName="y2" values={`${bodyY-2};${bodyY-6};${bodyY-2}`} dur="0.4s" repeatCount="indefinite"/>}
        </line>
        <line x1="50" y1={bodyY+10} x2="54" y2={bodyY+18} stroke={OR} strokeWidth="4" strokeLinecap="round"/>
      </>}
      {/* Head */}
      <ellipse cx="40" cy={headY} rx="18" ry="16" fill={OR} stroke={LO} strokeWidth="1.5"/>
      <ellipse cx="40" cy={headY+2} rx="10" ry="9" fill={WH}/>
      {/* Ears */}
      {isSleeping ? <>
        <polygon points={`30,${headY-10} 22,${headY-22} 38,${headY-14}`} fill={OR} stroke={LO} strokeWidth="1"/>
        <polygon points={`50,${headY-10} 58,${headY-22} 42,${headY-14}`} fill={OR} stroke={LO} strokeWidth="1"/>
      </> : <>
        <polygon points={`30,${headY-12} 22,${headY-26} 40,${headY-16}`} fill={OR} stroke={LO} strokeWidth="1"/>
        <polygon points={`28,${headY-14} 23,${headY-24} 37,${headY-16}`} fill="#fca5a5"/>
        <polygon points={`50,${headY-12} 58,${headY-26} 40,${headY-16}`} fill={OR} stroke={LO} strokeWidth="1"/>
        <polygon points={`52,${headY-14} 57,${headY-24} 43,${headY-16}`} fill="#fca5a5"/>
      </>}
      {/* Eyes */}
      {isSleeping ? <>
        <path d={`M 32 ${headY-2} Q 36 ${headY-6} 40 ${headY-2}`} fill="none" stroke={DK} strokeWidth="2"/>
        <path d={`M 40 ${headY-2} Q 44 ${headY-6} 48 ${headY-2}`} fill="none" stroke={DK} strokeWidth="2"/>
        <text x="54" y={headY-10} fill={OR} fontSize="9" fontFamily="sans-serif">z</text>
        <text x="60" y={headY-18} fill={OR} fontSize="7" fontFamily="sans-serif">z</text>
      </> : <>
        <ellipse cx="34" cy={headY-2} rx="5" ry={isSad?3:isExcited?5:4} fill={WH}/>
        <ellipse cx="46" cy={headY-2} rx="5" ry={isSad?3:isExcited?5:4} fill={WH}/>
        <ellipse cx="34" cy={headY-2} rx="3" ry={isSad?2:isExcited?4:3} fill={DK}/>
        <ellipse cx="46" cy={headY-2} rx="3" ry={isSad?2:isExcited?4:3} fill={DK}/>
        <circle cx="35" cy={headY-3} r="1" fill="white"/>
        <circle cx="47" cy={headY-3} r="1" fill="white"/>
      </>}
      {/* Nose */}
      <polygon points={`40,${headY+4} 38,${headY+7} 42,${headY+7}`} fill="#f43f5e"/>
      {/* Mouth */}
      {!isSleeping && <>
        <path d={`M 38 ${headY+8} Q 40 ${headY+10} 42 ${headY+8}`} fill="none" stroke={DK} strokeWidth="1.5"/>
        {isSad && <path d={`M 35 ${headY+10} Q 40 ${headY+7} 45 ${headY+10}`} fill="none" stroke={DK} strokeWidth="1.5"/>}
        {isExcited && <path d={`M 35 ${headY+10} Q 40 ${headY+14} 45 ${headY+10}`} fill="none" stroke={DK} strokeWidth="1.5"/>}
      </>}
      {/* Whiskers */}
      {!isSleeping && <>
        <line x1="18" y1={headY+5} x2="35" y2={headY+6} stroke={GR} strokeWidth="1" opacity="0.8"/>
        <line x1="18" y1={headY+8} x2="35" y2={headY+8} stroke={GR} strokeWidth="1" opacity="0.8"/>
        <line x1="45" y1={headY+6} x2="62" y2={headY+5} stroke={GR} strokeWidth="1" opacity="0.8"/>
        <line x1="45" y1={headY+8} x2="62" y2={headY+8} stroke={GR} strokeWidth="1" opacity="0.8"/>
      </>}
      {/* Hind paws */}
      {!isSleeping && <>
        <ellipse cx="30" cy="72" rx="8" ry="5" fill={OR}>
          {isWalking && <animate attributeName="cy" values="72;68;72" dur="0.5s" repeatCount="indefinite"/>}
        </ellipse>
        <ellipse cx="50" cy="72" rx="8" ry="5" fill={OR}>
          {isWalking && <animate attributeName="cy" values="72;76;72" dur="0.5s" repeatCount="indefinite"/>}
        </ellipse>
      </>}
      {/* Think: head tilt + ? */}
      {isThinking && <>
        <text x="56" y={headY-20} fill={OR} fontSize="16" fontFamily="sans-serif" fontWeight="bold">?</text>
      </>}
      {/* Matched sparkles */}
      {isMatched && <g>
        <text x="4"  y="16" fill="#f472b6" fontSize="14">✨</text>
        <text x="55" y="10" fill={LO} fontSize="12">⭐</text>
      </g>}
      {/* Chatting bubble */}
      {isChatting && <g>
        <rect x="50" y="6" width="26" height="16" rx="6" fill={WH} stroke={OR} strokeWidth="1.5"/>
        <path d="M 54 22 L 52 28 L 60 22" fill={WH} stroke={OR} strokeWidth="1.5" strokeLinejoin="round"/>
        <text x="53" y="18" fill={OR} fontSize="8" fontFamily="sans-serif">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite"/>...
        </text>
      </g>}
      {/* Searching */}
      {isSearching && <g>
        <circle cx="62" cy="20" r="8" fill="none" stroke={LO} strokeWidth="2">
          <animate attributeName="r" values="6;10;6" dur="1.2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite"/>
        </circle>
        <text x="57" y="24" fill={LO} fontSize="10" fontFamily="monospace">?</text>
      </g>}
      {/* Celebrate confetti */}
      {state==='celebrate' && <g>
        {([["10","8","#f472b6"],["22","4","#fbbf24"],["58","6","#34d399"],["70","12","#c084fc"]] as [string,string,string][]).map(
          ([cx,cy,fill],i) => <circle key={i} cx={cx} cy={cy} r="3" fill={fill}>
            <animate attributeName="cy" values={`${cy};${Number(cy)-10};${cy}`} dur={`${0.45+i*0.1}s`} repeatCount="indefinite"/>
          </circle>
        )}
      </g>}
    </svg>
  );
}

// ─── Theme: Bot 🤖 ───────────────────────────────────────────────────────────
function BotPetSVG({ state, size }: { state: PetState; size: number }) {
  const isSleeping=state==='sleep', isWalking=state==='walk_left'||state==='walk_right';
  const isExcited=state==='excited'||state==='celebrate', isSad=state==='sad';
  const isSearching=state==='searching', isWaving=state==='wave', isSitting=state==='sit';
  const isDragging=state==='drag', isChatting=state==='chatting';
  const isThinking=state==='think', isMatched=state==='matched', flipX=state==='walk_left';
  const SL='#e2e8f0', SM='#94a3b8', SD='#334155', SDD='#0f172a';
  const GL='#38bdf8', GD='#0284c7', RED='#f43f5e';
  const bodyY=isSitting?48:50;
  const headY=isSitting?26:28;
  const ledOn=!isSleeping;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={{
      transform:flipX?'scaleX(-1)':isDragging?'rotate(-5deg)':undefined,
      transition:'transform 0.2s ease',
      filter:isSleeping?'brightness(0.5) saturate(0.3)':undefined,
    }}>
      {/* Antenna array (3 antennae) */}
      {!isSleeping && !isSitting && <>
        <line x1="33" y1={headY-8} x2="33" y2={headY-18} stroke={SM} strokeWidth="2"/>
        <circle cx="33" cy={headY-20} r="3" fill={GL}>
          {isExcited && <animate attributeName="r" values="3;5;3" dur="0.3s" repeatCount="indefinite"/>}
          {!isExcited && ledOn && <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>}
        </circle>
        <line x1="40" y1={headY-8} x2="40" y2={headY-22} stroke={SM} strokeWidth="2"/>
        <circle cx="40" cy={headY-24} r="4" fill={GL}>
          {ledOn && <animate attributeName="fill" values={`${GL};${GD};${GL}`} dur="1.5s" repeatCount="indefinite"/>}
        </circle>
        <line x1="47" y1={headY-8} x2="47" y2={headY-18} stroke={SM} strokeWidth="2"/>
        <circle cx="47" cy={headY-20} r="3" fill={GD}>
          {isExcited && <animate attributeName="r" values="3;5;3" dur="0.3s" repeatCount="indefinite" begin="0.1s"/>}
          {!isExcited && ledOn && <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>}
        </circle>
      </>}
      {/* Body: rectangle with rounded corners */}
      <rect x="22" y={bodyY-16} width="36" height={isSitting?28:32} rx="4" fill={SD} stroke={SM} strokeWidth="2"/>
      {/* LED panel chest */}
      <rect x="27" y={bodyY-10} width="26" height="14" rx="2" fill={SDD} stroke={SM} strokeWidth="1"/>
      {isSleeping ? <>
        <text x="29" y={bodyY} fill={SM} fontSize="7" fontFamily="monospace">STBY</text>
      </> : isChatting ? <>
        <text x="28" y={bodyY} fill={GL} fontSize="6" fontFamily="monospace">
          <animate attributeName="x" values="28;-10;28" dur="2s" repeatCount="indefinite"/>
          HELLO WORLD
        </text>
      </> : <>
        <rect x="29" y={bodyY-8} width="6" height="4" rx="1" fill={ledOn?GL:SDD}>
          {ledOn && <animate attributeName="fill" values={`${GL};${GD};${GL}`} dur="1s" repeatCount="indefinite"/>}
        </rect>
        <rect x="37" y={bodyY-8} width="6" height="4" rx="1" fill={ledOn?RED:SDD}>
          {ledOn && <animate attributeName="opacity" values="1;0.3;1" dur="0.7s" repeatCount="indefinite"/>}
        </rect>
        <rect x="29" y={bodyY-2} width="22" height="3" rx="1" fill={SDD}/>
        {ledOn && Array.from({length:4}).map((_,i)=>(
          <rect key={i} x={29+i*6} y={bodyY-2} width="4" height="3" rx="1" fill={GL}>
            <animate attributeName="opacity" values={`${i%2===0?1:0};${i%2===0?0:1};${i%2===0?1:0}`} dur={`${0.5+i*0.15}s`} repeatCount="indefinite"/>
          </rect>
        ))}
      </>}
      {/* Arms: mechanical rods */}
      {!isSleeping && <>
        <rect x="12" y={bodyY-10} width="10" height="5" rx="2" fill={SD} stroke={SM} strokeWidth="1.5">
          {isWaving && <animate attributeName="y" values={`${bodyY-10};${bodyY-18};${bodyY-10}`} dur="0.4s" repeatCount="indefinite"/>}
        </rect>
        <rect x="58" y={bodyY-10} width="10" height="5" rx="2" fill={SD} stroke={SM} strokeWidth="1.5"/>
        {/* Claws */}
        <rect x="10" y={bodyY-10} width="4" height="3" rx="1" fill={SL}>
          {isWaving && <animate attributeName="y" values={`${bodyY-10};${bodyY-18};${bodyY-10}`} dur="0.4s" repeatCount="indefinite"/>}
        </rect>
        <rect x="66" y={bodyY-10} width="4" height="3" rx="1" fill={SL}/>
      </>}
      {/* Head: square */}
      <rect x="22" y={headY-14} width="36" height="30" rx="3" fill={SD} stroke={SM} strokeWidth="2"/>
      {/* Eyes: LED rectangles */}
      {isSleeping ? <>
        <rect x="28" y={headY-2} width="10" height="3" rx="1" fill={SM} opacity="0.3"/>
        <rect x="42" y={headY-2} width="10" height="3" rx="1" fill={SM} opacity="0.3"/>
      </> : <>
        <rect x="28" y={headY-4} width="10" height="8" rx="1" fill={SDD}/>
        <rect x="42" y={headY-4} width="10" height="8" rx="1" fill={SDD}/>
        <rect x="29" y={headY-3} width="8" height="6" rx="1" fill={isExcited?'#fbbf24':isSad?'#ef4444':GL}>
          {ledOn && !isSad && <animate attributeName="fill" values={isExcited?`${'#fbbf24'};${GL};${'#fbbf24'}`:`${GL};${GD};${GL}`} dur={isExcited?"0.3s":"1.5s"} repeatCount="indefinite"/>}
        </rect>
        <rect x="43" y={headY-3} width="8" height="6" rx="1" fill={isExcited?'#fbbf24':isSad?'#ef4444':GL}>
          {ledOn && !isSad && <animate attributeName="fill" values={isExcited?`${'#fbbf24'};${GL};${'#fbbf24'}`:`${GL};${GD};${GL}`} dur={isExcited?"0.3s":"1.5s"} repeatCount="indefinite" begin="0.2s"/>}
        </rect>
      </>}
      {/* Mouth: LED bar */}
      {!isSleeping && <>
        <rect x="30" y={headY+6} width="20" height="4" rx="1" fill={SDD}/>
        {isExcited
          ? <rect x="30" y={headY+7} width="20" height="3" rx="1" fill="#fbbf24">
              <animate attributeName="width" values="20;16;20" dur="0.3s" repeatCount="indefinite"/>
            </rect>
          : isSad
          ? <rect x="30" y={headY+8} width="20" height="2" rx="1" fill={RED}/>
          : <rect x="32" y={headY+7} width="16" height="2" rx="1" fill={GL}>
              <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>
            </rect>
        }
      </>}
      {/* Legs */}
      {!isSleeping && <>
        <rect x="27" y={bodyY+16} width="10" height="8" rx="2" fill={SD} stroke={SM} strokeWidth="1.5">
          {isWalking && <animate attributeName="y" values={`${bodyY+16};${bodyY+12};${bodyY+16}`} dur="0.5s" repeatCount="indefinite"/>}
        </rect>
        <rect x="43" y={bodyY+16} width="10" height="8" rx="2" fill={SD} stroke={SM} strokeWidth="1.5">
          {isWalking && <animate attributeName="y" values={`${bodyY+16};${bodyY+20};${bodyY+16}`} dur="0.5s" repeatCount="indefinite"/>}
        </rect>
        {/* Feet */}
        <rect x="25" y={bodyY+22} width="14" height="5" rx="2" fill={SM}>
          {isWalking && <animate attributeName="y" values={`${bodyY+22};${bodyY+18};${bodyY+22}`} dur="0.5s" repeatCount="indefinite"/>}
        </rect>
        <rect x="41" y={bodyY+22} width="14" height="5" rx="2" fill={SM}>
          {isWalking && <animate attributeName="y" values={`${bodyY+22};${bodyY+26};${bodyY+22}`} dur="0.5s" repeatCount="indefinite"/>}
        </rect>
      </>}
      {/* Searching: radar sweep */}
      {isSearching && <g>
        <circle cx="62" cy="18" r="10" fill="none" stroke={GL} strokeWidth="1.5" opacity="0.5"/>
        <circle cx="62" cy="18" r="7"  fill="none" stroke={GL} strokeWidth="1" opacity="0.3"/>
        <line x1="62" y1="18" x2="72" y2="18" stroke={GL} strokeWidth="1.5">
          <animateTransform attributeName="transform" type="rotate" values="0 62 18;360 62 18" dur="1.5s" repeatCount="indefinite"/>
        </line>
        <circle cx="68" cy="14" r="2" fill={GL}>
          <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      </g>}
      {/* Think bubble */}
      {isThinking && <g>
        <circle cx="58" cy="16" r="3" fill={SDD} stroke={GL} strokeWidth="1"/>
        <circle cx="64" cy="10" r="4" fill={SDD} stroke={GL} strokeWidth="1"/>
        <circle cx="70" cy="5"  r="5" fill={SDD} stroke={GL} strokeWidth="1"/>
        <text x="67" y="8" fill={GL} fontSize="6" fontFamily="monospace">?</text>
      </g>}
      {/* Matched */}
      {isMatched && <g>
        <text x="4"  y="16" fill={GL} fontSize="14">⚡</text>
        <text x="56" y="10" fill="#fbbf24" fontSize="12">★</text>
      </g>}
      {/* Celebrate */}
      {state==='celebrate' && <g>
        {([[8,6,GL],[16,3,"#fbbf24"],[62,5,RED],[70,10,SL]] as [number,number,string][]).map(
          ([cx,cy,fill],i) => <circle key={i} cx={cx} cy={cy} r="3" fill={fill}>
            <animate attributeName="cy" values={`${cy};${cy-10};${cy}`} dur={`${0.4+i*0.1}s`} repeatCount="indefinite"/>
          </circle>
        )}
      </g>}
    </svg>
  );
}

// ─── Main PetSprite Component ────────────────────────────────────────────────

export function PetSprite() {
  const petState = useAppStore((s) => s.petState);
  const position = useAppStore((s) => s.position);
  const settings = useAppStore((s) => s.settings);
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useDrag();

  const isNearRef = useRef(false);
  const lastMouseNearTime = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const tauriMode = !!(window as any).__TAURI_INTERNALS__;
      let petCenterX: number;
      let petCenterY: number;
      const petSize = 120;
      if (tauriMode) {
        petCenterX = window.innerWidth / 2;
        petCenterY = window.innerHeight / 2;
      } else {
        const pos = useAppStore.getState().position;
        petCenterX = pos.x + petSize / 2;
        petCenterY = pos.y + petSize / 2;
      }
      const dx = e.clientX - petCenterX;
      const dy = e.clientY - petCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 100) {
        const now = Date.now();
        if (!isNearRef.current) { isNearRef.current = true; }
        if (now - lastMouseNearTime.current > 2000) {
          lastMouseNearTime.current = now;
          window.dispatchEvent(new CustomEvent('tinker-hook', {
            detail: { event: 'mouse_near', distance },
          }));
        }
      } else if (distance > 150 && isNearRef.current) {
        isNearRef.current = false;
        window.dispatchEvent(new CustomEvent('tinker-hook', {
          detail: { event: 'mouse_away', distance },
        }));
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const size = 120;
  const tauriMode = isTauri();
  const style: React.CSSProperties = tauriMode
    ? {
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: size, height: size, cursor: 'grab', zIndex: 9999,
        animation: petState === 'idle'
          ? `bounce ${1.5 / settings.animation.speed}s ease-in-out infinite` : undefined,
      }
    : {
        position: 'fixed', left: position.x, top: position.y,
        width: size, height: size, cursor: 'grab', zIndex: 9999,
        animation: petState === 'idle'
          ? `bounce ${1.5 / settings.animation.speed}s ease-in-out infinite` : undefined,
      };

  const activeTheme = settings.activeTheme;
  const theme = useMemo(() => loadTheme(activeTheme), [activeTheme]);
  const spriteUrl = useMemo(() => getSpriteUrl(theme, petState), [theme, petState]);

  // Select the correct built-in SVG based on active theme
  const renderBuiltinSVG = () => {
    switch (activeTheme) {
      case 'kanga': return <KangaPetSVG state={petState} size={size} />;
      case 'pixel': return <PixelPetSVG state={petState} size={size} />;
      case 'neko':  return <NekoPetSVG  state={petState} size={size} />;
      case 'bot':   return <BotPetSVG   state={petState} size={size} />;
      default:      return <DefaultPetSVG state={petState} size={size} />;
    }
  };

  return (
    <div
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {spriteUrl ? (
        <img src={spriteUrl} alt={petState} width={size} height={size}
          style={{ objectFit: 'contain', display: 'block' }} />
      ) : (
        renderBuiltinSVG()
      )}
    </div>
  );
}
