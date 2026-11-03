// The map: pan/zoom surface with frames, arrows (SVG), tunnel labels and boxes.
import { Fragment } from 'react';
import { css, iv, list, val, str } from './dc.js';

export default function Canvas({ v }) {
  return (
    <div ref={v.surfRef} onPointerDown={v.onSurfaceDown} onDoubleClick={v.onSurfaceDblClick} style={css(`position:absolute;inset:0;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;cursor:${str(v.surfCursor)}`)}>
      {" "}
      <div ref={v.worldRef} style={css(`position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;transform:${str(v.viewTransform)}`)}>
        {" "}
        {v.showGrid ? (
          <>
            {" "}
            <div style={{ position: "absolute", left: "-5816px", top: "-5643px", width: "12000px", height: "12000px", backgroundImage: "radial-gradient(#d3d5df 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
            {" "}
          </>
        ) : null}
        {" "}
        {list(v.frames).map((f, $i) => (
          <Fragment key={$i}>
            {" "}
            <div onPointerDown={f?.onBodyDown} style={css(`position:absolute;box-sizing:border-box;border-radius:14px;pointer-events:auto;${str(f?.dyn)}`)}>
              {" "}
              <div onPointerDown={f?.onDown} onDoubleClick={v.stop} title="Drag to move the frame (Shift: move its boxes too)" style={{ position: "absolute", left: "0", top: "0", right: "0", height: "30px", pointerEvents: "auto", cursor: "move", borderRadius: "14px 14px 0 0" }} />
              {" "}
              {f?.hasName ? (
                <>
                  {" "}
                  <div onPointerDown={f?.onDown} style={css(`position:absolute;left:14px;top:8px;max-width:calc(100% - 28px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600;pointer-events:auto;cursor:move;${str(f?.inkDyn)}`)}>
                    {iv(f?.nameText)}
                  </div>
                  {" "}
                </>
              ) : null}
              {" "}
              {f?.sel ? (
                <>
                  {" "}
                  <input value={val(f?.label)} onChange={f?.onLabel} onKeyDown={f?.onLabelKey} onPointerDown={v.stop} onDoubleClick={v.stop} placeholder="Name this frame" size={f?.labelSize} style={css(`position:absolute;left:10px;top:4px;max-width:calc(100% - 24px);box-sizing:border-box;border:1px dashed transparent;border-radius:6px;outline:none;background:transparent;font:inherit;font-size:14px;font-weight:600;padding:3px 4px;pointer-events:auto;cursor:text;${str(f?.inputDyn)}`)} className="scp6" />
                  {" "}
                  <div onPointerDown={v.stop} onDoubleClick={v.stop} style={css(`position:absolute;left:0;bottom:100%;margin-bottom:10px;display:flex;align-items:center;gap:6px;background:#fcfcfd;border-radius:10px;padding:5px 6px;box-shadow:0 4px 14px rgba(42,39,36,.1);pointer-events:auto;white-space:nowrap;${str(f?.barDyn)}`)}>
                    {list(f?.swatches).map((w, $i) => (
                      <Fragment key={$i}>
                        <button onClick={w?.onPick} title={w?.key} style={css(`width:20px;height:20px;border-radius:6px;padding:0;cursor:pointer;box-sizing:border-box;${str(w?.dyn)}`)} />
                      </Fragment>
                    ))}
                    <button onClick={f?.onDelete} title="Delete frame (boxes stay)" style={{ border: "none", background: "transparent", color: "#a15448", fontSize: "16px", width: "26px", height: "26px", borderRadius: "6px", cursor: "pointer" }} className="scp7">
                      ×
                    </button>
                  </div>
                  {" "}
                  <div onPointerDown={f?.onResize} title="Drag to resize" style={{ position: "absolute", right: "-7px", bottom: "-7px", width: "14px", height: "14px", borderRadius: "4px", background: "#fcfcfd", border: "1.5px solid #7e8091", pointerEvents: "auto", cursor: "nwse-resize" }} />
                  {" "}
                </>
              ) : null}
              {" "}
            </div>
            {" "}
          </Fragment>
        ))}
        {" "}
        <svg style={{ position: "absolute", left: "0", top: "0", width: "1px", height: "1px", overflow: "visible", pointerEvents: "none" }}>
          {list(v.edges).map((e, $i) => (
            <Fragment key={$i}>
              <g opacity={e?.opacity}>
                <path d={e?.d} fill="none" stroke={e?.color} strokeWidth={e?.w} strokeDasharray={e?.dash} strokeLinecap="round" />
                <polygon points={e?.head} fill={e?.color} />
                {e?.showOrigin ? (
                  <circle cx={e?.ox} cy={e?.oy} r="3.6" fill="#fcfcfd" stroke={e?.color} strokeWidth="1.8" />
                ) : null}
                {e?.both ? (
                  <polygon points={e?.tail} fill={e?.color} />
                ) : null}
                {e?.showGhost ? (
                  <path d={e?.ghostD} fill="none" stroke={e?.color} strokeWidth="1.4" strokeDasharray="2 7" strokeLinecap="round" opacity="0.6" />
                ) : null}
                {e?.tunnelVis ? (
                  <>
                    <path d={e?.fadeD} fill="none" stroke={e?.color} strokeWidth="1.8" strokeDasharray="2.5 4" strokeLinecap="round" opacity="0.75" />
                    <g onPointerDown={e?.mA?.go} style={{ pointerEvents: "all", cursor: "pointer" }}>
                      <title>
                        Go to the other end
                      </title>
                      <circle cx={e?.mA?.x} cy={e?.mA?.y} r="5.5" fill="#f1f2f6" stroke={e?.color} strokeWidth="1.6" />
                      <circle cx={e?.mA?.x} cy={e?.mA?.y} r="2.2" fill={e?.color} />
                    </g>
                    <g onPointerDown={e?.mB?.go} style={{ pointerEvents: "all", cursor: "pointer" }}>
                      <title>
                        Go to the other end
                      </title>
                      <circle cx={e?.mB?.x} cy={e?.mB?.y} r="5.5" fill="#f1f2f6" stroke={e?.color} strokeWidth="1.6" />
                      <circle cx={e?.mB?.x} cy={e?.mB?.y} r="2.2" fill={e?.color} />
                    </g>
                  </>
                ) : null}
                <path d={e?.d} fill="none" stroke="transparent" strokeWidth={e?.hitW} onPointerDown={e?.onSelect} style={{ pointerEvents: "stroke", cursor: "pointer" }} />
                {e?.showNoteDot ? (
                  <g onPointerDown={e?.onSelect} style={{ pointerEvents: "all", cursor: "pointer" }}>
                    <circle cx={e?.midX} cy={e?.midY} r="8" fill="#fcfcfd" stroke={e?.color} strokeWidth="1.5" />
                    <circle cx={e?.midX} cy={e?.midY} r="2.5" fill={e?.color} />
                  </g>
                ) : null}
              </g>
            </Fragment>
          ))}
          {list(v.guides).map((g, $i) => (
            <Fragment key={$i}>
              <line x1={g?.x1} y1={g?.y1} x2={g?.x2} y2={g?.y2} stroke={g?.color} strokeWidth={v.guideW} strokeDasharray={g?.dash} />
            </Fragment>
          ))}
          {v.hasFrameDraft ? (
            <rect x={v.fd?.x} y={v.fd?.y} width={v.fd?.w} height={v.fd?.h} rx="14" fill="rgba(157,189,176,0.25)" stroke="#9dbdb0" strokeWidth="1.5" />
          ) : null}
          {v.hasMarquee ? (
            <rect x={v.mq?.x} y={v.mq?.y} width={v.mq?.w} height={v.mq?.h} fill="rgba(47,111,94,0.08)" stroke="#2f6f5e" strokeWidth={v.mqStroke} strokeDasharray={v.mqDash} />
          ) : null}
          {v.hasLinkPreview ? (
            <path d={v.linkPreview} fill="none" stroke="#2f6f5e" strokeWidth="2" strokeDasharray="5 6" opacity="0.6" />
          ) : null}
        </svg>
        {" "}
        {list(v.tunnelLabels).map((tl, $i) => (
          <Fragment key={$i}>
            {" "}
            <div onPointerDown={tl?.go} title="Go to the other end" style={css(`position:absolute;white-space:nowrap;font:italic 500 11.5px Karla,sans-serif;line-height:1;color:#5e6072;cursor:pointer;text-shadow:0 0 3px #f1f2f6,0 0 3px #f1f2f6,0 0 2px #f1f2f6;${str(tl?.dyn)}`)}>
              {iv(tl?.label)}
            </div>
            {" "}
          </Fragment>
        ))}
        {" "}
        {list(v.nodes).map((n, $i) => (
          <Fragment key={$i}>
            {" "}
            <div data-node="1" ref={n?.boxRef} onPointerEnter={n?.onEnter} onPointerLeave={n?.onLeave} onPointerDown={n?.onDown} onDoubleClick={n?.onOpen} style={css(`position:absolute;box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;padding:14px 18px;border-radius:14px;user-select:none;cursor:grab;line-height:1.25;text-wrap:pretty;transition:box-shadow .12s ease;${str(n?.dyn)}`)}>
              {n?.showLabel ? (
                <span style={{ whiteSpace: "pre-line" }}>
                  {iv(n?.labelRich)}
                </span>
              ) : null}
              {n?.showSub ? (
                <div style={{ position: "absolute", left: "50%", top: "100%", marginTop: "10px", transform: "translateX(-50%)", width: "max-content", maxWidth: "260px", background: "#2a2724", color: "#fcfcfd", fontSize: "13px", lineHeight: "1.45", padding: "8px 12px", borderRadius: "9px", boxShadow: "0 6px 18px rgba(42,39,36,.22)", textAlign: "center", whiteSpace: "pre-line", pointerEvents: "none", zIndex: "6", fontWeight: "400", fontFamily: "Karla,system-ui,sans-serif" }}>
                  {iv(n?.sub)}
                </div>
              ) : null}
              {n?.editing ? (
                <textarea data-boxedit="1" ref={n?.inputRef} value={val(n?.editValue)} onChange={n?.onEditChange} onBlur={n?.onEditDone} onKeyDown={n?.onEditKey} onPointerDown={v.stop} onDoubleClick={v.stop} placeholder="Topic name" cols={n?.editSize} rows={n?.editRows} title="Enter to finish · Ctrl+Enter or Shift+Enter for a new line" style={{ display: "block", minWidth: "100%", border: "none", background: "transparent", textAlign: "center", font: "inherit", color: "inherit", padding: "0", resize: "none", overflow: "hidden", lineHeight: "inherit" }} />
              ) : null}
              <div onPointerDown={n?.onLink} title="Draw an arrow from this box" style={css(`position:absolute;right:-11px;top:50%;margin-top:-11px;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:crosshair;${str(n?.handleDyn)}`)}>
                ↗
              </div>
              {n?.canCollapse ? (
                <div onPointerDown={v.stop} onDoubleClick={v.stop} onClick={n?.onCollapse} title={n?.collapseTitle} style={css(`position:absolute;right:-11px;bottom:-11px;height:22px;box-sizing:border-box;border-radius:999px;border:1px solid #d1d3de;display:flex;align-items:center;justify-content:center;font-family:Karla,sans-serif;font-size:12px;font-weight:600;cursor:pointer;${str(n?.collapseDyn)}`)}>
                  {iv(n?.collapseLabel)}
                </div>
              ) : null}
              {n?.hasNotes ? (
                <>
                  <div title="Words in this box" style={{ position: "absolute", left: "12px", top: "6px", fontSize: "10px", fontFamily: "Karla,sans-serif", color: "#6a6c7e", letterSpacing: ".02em", pointerEvents: "none" }}>
                    {iv(n?.wordCount)}
                  </div>
                  <div title="Tabs with text" style={{ position: "absolute", left: "12px", bottom: "6px", fontSize: "10px", fontFamily: "Karla,sans-serif", color: "#6a6c7e", letterSpacing: ".02em", pointerEvents: "none" }}>
                    {iv(n?.tabCount)}
                  </div>
                </>
              ) : null}
              <div title={n?.backTitle} style={{ position: "absolute", right: "12px", bottom: "6px", fontSize: "10px", fontFamily: "Karla,sans-serif", color: "#2f6f5e", letterSpacing: ".02em", pointerEvents: "none" }}>
                {iv(n?.backCount)}
              </div>
              {n?.hasTwin ? (
                <div onPointerDown={n?.onTwin} onDoubleClick={v.stop} title={n?.twinTitle} style={{ position: "absolute", left: "50%", top: "-10px", transform: "translateX(-50%)", height: "20px", padding: "0 8px", borderRadius: "10px", background: "#fcfcfd", border: "1.5px solid #2f6f5e", color: "#2f6f5e", fontSize: "11px", fontWeight: "600", fontFamily: "Karla,sans-serif", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", boxSizing: "border-box", whiteSpace: "nowrap" }} className="scp8">
                  {"⧉ "}
                  {iv(n?.twinN)}
                </div>
              ) : null}
              {n?.hasRefs ? (
                <div title="References" style={{ position: "absolute", right: "16px", top: "6px", fontSize: "10px", fontFamily: "Karla,sans-serif", color: "#6a6c7e", letterSpacing: ".02em" }}>
                  {iv(n?.refCount)}
                  {" ref"}
                </div>
              ) : null}
              {n?.hasLink ? (
                <div onPointerDown={v.stop} onClick={n?.onFollow} title="Open linked map" style={{ position: "absolute", left: "50%", bottom: "-12px", transform: "translateX(-50%)", maxWidth: "150px", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: "#2a2724", color: "#fcfcfd", fontFamily: "Karla,sans-serif", fontSize: "11px", padding: "3px 9px", borderRadius: "999px", cursor: "pointer" }}>
                  {"↪ "}
                  {iv(n?.linkTitle)}
                </div>
              ) : null}
            </div>
            {" "}
          </Fragment>
        ))}
        {" "}
      </div>
      {" "}
    </div>
  );
}
