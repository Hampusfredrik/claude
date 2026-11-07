// The whole app view. `v` is the view model from NotebookLogic.renderVals():
// values to show and event handlers. Inline styles and the element structure
// are the same as in the original .dc.html template (see tools/port).
import { css, str } from './dc.js';
import Sidebar from './Sidebar.jsx';
import Canvas from './Canvas.jsx';
import Toolbar from './Toolbar.jsx';
import Tips from './Tips.jsx';
import MultiSelectBar from './MultiSelectBar.jsx';
import ReferencesPanel from './ReferencesPanel.jsx';
import CategoryLegend from './CategoryLegend.jsx';
import ArrowPanel from './ArrowPanel.jsx';
import Welcome from './Welcome.jsx';
import BoxDialog from './BoxDialog.jsx';
import AiImportDialog from './AiImportDialog.jsx';
import ShareDialog from './ShareDialog.jsx';
import Book from './Book.jsx';
import StartPage from './StartPage.jsx';

export default function App({ v }) {
  return (
    <div style={css(`display:flex;width:100%;height:100vh;height:100dvh;overflow:hidden;background:#f1f2f6;filter:${str(v.themeFilter)}`)}>
      {v.sidebarOpen ? <Sidebar v={v} /> : null}
      <div style={{ position: "relative", flex: "1", minWidth: "0", height: "100%", overflow: "hidden" }}>
        {" "}
        <Canvas v={v} />
        {" "}
        {v.mobileMenuBtn ? (
          <>
            {" "}
            <button onClick={v.toggleSidebar} style={{ position: "absolute", left: "12px", top: "12px", zIndex: "6", display: "flex", alignItems: "center", gap: "8px", border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "14px", fontWeight: "600", padding: "0 14px", height: "44px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(42,39,36,.08)", cursor: "pointer" }}>
              ☰ Maps
              <span style={css(`width:8px;height:8px;border-radius:50%;background:${str(v.menuDot)}`)} />
            </button>
            {" "}
          </>
        ) : null}
        {" "}
        <Toolbar v={v} />
        {" "}
        <Tips v={v} />
        {" "}
        {v.hasMulti ? <MultiSelectBar v={v} /> : null}
        {" "}
        {v.refsOpen ? <ReferencesPanel v={v} /> : null}
        {" "}
        {v.hasLegend ? <CategoryLegend v={v} /> : null}
        {" "}
        {v.selEdgeData ? <ArrowPanel v={v} /> : null}
        {" "}
        {v.book ? <Book v={v} /> : null}
        {v.start ? <StartPage v={v} /> : null}
        {v.showWelcome ? <Welcome v={v} /> : null}
        {" "}
        {v.modal ? <BoxDialog v={v} /> : null}
        {" "}
        {v.aiOpen ? <AiImportDialog v={v} /> : null}
        {" "}
        {v.shareOpen ? <ShareDialog v={v} /> : null}
        {" "}
      </div>
    </div>
  );
}
