// Top toolbar: add box, select, frame, undo/redo, zoom, Tidy, search, references, export.
import { Fragment } from 'react';
import { css, iv, list, val, str } from './dc.js';

export default function Toolbar({ v }) {
  return (
    <div style={css(`position:absolute;left:20px;top:20px;display:flex;flex-direction:column;gap:10px;align-items:flex-start;${str(v.toolbarWrapDyn)}`)}>
      {v.isMobile ? (
        <button onClick={v.toggleTools} title="Show or hide tools" style={{ display: "flex", alignItems: "center", gap: "6px", border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "13px", padding: "0 14px", height: "40px", borderRadius: "10px", cursor: "pointer", boxShadow: "0 2px 10px rgba(42,39,36,.06)" }}>
          {iv(v.toolsLabel)}
        </button>
      ) : null}
      {v.toolsShown ? (
        <div style={css(`display:flex;gap:8px;align-items:center;width:max-content;white-space:nowrap;background:#fcfcfd;border:1px solid #dcdee6;border-radius:12px;padding:8px;box-shadow:0 2px 10px rgba(42,39,36,.06);${str(v.toolbarDyn)}`)}>
          {v.sidebarClosed ? (
            <button onClick={v.toggleSidebar} style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "13px", padding: "0 12px", height: "32px", borderRadius: "8px", cursor: "pointer" }}>
              ☰ Maps
            </button>
          ) : null}
          <button onClick={v.addNode} style={{ border: "none", background: "#2f6f5e", color: "#fcfcfd", fontSize: "13px", fontWeight: "600", padding: "8px 14px", borderRadius: "8px", cursor: "pointer" }}>
            Add box
          </button>
          <button onClick={v.toggleSelect} title="Select several boxes: drag a frame or tap boxes (desktop: Shift+drag or Shift+click)" style={css(`border:1px solid #dcdee6;font-size:12px;padding:0 10px;height:32px;border-radius:8px;cursor:pointer;${str(v.selectDyn)}`)}>
            Select
          </button>
          <button onClick={v.toggleFrame} title="Draw a coloured frame to group a section" style={css(`border:1px solid #dcdee6;font-size:12px;padding:0 10px;height:32px;border-radius:8px;cursor:pointer;${str(v.frameBtnDyn)}`)}>
            Frame
          </button>
          <div style={{ width: "1px", height: "22px", background: "#dcdee6" }} />
          <button onClick={v.undo} title="Undo (Ctrl+Z)" style={css(`border:1px solid #dcdee6;background:#fcfcfd;color:#2a2724;font-size:15px;width:32px;height:32px;border-radius:8px;${str(v.undoDyn)}`)}>
            ↶
          </button>
          <button onClick={v.redo} title="Redo (Ctrl+Shift+Z)" style={css(`border:1px solid #dcdee6;background:#fcfcfd;color:#2a2724;font-size:15px;width:32px;height:32px;border-radius:8px;${str(v.redoDyn)}`)}>
            ↷
          </button>
          <div style={{ width: "1px", height: "22px", background: "#dcdee6" }} />
          <button onClick={v.zoomOut} style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "15px", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer" }}>
            −
          </button>
          <span style={{ fontSize: "12px", fontVariantNumeric: "tabular-nums", color: "#5e6072", minWidth: "38px", textAlign: "center" }}>
            {iv(v.zoomLabel)}
          </span>
          <button onClick={v.zoomIn} style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "15px", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer" }}>
            +
          </button>
          <button onClick={v.resetView} style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "12px", padding: "0 10px", height: "32px", borderRadius: "8px", cursor: "pointer" }}>
            Fit
          </button>
          <div data-pop="tidy" style={{ position: "relative" }}>
            {" "}
            <button onClick={v.toggleTidy} title="Arrange boxes automatically" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "12px", padding: "0 10px", height: "32px", borderRadius: "8px", cursor: "pointer" }}>
              Tidy ▾
            </button>
            {" "}
            {v.tidyOpen ? (
              <>
                {" "}
                <div style={{ position: "absolute", left: "0", top: "38px", background: "#fcfcfd", border: "1px solid #dcdee6", borderRadius: "10px", boxShadow: "0 8px 24px rgba(42,39,36,.12)", padding: "6px", display: "flex", flexDirection: "column", gap: "2px", minWidth: "180px", zIndex: "5" }}>
                  <button onClick={v.tidyBoth} style={{ border: "none", background: "transparent", textAlign: "left", fontSize: "13px", color: "#2a2724", padding: "8px 10px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    {"⟷  Mind map (both sides)"}
                  </button>
                  <button onClick={v.tidyRight} style={{ border: "none", background: "transparent", textAlign: "left", fontSize: "13px", color: "#2a2724", padding: "8px 10px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    {"→  Left to right"}
                  </button>
                  <button onClick={v.tidyDown} style={{ border: "none", background: "transparent", textAlign: "left", fontSize: "13px", color: "#2a2724", padding: "8px 10px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    {"↓  Top to bottom"}
                  </button>
                  <button onClick={v.tidyRadial} style={{ border: "none", background: "transparent", textAlign: "left", fontSize: "13px", color: "#2a2724", padding: "8px 10px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    {"◎  Radial"}
                  </button>
                  <button onClick={v.tidyRandom} title="A new random shape each click. Undo to go back." style={{ border: "none", background: "transparent", textAlign: "left", fontSize: "13px", color: "#2a2724", padding: "8px 10px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    {"⚄  Random shape"}
                  </button>
                  {v.tidyShapeNote ? (
                    <div style={{ fontSize: "11.5px", color: "#7e8091", padding: "0 10px 4px", maxWidth: "190px", lineHeight: "1.4" }}>
                      {iv(v.tidyShapeNote)}
                    </div>
                  ) : null}
                  <div style={{ height: "1px", background: "#e0e1ea", margin: "4px 6px" }} />
                  <div style={{ fontSize: "11px", letterSpacing: ".06em", textTransform: "uppercase", color: "#7e8091", padding: "6px 10px 4px" }}>
                    Spacing
                  </div>
                  <div style={{ display: "flex", gap: "4px", padding: "0 6px 6px" }}>
                    {list(v.tidySpaces).map((sp, $i) => (
                      <Fragment key={$i}>
                        <button onClick={sp?.pick} style={css(`flex:1;border:1px solid #dcdee6;font-size:12px;padding:0 8px;height:28px;border-radius:7px;cursor:pointer;${str(sp?.dyn)}`)}>
                          {iv(sp?.label)}
                        </button>
                      </Fragment>
                    ))}
                  </div>
                  <div style={{ fontSize: "11px", letterSpacing: ".06em", textTransform: "uppercase", color: "#7e8091", padding: "6px 10px 4px" }} title="Arrows that are not parent → child">
                    Cross-links
                  </div>
                  <div style={{ display: "flex", gap: "4px", padding: "0 6px 6px" }}>
                    {list(v.xlinkModes).map((xm, $i) => (
                      <Fragment key={$i}>
                        <button onClick={xm?.pick} style={css(`flex:1;border:1px solid #dcdee6;font-size:12px;padding:0 6px;height:28px;border-radius:7px;cursor:pointer;white-space:nowrap;${str(xm?.dyn)}`)}>
                          {iv(xm?.label)}
                        </button>
                      </Fragment>
                    ))}
                  </div>
                  <div style={{ fontSize: "11px", letterSpacing: ".06em", textTransform: "uppercase", color: "#7e8091", padding: "6px 10px 4px" }} title="Long cross-links dive into a tunnel and come out at the other box">
                    Long cross-links
                  </div>
                  <div style={{ display: "flex", gap: "4px", padding: "0 6px 6px" }}>
                    {list(v.tunnelModes).map((tm, $i) => (
                      <Fragment key={$i}>
                        <button onClick={tm?.pick} style={css(`flex:1;border:1px solid #dcdee6;font-size:12px;padding:0 6px;height:28px;border-radius:7px;cursor:pointer;white-space:nowrap;${str(tm?.dyn)}`)}>
                          {iv(tm?.label)}
                        </button>
                      </Fragment>
                    ))}
                  </div>
                  <div style={{ fontSize: "11px", letterSpacing: ".06em", textTransform: "uppercase", color: "#7e8091", padding: "6px 10px 4px" }} title="Bigger text in the boxes, saved per device. Use Tidy afterwards to re-space the map.">
                    Box text (this device)
                  </div>
                  <div style={{ display: "flex", gap: "4px", padding: "0 6px 6px" }}>
                    {list(v.textSizes).map((ts, $i) => (
                      <Fragment key={$i}>
                        <button onClick={ts?.pick} style={css(`flex:1;border:1px solid #dcdee6;font-size:12px;padding:0 6px;height:28px;border-radius:7px;cursor:pointer;white-space:nowrap;${str(ts?.dyn)}`)}>
                          {iv(ts?.label)}
                        </button>
                      </Fragment>
                    ))}
                  </div>
                </div>
                {" "}
              </>
            ) : null}
            {" "}
          </div>
          {v.mapSearchClosed ? (
            <button onClick={v.openMapSearch} title="Search this map (Ctrl+F)" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "12px", padding: "0 10px", height: "32px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }} className="scp9">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="6" cy="6" r="4.5" />
                <path d="M9.5 9.5L13 13" />
              </svg>
              Search
            </button>
          ) : null}
          {v.mapSearchOpen ? (
            <div data-pop="search" style={{ display: "flex", alignItems: "center", gap: "2px", border: "1.5px solid #2f6f5e", background: "#fcfcfd", borderRadius: "8px", height: "32px", boxSizing: "border-box", padding: "0 3px 0 9px" }}>
              <input ref={v.mapQRef} autoFocus={true} value={val(v.mapQ)} onChange={v.onMapQ} onKeyDown={v.onMapQKey} placeholder="Search this map" style={{ border: "none", outline: "none", background: "transparent", width: "150px", fontSize: "13px", color: "#2a2724", padding: "0" }} />
              <span style={{ fontSize: "11px", color: "#6a6c7e", fontVariantNumeric: "tabular-nums", minWidth: "34px", textAlign: "right", paddingRight: "4px" }}>
                {iv(v.mapQCount)}
              </span>
              <button onClick={v.mapQPrev} title="Previous (Shift+Enter)" style={{ border: "none", background: "transparent", color: "#2a2724", fontSize: "15px", width: "24px", height: "24px", borderRadius: "6px", cursor: "pointer", padding: "0" }} className="scp9">
                ‹
              </button>
              <button onClick={v.mapQNext} title="Next (Enter)" style={{ border: "none", background: "transparent", color: "#2a2724", fontSize: "15px", width: "24px", height: "24px", borderRadius: "6px", cursor: "pointer", padding: "0" }} className="scp9">
                ›
              </button>
              <button onClick={v.closeMapSearch} title="Close (Esc)" style={{ border: "none", background: "transparent", color: "#6a6c7e", fontSize: "15px", width: "24px", height: "24px", borderRadius: "6px", cursor: "pointer", padding: "0" }} className="scp9">
                ×
              </button>
            </div>
          ) : null}
          <div data-pop="refs" style={{ display: "flex" }}>
            <button onClick={v.toggleRefs} title="All references in this map" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "12px", padding: "0 10px", height: "32px", borderRadius: "8px", cursor: "pointer" }} className="scp9">
              References
            </button>
          </div>
          <div style={{ width: "1px", height: "22px", background: "#dcdee6" }} />
          <div data-pop="export" style={{ position: "relative" }}>
            {" "}
            <button onClick={v.toggleExport} title="Export this notebook or all notebooks" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "12px", padding: "0 10px", height: "32px", borderRadius: "8px", cursor: "pointer" }} className="scp9">
              Export ▾
            </button>
            {" "}
            {v.exportOpen ? (
              <>
                {" "}
                <div style={{ position: "absolute", right: "0", top: "38px", background: "#fcfcfd", border: "1px solid #dcdee6", borderRadius: "10px", boxShadow: "0 8px 24px rgba(42,39,36,.12)", padding: "6px", display: "flex", flexDirection: "column", gap: "2px", minWidth: "210px", zIndex: "5" }}>
                  <div style={{ fontSize: "11px", letterSpacing: ".06em", textTransform: "uppercase", color: "#7e8091", padding: "6px 10px 2px" }}>
                    This notebook
                  </div>
                  <button onClick={v.expMapWord} style={{ border: "none", background: "transparent", textAlign: "left", fontSize: "13px", color: "#2a2724", padding: "8px 10px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    Word document (.doc)
                  </button>
                  <button onClick={v.expMapPdf} style={{ border: "none", background: "transparent", textAlign: "left", fontSize: "13px", color: "#2a2724", padding: "8px 10px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    PDF
                  </button>
                  <button onClick={v.expMapHtml} style={{ border: "none", background: "transparent", textAlign: "left", fontSize: "13px", color: "#2a2724", padding: "8px 10px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    Interactive map (.html)
                  </button>
                  <button onClick={v.shareMap} title="Create a link that opens this map read-only" style={{ border: "none", background: "transparent", textAlign: "left", fontSize: "13px", color: "#2a2724", padding: "8px 10px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    Share read-only link…
                  </button>
                  <div style={{ height: "1px", background: "#e0e1ea", margin: "4px 6px" }} />
                  <div style={{ fontSize: "11px", letterSpacing: ".06em", textTransform: "uppercase", color: "#7e8091", padding: "6px 10px 2px" }}>
                    All notebooks
                  </div>
                  <button onClick={v.expAllWord} style={{ border: "none", background: "transparent", textAlign: "left", fontSize: "13px", color: "#2a2724", padding: "8px 10px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    Word document (.doc)
                  </button>
                  <button onClick={v.expAllPdf} style={{ border: "none", background: "transparent", textAlign: "left", fontSize: "13px", color: "#2a2724", padding: "8px 10px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    PDF
                  </button>
                  <div style={{ height: "1px", background: "#e0e1ea", margin: "4px 6px" }} />
                  <div style={{ fontSize: "11px", letterSpacing: ".06em", textTransform: "uppercase", color: "#7e8091", padding: "6px 10px 2px" }}>
                    Backup
                  </div>
                  <button onClick={v.backupAll} title="Download every map, folder and category as one file" style={{ border: "none", background: "transparent", textAlign: "left", fontSize: "13px", color: "#2a2724", padding: "8px 10px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    Download backup of everything
                  </button>
                  <button onClick={v.restoreBackup} title="Load maps from a backup file" style={{ border: "none", background: "transparent", textAlign: "left", fontSize: "13px", color: "#2a2724", padding: "8px 10px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    Restore from backup…
                  </button>
                  <div style={{ height: "1px", background: "#e0e1ea", margin: "4px 6px" }} />
                  <div style={{ fontSize: "11px", letterSpacing: ".06em", textTransform: "uppercase", color: "#7e8091", padding: "6px 10px 2px" }}>
                    Import
                  </div>
                  <button onClick={v.openAiImport} title="Turn a mind map written by an AI into a new map" style={{ border: "none", background: "transparent", textAlign: "left", fontSize: "13px", color: "#2a2724", padding: "8px 10px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    Import mind map from AI…
                  </button>
                </div>
                {" "}
              </>
            ) : null}
            {" "}
          </div>
        </div>
      ) : null}
      <div style={{ fontFamily: "Karla,sans-serif", fontSize: "13px", color: "#6a6c7e", paddingLeft: "4px" }}>
        {iv(v.savedLabel)}
      </div>
    </div>
  );
}
