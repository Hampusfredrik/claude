// Create and copy a read-only share link.
import { iv, val } from './dc.js';

export default function ShareDialog({ v }) {
  return (
    <>
      {" "}
      <div onClick={v.closeShare} style={{ position: "fixed", inset: "0", zIndex: "3000", background: "rgba(30,30,40,0.28)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={v.stop} onPointerDown={v.stop} style={{ width: "min(520px,100%)", boxSizing: "border-box", background: "#fcfcfd", border: "1px solid #dcdee6", borderRadius: "14px", boxShadow: "0 20px 50px rgba(30,30,40,0.2)", padding: "22px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontFamily: "Karla,sans-serif", fontWeight: "600", fontSize: "22px", color: "#2a2724" }}>
            Share read-only link
          </div>
          <div style={{ fontSize: "13.5px", lineHeight: "1.5", color: "#5e6072", textWrap: "pretty" }}>
            Anyone with the link can view this map and read its notes and references, but can't change anything. The link is a snapshot, so later edits are not included.
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input readOnly={true} value={val(v.shareUrl)} onFocus={v.selectAll} placeholder="Creating link…" style={{ flex: "1", minWidth: "0", border: "1px solid #dcdee6", background: "#fffefb", borderRadius: "8px", padding: "0 12px", height: "38px", fontSize: "13px", color: "#2a2724", boxSizing: "border-box" }} />
            <button onClick={v.copyShare} style={{ border: "none", background: "#2f6f5e", color: "#fcfcfd", fontSize: "13px", fontWeight: "600", padding: "0 14px", height: "38px", borderRadius: "8px", cursor: "pointer", whiteSpace: "nowrap" }}>
              {iv(v.shareCopyLabel)}
            </button>
          </div>
          {v.shareNote ? (
            <div style={{ fontSize: "12.5px", lineHeight: "1.45", color: "#8a5a2a" }}>
              {iv(v.shareNote)}
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={v.closeShare} style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "13px", padding: "0 14px", height: "34px", borderRadius: "8px", cursor: "pointer" }}>
              Close
            </button>
          </div>
        </div>
      </div>
      {" "}
    </>
  );
}
