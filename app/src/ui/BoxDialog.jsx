// Box dialog: title, subtitle, category, map link, notes editor with tabs, references, export of the box.
import { Fragment } from 'react';
import { css, iv, list, val, str } from './dc.js';

export default function BoxDialog({ v }) {
  return (
    <>
      {" "}
      <div onPointerDown={v.closeModal} style={css(`position:absolute;inset:0;background:rgba(42,39,36,.28);display:flex;align-items:center;justify-content:center;padding:clamp(10px,4vh,40px) clamp(10px,4vw,40px);${str(v.modalWrapDyn)}`)}>
        <div data-float="modal" onPointerDown={v.stop} style={css(`width:min(760px,100%);max-height:100%;background:#fcfcfd;border:1px solid #dcdee6;border-radius:18px;box-shadow:0 18px 50px rgba(42,39,36,.22);display:flex;flex-direction:column;overflow:hidden;position:relative;${str(v.modalDyn)}`)}>
          {v.canFloat ? (
            <div onPointerDown={v.modalDrag} onDoubleClick={v.modalReset} title="Drag to move · double-click to reset" style={{ height: "14px", flex: "none", cursor: "move", touchAction: "none", display: "flex", alignItems: "center", justifyContent: "center" }} className="scpb">
              <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#d4d6e0" }} />
            </div>
          ) : null}
          {v.canFloat ? (
            <div onPointerDown={v.modalResize} title="Drag to resize" style={{ position: "absolute", right: "0", bottom: "0", width: "22px", height: "22px", cursor: "nwse-resize", touchAction: "none", zIndex: "3", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: "5px", boxSizing: "border-box" }}>
              <div style={{ width: "9px", height: "9px", borderRight: "2px solid #b4b6c6", borderBottom: "2px solid #b4b6c6", borderBottomRightRadius: "3px" }} />
            </div>
          ) : null}
          {v.canFloat ? (
            <button onClick={v.toggleModalMax} title={v.modalMaxTitle} style={{ position: "absolute", top: "12px", right: "50px", zIndex: "4", width: "30px", height: "30px", boxSizing: "border-box", border: "1px solid #dcdee6", background: "#fcfcfd", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#5e6072", padding: "0" }} className="scp9">
              {v.modalMax ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 1v4H1M9 1v4h4M5 13V9H1M9 13V9h4" />
                </svg>
              ) : null}
              {v.modalNotMax ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9" />
                </svg>
              ) : null}
            </button>
          ) : null}
          <button onClick={v.closeModal} title="Close" style={{ position: "absolute", top: "12px", right: "14px", zIndex: "4", width: "30px", height: "30px", boxSizing: "border-box", border: "1px solid #dcdee6", background: "#fcfcfd", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#5e6072", padding: "0" }} className="scp9">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
          <div style={{ padding: "12px 94px 0 26px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <textarea value={val(v.modal?.label)} onChange={v.onLabelChange} onKeyDown={v.onLabelKey} rows={v.modal?.labelRows} title="Ctrl+B bold · Ctrl+I italic · Ctrl+Enter for a new line" placeholder="Topic name" style={{ display: "block", border: "none", background: "transparent", fontFamily: "Karla,sans-serif", fontWeight: "600", fontSize: "27px", lineHeight: "1.25", color: "#2a2724", padding: "0", width: "100%", resize: "none", overflow: "hidden" }} />
            <input value={val(v.modal?.sub)} onChange={v.onSubChange} placeholder="Add a subtitle (shown when you hover over the box)" title="Shown after hovering over the box for a second" style={{ display: "block", boxSizing: "border-box", width: "100%", marginTop: "4px", border: "none", borderBottom: "1px dashed #dcdee6", background: "transparent", fontSize: "14px", color: "#5e6072", padding: "3px 0 5px" }} />
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                {list(v.modalCats).map((c, $i) => (
                  <Fragment key={$i}>
                    <button onClick={c?.onPick} title={c?.name} style={css(`width:20px;height:20px;border-radius:6px;padding:0;cursor:pointer;${str(c?.swatch)}`)} />
                  </Fragment>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#5e6072" }}>
                <span style={{ whiteSpace: "nowrap" }}>
                  Links to
                </span>
                <select value={val(v.modalLinkValue)} onChange={v.onLinkPick} style={{ border: "1px solid #dcdee6", background: "#fcfcfd", borderRadius: "8px", padding: "5px 8px", fontSize: "13px", color: "#2a2724", maxWidth: "220px" }}>
                  <option value="">
                    No map
                  </option>
                  {list(v.linkOptions).map((o, $i) => (
                    <Fragment key={$i}>
                      <option value={val(o?.id)}>
                        {iv(o?.title)}
                      </option>
                    </Fragment>
                  ))}
                  <option value="__new">
                    + New map from this box
                  </option>
                </select>
                {v.modalHasLink ? (
                  <button onClick={v.followModalLink} style={{ border: "none", background: "#2a2724", color: "#fcfcfd", fontSize: "12px", padding: "5px 10px", borderRadius: "999px", cursor: "pointer" }}>
                    Open ↪
                  </button>
                ) : null}
              </div>
            </div>
            <div style={{ display: "flex", gap: "22px", borderBottom: "1px solid #e0e1ea" }}>
              <button onClick={v.tabNotes} style={css(`border:none;background:transparent;padding:0 0 10px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;${str(v.modal?.notesTab)}`)}>
                Notes
              </button>
              <button onClick={v.tabRefs} style={css(`border:none;background:transparent;padding:0 0 10px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;${str(v.modal?.refsTab)}`)}>
                References
              </button>
              <div style={{ marginLeft: "auto", display: "flex", gap: "6px", paddingBottom: "8px", alignItems: "center" }}>
                <button onClick={v.expBoxWord} title="Download this box as a Word document" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "12px", padding: "0 9px", height: "26px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                  Word
                </button>
                <button onClick={v.expBoxPdf} title="Save this box as a PDF" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "12px", padding: "0 9px", height: "26px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                  PDF
                </button>
              </div>
            </div>
          </div>
          <div ref={v.modalScrollRef} style={{ padding: "18px 26px 6px", flex: "1", minHeight: "0", overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column" }}>
            {v.isNotesEditing ? (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px", alignItems: "center" }}>
                  <button data-fmt="1" onMouseDown={v.fmtBold} title="Bold (Ctrl+B)" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "13px", fontWeight: "700", width: "30px", height: "28px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    B
                  </button>
                  <button data-fmt="1" onMouseDown={v.fmtItalic} title="Italic (Ctrl+I)" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "14px", fontStyle: "italic", fontFamily: "Karla,sans-serif", width: "30px", height: "28px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    I
                  </button>
                  <button data-fmt="1" onMouseDown={v.fmtH1} title="Heading 1" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "12px", fontWeight: "600", width: "34px", height: "28px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    H1
                  </button>
                  <button data-fmt="1" onMouseDown={v.fmtH2} title="Heading 2" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "12px", fontWeight: "600", width: "34px", height: "28px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    H2
                  </button>
                  <button data-fmt="1" onMouseDown={v.fmtH3} title="Heading 3" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "12px", fontWeight: "600", width: "34px", height: "28px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    H3
                  </button>
                  <button data-fmt="1" onMouseDown={v.fmtList} title="Bullet list" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "13px", padding: "0 10px", height: "28px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    • List
                  </button>
                  <button data-fmt="1" onMouseDown={v.fmtOList} title="Numbered list" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "13px", padding: "0 10px", height: "28px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    1. List
                  </button>
                  <button data-fmt="1" onMouseDown={v.fmtImage} title="Insert image (or paste one)" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "13px", padding: "0 10px", height: "28px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    Image
                  </button>
                  <input ref={v.imgInputRef} type="file" accept="image/*" onChange={v.onImgFile} style={{ display: "none" }} />
                  <button data-fmt="1" onMouseDown={v.openCite} title="Insert citation" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "13px", padding: "0 10px", height: "28px", borderRadius: "7px", cursor: "pointer" }} className="scp9">
                    Insert citation
                  </button>
                </div>
                {v.citeOpen ? (
                  <div style={{ border: "1px solid #dcdee6", background: "#fcfcfd", borderRadius: "12px", padding: "14px", marginBottom: "10px", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "0 8px 24px rgba(42,39,36,.10)" }}>
                    <div style={{ fontSize: "11px", letterSpacing: ".06em", textTransform: "uppercase", color: "#6a6c7e" }}>
                      New citation
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <input data-fmt="1" autoFocus={true} value={val(v.citeText)} onChange={v.onCiteText} onKeyDown={v.onCiteKey} placeholder="Paste a DOI or PubMed link, or type the reference" style={{ flex: "1", minWidth: "180px", border: "1px solid #dcdee6", background: "#fffefb", borderRadius: "8px", padding: "0 12px", height: "38px", fontSize: "15px", color: "#2a2724", boxSizing: "border-box" }} />
                      <button data-fmt="1" onClick={v.citeAdd} style={{ border: "none", background: "#2f6f5e", color: "#fcfcfd", fontSize: "13px", fontWeight: "600", padding: "0 14px", height: "38px", borderRadius: "8px", cursor: "pointer" }}>
                        {iv(v.citeAddLabel)}
                      </button>
                      <button data-fmt="1" onClick={v.closeCite} style={{ border: "none", background: "transparent", color: "#6a6c7e", fontSize: "13px", padding: "0 8px", height: "38px", cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                    {v.citeMsg ? (
                      <div style={{ fontSize: "12.5px", color: "#8a5a2a", marginTop: "-2px" }}>
                        {iv(v.citeMsg)}
                      </div>
                    ) : null}
                    {v.hasCiteExisting ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ fontSize: "11px", letterSpacing: ".06em", textTransform: "uppercase", color: "#6a6c7e", marginBottom: "2px" }}>
                          Or cite an existing reference
                        </div>
                        {list(v.citeExisting).map((r, $i) => (
                          <Fragment key={$i}>
                            <button data-fmt="1" onClick={r?.pick} style={{ display: "flex", gap: "10px", alignItems: "baseline", textAlign: "left", border: "none", background: "transparent", padding: "7px 8px", borderRadius: "7px", cursor: "pointer", fontSize: "13px", color: "#2a2724", lineHeight: "1.4" }} className="scp9">
                              <span style={{ color: "#2f6f5e", fontWeight: "600", flex: "none" }}>
                                {"["}
                                {iv(r?.num)}
                                {"]"}
                              </span>
                              <span style={{ overflowWrap: "anywhere" }}>
                                {iv(r?.text)}
                              </span>
                            </button>
                          </Fragment>
                        ))}
                      </div>
                    ) : null}
                    {v.hasCiteShared ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxHeight: "220px", overflowY: "auto" }}>
                        <div style={{ fontSize: "11px", letterSpacing: ".06em", textTransform: "uppercase", color: "#6a6c7e", marginBottom: "2px" }}>
                          From other boxes in this map
                        </div>
                        {list(v.citeShared).map((r, $i) => (
                          <Fragment key={$i}>
                            <button data-fmt="1" onClick={r?.pick} style={{ display: "flex", flexDirection: "column", gap: "1px", textAlign: "left", border: "none", background: "transparent", padding: "7px 8px", borderRadius: "7px", cursor: "pointer", fontSize: "13px", color: "#2a2724", lineHeight: "1.4" }} className="scp9">
                              <span style={{ overflowWrap: "anywhere" }}>
                                {iv(r?.text)}
                              </span>
                              <span style={{ fontSize: "11px", color: "#7e8091" }}>
                                {"in "}
                                {iv(r?.from)}
                              </span>
                            </button>
                          </Fragment>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}
            {v.notesView ? (
              <div onClick={v.startNotesEdit} title="Click to edit" style={{ flex: "1 1 0", minHeight: "240px", overflowY: "auto", boxSizing: "border-box", border: "1px solid transparent", borderRadius: "12px", padding: "16px", fontSize: "15px", lineHeight: "1.65", color: "#2a2724", cursor: "text", overflowWrap: "anywhere" }} className="scpc">
                {iv(v.notesRich)}
              </div>
            ) : null}
            {v.isNotesTab ? (
              <>
                <div ref={v.edRef} data-ed="1" data-ph={v.edPlaceholder} contentEditable="true" suppressContentEditableWarning={true} spellCheck="true" onInput={v.onEdInput} onBlur={v.onEdBlur} onKeyDown={v.onEdKey} onPaste={v.onEdPaste} onClick={v.onEdClick} style={{ flex: "1 1 0", minHeight: "240px", overflowY: "auto", boxSizing: "border-box", border: "1px solid #dcdee6", borderRadius: "12px", padding: "16px", fontSize: "15px", lineHeight: "1.65", color: "#2a2724", background: "#fffefb", overflowWrap: "anywhere", whiteSpace: "pre-wrap", cursor: "text" }} />
                {v.slashOpen ? (
                  <div onMouseDown={v.slashMouseDown} style={css(`position:fixed;left:${str(v.slashX)}px;top:${str(v.slashY)}px;z-index:2000;width:280px;max-height:320px;overflow:auto;box-sizing:border-box;background:#fffefb;border:1px solid #dcdee6;border-radius:10px;box-shadow:0 12px 32px rgba(30,30,40,0.16);padding:6px;display:flex;flex-direction:column;gap:1px`)}>
                    <div style={{ fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#7a7c8a", padding: "4px 10px 6px" }}>
                      Link to box
                    </div>
                    {list(v.slashList).map((it, $i) => (
                      <Fragment key={$i}>
                        <div onMouseDown={it?.pick} onMouseEnter={it?.hover} style={css(`padding:7px 10px;border-radius:7px;font-size:14px;color:#2a2724;cursor:pointer;background:${str(it?.bg)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`)}>
                          {iv(it?.label)}
                        </div>
                      </Fragment>
                    ))}
                    {v.slashEmpty ? (
                      <div style={{ padding: "7px 10px", fontSize: "13px", color: "#7a7c8a" }}>
                        No matching boxes
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {v.hasBacklinks ? (
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #e6e7ee" }}>
                    <span style={{ fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#7a7c8a", marginRight: "4px" }}>
                      Mentioned in
                    </span>
                    {list(v.backlinks).map((b, $i) => (
                      <Fragment key={$i}>
                        <button onClick={b?.open} title="Open box" style={{ border: "1px solid #cfe0d7", background: "#eef5f1", color: "#2f6f5e", fontSize: "13px", padding: "3px 10px", borderRadius: "999px", cursor: "pointer", fontFamily: "inherit" }} className="scpd">
                          {iv(b?.label)}
                        </button>
                      </Fragment>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
            {v.isRefsTab ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <input value={val(v.refFetch)} onChange={v.onRefFetch} onKeyDown={v.onRefFetchKey} placeholder="Paste a DOI, doi.org link, PubMed link or PMID" style={{ flex: "1", minWidth: "200px", border: "1px solid #dcdee6", background: "#fffefb", borderRadius: "8px", padding: "0 12px", height: "36px", fontSize: "14px", color: "#2a2724", boxSizing: "border-box" }} />
                  <button onClick={v.doRefFetch} style={{ border: "none", background: "#2f6f5e", color: "#fcfcfd", fontSize: "13px", fontWeight: "600", padding: "0 14px", height: "36px", borderRadius: "8px", cursor: "pointer" }}>
                    {iv(v.refBtnLabel)}
                  </button>
                </div>
                {v.refMsg ? (
                  <div style={{ fontSize: "12.5px", color: "#8a5a2a" }}>
                    {iv(v.refMsg)}
                  </div>
                ) : null}
              </div>
            ) : null}
            {v.notesEditBox ? (
              <textarea ref={v.notesAreaRef} onPaste={v.onNotesPaste} onBlur={v.onNotesBlur} onKeyDown={v.onNotesKey} value={val(v.modal?.text)} onChange={v.onTextChange} placeholder={v.modal?.placeholder} style={css(`width:100%;flex:${str(v.textareaGrow)};min-height:${str(v.textareaH)};box-sizing:border-box;resize:none;border:1px solid #dcdee6;border-radius:12px;padding:16px;font-size:15px;line-height:1.65;color:#2a2724;background:#fffefb`)} />
            ) : null}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "2px", flexWrap: "wrap", padding: "0 12px", position: "relative", zIndex: "1" }}>
              {list(v.pageTabs).map((p, $i) => (
                <Fragment key={$i}>
                  {p?.editing ? (
                    <input value={val(v.pageName)} onChange={v.onPageName} onKeyDown={v.onPageKey} onBlur={v.onPageBlur} onPointerDown={v.stop} autoFocus={true} style={{ marginTop: "-1px", height: "34px", width: "140px", boxSizing: "border-box", border: "1px solid #dcdee6", borderTop: "1px solid #fffefb", borderBottom: "3px solid #2f6f5e", borderRadius: "0 0 9px 9px", padding: "0 13px", fontSize: "13px", fontWeight: "700", color: "#2a2724", background: "#fffefb", outline: "none" }} />
                  ) : null}
                  {p?.notEditing ? (
                    <button data-page-tab={p?.idx} onPointerDown={p?.onDown} onClick={p?.onPick} onDoubleClick={p?.onRename} title="Click to open · double-click to rename · drag to reorder" style={css(`margin-top:-1px;display:flex;align-items:center;gap:7px;height:34px;padding:0 13px;box-sizing:border-box;border-radius:0 0 9px 9px;font-size:13px;cursor:pointer;white-space:nowrap;touch-action:none;user-select:none;${str(p?.style)}`)}>
                      <span>
                        {iv(p?.name)}
                      </span>
                      {p?.canDelete ? (
                        <span onClick={p?.onDelete} onPointerDown={v.stop} title="Delete this tab" style={{ fontSize: "15px", lineHeight: "1", color: "#8a8c9c", padding: "0 1px", fontWeight: "400" }} className="scpe">
                          ×
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                </Fragment>
              ))}
              <button onClick={v.addPage} title="Add a new tab to this box" style={{ margin: "6px 0 0 6px", height: "24px", padding: "0 9px", border: "1px dashed #b9bccb", borderRadius: "7px", background: "transparent", color: "#6a6c7e", fontSize: "12.5px", cursor: "pointer", whiteSpace: "nowrap" }} className="scpf">
                + Tab
              </button>
            </div>
            {v.hasRefsList ? (
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px", minWidth: "0" }}>
                {list(v.refsList).map((r, $i) => (
                  <Fragment key={$i}>
                    <div style={{ display: "flex", gap: "10px", fontSize: "13px", lineHeight: "1.5", color: "#2a2724" }}>
                      <span style={{ color: "#2f6f5e", fontWeight: "600", flexShrink: "0", minWidth: "24px" }}>
                        {"["}
                        {iv(r?.num)}
                        {"]"}
                      </span>
                      {r?.isLink ? (
                        <a href={r?.href} target="_blank" rel="noopener noreferrer" style={{ flex: "1", minWidth: "0", overflowWrap: "anywhere" }}>
                          {iv(r?.text)}
                        </a>
                      ) : null}
                      {r?.isText ? (
                        <span style={{ flex: "1", minWidth: "0", overflowWrap: "anywhere" }}>
                          {iv(r?.text)}
                        </span>
                      ) : null}
                    </div>
                  </Fragment>
                ))}
              </div>
            ) : null}
          </div>
          <div style={{ padding: "6px 26px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <button onClick={v.deleteNode} style={{ border: "none", background: "transparent", color: "#a15448", fontSize: "13px", padding: "0", cursor: "pointer", whiteSpace: "nowrap" }}>
                Delete box
              </button>
              <button onClick={v.makeTwin} title="Place a copy elsewhere on the map. Text you write in one copy shows up in all of them." style={{ border: "none", background: "transparent", color: "#2f6f5e", fontSize: "13px", fontWeight: "600", padding: "0", cursor: "pointer", whiteSpace: "nowrap" }}>
                ⧉ Linked copy
              </button>
              {v.modalHasTwin ? (
                <>
                  <span style={{ fontSize: "12px", color: "#6a6c7e", whiteSpace: "nowrap" }}>
                    {iv(v.modalTwinLabel)}
                  </span>
                  <button onClick={v.unTwin} title="Stop syncing this box with its copies" style={{ border: "none", background: "transparent", color: "#6a6c7e", fontSize: "12px", padding: "0", cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}>
                    Unlink
                  </button>
                </>
              ) : null}
            </div>
            <button onClick={v.closeModal} style={{ border: "none", background: "#2f6f5e", color: "#fcfcfd", fontSize: "13px", fontWeight: "600", padding: "9px 20px", borderRadius: "9px", cursor: "pointer" }}>
              Done
            </button>
          </div>
        </div>
      </div>
      {" "}
    </>
  );
}
