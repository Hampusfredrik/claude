// Settings for the selected arrow: direction, thickness, colour, notes.
import { Fragment } from 'react';
import { css, iv, list, val, str } from './dc.js';

export default function ArrowPanel({ v }) {
  return (
    <>
      {" "}
      <div data-float="edge" onPointerDown={v.stop} style={css(`position:absolute;right:20px;bottom:18px;background:#fcfcfd;border:1px solid #dcdee6;border-radius:12px;padding:12px 14px;box-shadow:0 2px 14px rgba(42,39,36,.08);display:flex;flex-direction:column;gap:10px;width:250px;box-sizing:border-box;overflow:hidden;z-index:6;${str(v.edgePanelDyn)}`)}>
        <div style={{ margin: "-12px -14px -4px" }}>
          {v.canFloat ? (
            <div onPointerDown={v.edgeDrag} onDoubleClick={v.edgeReset} title="Drag to move · double-click to reset" style={{ height: "14px", flex: "none", cursor: "move", touchAction: "none", display: "flex", alignItems: "center", justifyContent: "center" }} className="scpb">
              <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#d4d6e0" }} />
            </div>
          ) : null}
        </div>
        <div style={{ fontFamily: "Karla,sans-serif", fontWeight: "600", fontSize: "15px" }}>
          {iv(v.selEdgeData?.title)}
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={v.setDirOne} style={css(`flex:1;border:1px solid #dcdee6;border-radius:8px;padding:7px 0;font-size:13px;cursor:pointer;${str(v.selEdgeData?.oneStyle)}`)}>
            → one way
          </button>
          <button onClick={v.setDirBoth} style={css(`flex:1;border:1px solid #dcdee6;border-radius:8px;padding:7px 0;font-size:13px;cursor:pointer;${str(v.selEdgeData?.bothStyle)}`)}>
            ↔ both
          </button>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={v.setThin} style={css(`flex:1;border:1px solid #dcdee6;border-radius:8px;padding:7px 0;font-size:12px;cursor:pointer;${str(v.selEdgeData?.thinStyle)}`)}>
            Thin
          </button>
          <button onClick={v.setThick} style={css(`flex:1;border:1px solid #dcdee6;border-radius:8px;padding:7px 0;font-size:12px;cursor:pointer;${str(v.selEdgeData?.thickStyle)}`)}>
            Thick
          </button>
          <button onClick={v.setDashed} style={css(`flex:1;border:1px solid #dcdee6;border-radius:8px;padding:7px 0;font-size:12px;cursor:pointer;${str(v.selEdgeData?.dashedStyle)}`)}>
            Dashed
          </button>
        </div>
        <div style={{ display: "flex", gap: "9px", alignItems: "center", padding: "4px 2px" }}>
          {list(v.selEdgeData?.swatches).map((c, $i) => (
            <Fragment key={$i}>
              <button onClick={c?.onPick} title={c?.title} style={css(`width:20px;height:20px;border-radius:50%;border:none;padding:0;cursor:pointer;flex-shrink:0;${str(c?.dyn)}`)} />
            </Fragment>
          ))}
        </div>
        <textarea value={val(v.selEdgeData?.notes)} onChange={v.onEdgeNotes} onPointerDown={v.stop} placeholder="Why does this connect? Mechanism, evidence…" style={{ width: "100%", flex: "1 1 96px", minHeight: "60px", boxSizing: "border-box", resize: "none", border: "1px solid #e0e1ea", borderRadius: "9px", padding: "9px 10px", fontSize: "13px", lineHeight: "1.5", color: "#2a2724", background: "#fffefb" }} />
        <button onClick={v.deleteEdge} style={{ border: "none", background: "transparent", color: "#a15448", fontSize: "12px", textAlign: "left", padding: "0", cursor: "pointer", alignSelf: "flex-start" }}>
          Delete arrow
        </button>
        {v.canFloat ? (
          <div onPointerDown={v.edgeResize} title="Drag to resize" style={{ position: "absolute", right: "0", bottom: "0", width: "22px", height: "22px", cursor: "nwse-resize", touchAction: "none", zIndex: "3", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: "5px", boxSizing: "border-box" }}>
            <div style={{ width: "9px", height: "9px", borderRight: "2px solid #b4b6c6", borderBottom: "2px solid #b4b6c6", borderBottomRightRadius: "3px" }} />
          </div>
        ) : null}
      </div>
      {" "}
    </>
  );
}
