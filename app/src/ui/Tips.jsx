// Tips panel and its toggle button (bottom left).
import { iv } from './dc.js';

export default function Tips({ v }) {
  return (
    <div style={{ position: "absolute", left: "20px", bottom: "18px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px", maxWidth: "360px" }}>
      {v.helpOpen ? (
        <div style={{ background: "#fcfcfd", border: "1px solid #dcdee6", borderRadius: "12px", padding: "12px 14px", boxShadow: "0 2px 10px rgba(42,39,36,.06)", fontSize: "12px", color: "#5e6072", lineHeight: "1.7" }}>
          {" "}
          {v.notMobile ? (
            <>
              {"\n    Double-click the canvas for a new box · drag to pan · scroll to zoom · double-click a box for notes, references, colour and map links · click an arrow to add notes · click a box to select it, click again (or F2) to rename · Tab adds a connected box, Enter adds a sibling, arrow keys move between boxes · drag the ↗ handle onto another box for an arrow · Shift+drag the canvas or Shift+click boxes to select several, then drag them together · Frame: drag on the canvas to draw a coloured section, click it to select, then drag to move it (Shift+drag moves its boxes too) · Delete removes what is selected · Ctrl+Z undo, Ctrl+Shift+Z redo · Ctrl+B / Ctrl+I bold and italic\n    "}
            </>
          ) : null}
          {" "}
          {v.isMobile ? (
            <>
              {"\n    Double-tap the canvas for a new box · drag with one finger to pan, pinch to zoom · tap a box to select it, tap again to rename · double-tap or long-press a box for notes · drag the ↗ handle onto another box for an arrow · tap an arrow to edit it · tap Select, then drag a frame or tap boxes to move several at once\n    "}
            </>
          ) : null}
          {" "}
        </div>
      ) : null}
      <button onClick={v.toggleHelp} title="Show or hide tips" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#5e6072", fontSize: "12px", padding: "0 12px", height: "30px", borderRadius: "999px", cursor: "pointer", boxShadow: "0 2px 8px rgba(42,39,36,.05)" }}>
        {iv(v.helpLabel)}
      </button>
    </div>
  );
}
