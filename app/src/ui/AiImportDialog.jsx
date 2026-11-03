// Import a mind map from an AI (JSON file).
import { iv } from './dc.js';

export default function AiImportDialog({ v }) {
  return (
    <>
      {" "}
      <div onClick={v.closeAi} style={{ position: "fixed", inset: "0", zIndex: "3000", background: "rgba(30,30,40,0.28)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div onClick={v.stop} onPointerDown={v.stop} onKeyDown={v.stop} style={{ width: "min(600px,100%)", maxHeight: "100%", overflow: "auto", boxSizing: "border-box", background: "#fcfcfd", border: "1px solid #dcdee6", borderRadius: "14px", boxShadow: "0 20px 50px rgba(30,30,40,0.2)", padding: "22px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontFamily: "Karla,sans-serif", fontWeight: "600", fontSize: "22px", color: "#2a2724" }}>
            Import mind map from AI
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <div style={{ flex: "none", width: "22px", height: "22px", borderRadius: "50%", background: "#eef5f1", color: "#2f6f5e", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
              1
            </div>
            <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "13.5px", lineHeight: "1.5", color: "#5e6072", textWrap: "pretty" }}>
                Copy the instructions and paste them into Claude or another AI, followed by your topic or material.
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={v.copyAiSpec} style={{ border: "none", background: "#2f6f5e", color: "#fcfcfd", fontSize: "13px", fontWeight: "600", padding: "0 14px", height: "34px", borderRadius: "8px", cursor: "pointer" }}>
                  {iv(v.aiCopyLabel)}
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <div style={{ flex: "none", width: "22px", height: "22px", borderRadius: "50%", background: "#eef5f1", color: "#2f6f5e", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>
              2
            </div>
            <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "13.5px", lineHeight: "1.5", color: "#5e6072", textWrap: "pretty" }}>
                Upload the .json file the AI created. The map is made right away.
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={v.pickAiFile} style={{ border: "none", background: "#2f6f5e", color: "#fcfcfd", fontSize: "13px", fontWeight: "600", padding: "0 14px", height: "34px", borderRadius: "8px", cursor: "pointer" }}>
                  Upload .json file…
                </button>
              </div>
              {v.aiErr ? (
                <div style={{ fontSize: "12.5px", lineHeight: "1.45", color: "#a0452a" }}>
                  {iv(v.aiErr)}
                </div>
              ) : null}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button onClick={v.closeAi} style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "13px", padding: "0 14px", height: "34px", borderRadius: "8px", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
      {" "}
    </>
  );
}
