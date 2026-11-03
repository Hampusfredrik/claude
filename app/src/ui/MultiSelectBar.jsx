// Bar shown when several boxes are selected.
import { iv } from './dc.js';

export default function MultiSelectBar({ v }) {
  return (
    <>
      {" "}
      <div style={{ position: "absolute", left: "50%", bottom: "18px", transform: "translateX(-50%)", zIndex: "7", display: "flex", alignItems: "center", gap: "8px", background: "#2a2724", color: "#fcfcfd", borderRadius: "12px", padding: "6px 6px 6px 14px", boxShadow: "0 6px 20px rgba(42,39,36,.2)", fontSize: "13px", whiteSpace: "nowrap" }}>
        <span>
          {iv(v.multiLabel)}
        </span>
        <button onClick={v.deleteMulti} style={{ border: "none", background: "#a15448", color: "#fcfcfd", fontSize: "12px", padding: "0 12px", height: "32px", borderRadius: "8px", cursor: "pointer" }}>
          Delete
        </button>
        <button onClick={v.clearMulti} title="Clear selection (Esc)" style={{ border: "none", background: "transparent", color: "#fcfcfd", fontSize: "16px", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer" }}>
          ×
        </button>
      </div>
      {" "}
    </>
  );
}
