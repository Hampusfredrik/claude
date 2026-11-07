// Left sidebar: map list and folders, search across all maps, account and theme.
import { Fragment } from 'react';
import { css, iv, list, val, str } from './dc.js';

export default function Sidebar({ v }) {
  return (
    <>
      {v.mobileBackdrop ? (
        <div onClick={v.toggleSidebar} style={{ position: "fixed", inset: "0", background: "rgba(42,39,36,.25)", zIndex: "30" }} />
      ) : null}
      <div style={css(`width:310px;flex-shrink:0;height:100%;box-sizing:border-box;background:#e6e7ee;border-right:1px solid #dcdee6;display:flex;flex-direction:column;${str(v.sidebarDyn)}`)}>
        <div style={{ padding: "22px 18px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <div style={{ fontFamily: "Karla,sans-serif", fontWeight: "600", fontSize: "21px", color: "#2a2724" }}>
            Notebook
          </div>
          <button onClick={v.toggleSidebar} title="Hide maps" style={{ border: "none", background: "transparent", color: "#6a6c7e", fontSize: "18px", width: "28px", height: "28px", borderRadius: "6px", cursor: "pointer" }} className="scp0">
            ‹
          </button>
        </div>
        <div style={{ padding: "0 14px 10px", position: "relative" }}>
          {" "}
          <input value={val(v.query)} onChange={v.onQuery} placeholder="Search all maps" style={{ width: "100%", boxSizing: "border-box", border: "1px solid #dcdee6", background: "#fcfcfd", borderRadius: "9px", padding: "8px 30px 8px 11px", fontSize: "13px", color: "#2a2724" }} />
          {" "}
          {v.searching ? (
            <>
              {" "}
              <button onClick={v.clearQuery} title="Clear" style={{ position: "absolute", right: "20px", top: "5px", border: "none", background: "transparent", color: "#7e8091", fontSize: "15px", width: "24px", height: "24px", cursor: "pointer" }}>
                ×
              </button>
              {" "}
            </>
          ) : null}
          {" "}
        </div>
        {v.searching ? (
          <div style={{ flex: "1", minHeight: "0", overflowY: "auto", padding: "0 10px 14px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {list(v.results).map((r, $i) => (
              <Fragment key={$i}>
                <div onClick={r?.onOpen} style={{ padding: "9px 10px", borderRadius: "9px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "3px" }} className="scp1">
                  <div style={{ fontSize: "11px", color: "#7e8091", textTransform: "uppercase", letterSpacing: ".04em" }}>
                    {iv(r?.map)}
                  </div>
                  <div style={{ fontSize: "14px", color: "#2a2724" }}>
                    {iv(r?.label)}
                  </div>
                  {r?.hasSnippet ? (
                    <div style={{ fontSize: "12px", color: "#5e6072", lineHeight: "1.45" }}>
                      {iv(r?.snippet)}
                    </div>
                  ) : null}
                </div>
              </Fragment>
            ))}
            {v.noResults ? (
              <div style={{ padding: "10px", fontSize: "13px", color: "#7e8091" }}>
                No matches.
              </div>
            ) : null}
          </div>
        ) : null}
        {v.notSearching ? (
          <>
            <div style={{ padding: "0 14px 12px", display: "flex", gap: "6px" }}>
              <button onClick={v.newMap} style={{ flex: "1", border: "1px dashed #c3c6d4", background: "transparent", color: "#2f6f5e", fontSize: "13px", fontWeight: "600", padding: "9px 0", borderRadius: "9px", cursor: "pointer" }} className="scp1">
                + New map
              </button>
              <button onClick={v.newFolder} style={{ flex: "1", border: "1px dashed #c3c6d4", background: "transparent", color: "#2f6f5e", fontSize: "13px", fontWeight: "600", padding: "9px 0", borderRadius: "9px", cursor: "pointer" }} className="scp1">
                + New folder
              </button>
            </div>
            <div style={{ flex: "1", minHeight: "0", overflowY: "auto", padding: "0 10px 14px", display: "flex", flexDirection: "column", gap: "2px" }}>
              {list(v.rows).map((m, $i) => (
                <Fragment key={$i}>
                  {m?.isFolder ? (
                    <div onClick={m?.onToggle} draggable={m?.fDraggable} onDragStart={m?.onFDragStart} onDragOver={m?.onFDragOver} onDrop={m?.onFDrop} onDragEnd={m?.onDragEnd} style={css(`display:flex;align-items:center;gap:6px;padding:8px 8px 8px 10px;margin-top:12px;border-radius:9px;cursor:pointer;background:#dcdeea;border:1px solid #cacdda;${str(m?.fDyn)}`)} className="vn-folderrow scp2">
                      <span style={{ fontSize: "11px", color: "#46485a", width: "12px", flexShrink: "0" }}>
                        {iv(m?.fArrow)}
                      </span>
                      {m?.fClosed ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2f6f5e" strokeWidth="1.8" strokeLinejoin="round" style={{ flexShrink: "0" }}>
                          <path d="M3 7.5V18a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 18V9a1.5 1.5 0 0 0-1.5-1.5H12l-2-2.5H4.5A1.5 1.5 0 0 0 3 6.5z" />
                        </svg>
                      ) : null}
                      {m?.fOpen ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2f6f5e" strokeWidth="1.8" strokeLinejoin="round" style={{ flexShrink: "0" }}>
                          <path d="M3 18V6.5A1.5 1.5 0 0 1 4.5 5H10l2 2.5h6.5A1.5 1.5 0 0 1 20 9v1.5" />
                          <path d="M3 18l2.6-6.4A1.5 1.5 0 0 1 7 10.5h13.6a1 1 0 0 1 .93 1.37L19 18.5a1.5 1.5 0 0 1-1.4 1H4.5A1.5 1.5 0 0 1 3 18z" />
                        </svg>
                      ) : null}
                      {m?.fNotRenaming ? (
                        <div onDoubleClick={m?.onFStartRename} title={m?.fName} style={{ flex: "1", minWidth: "0", fontSize: "14px", fontWeight: "600", color: "#2a2724", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {iv(m?.fName)}
                        </div>
                      ) : null}
                      {m?.fRenaming ? (
                        <input ref={m?.renameRef} value={val(m?.fRenameValue)} onChange={m?.onFRenameChange} onBlur={m?.onFRenameDone} onKeyDown={m?.onFRenameKey} onClick={v.stop} style={{ flex: "1", minWidth: "0", boxSizing: "border-box", border: "1px solid #dcdee6", background: "#fcfcfd", borderRadius: "6px", padding: "3px 6px", fontSize: "13px", color: "#2a2724" }} />
                      ) : null}
                      <span style={{ fontSize: "11px", color: "#7e8091" }}>
                        {iv(m?.fCount)}
                      </span>
                      <button onClick={m?.onFAdd} title="New map in this folder" data-rowbtn="" style={{ border: "none", background: "transparent", color: "#a2a4b4", fontSize: "15px", width: "22px", height: "22px", borderRadius: "6px", cursor: "pointer", flexShrink: "0" }} className="scp3">
                        +
                      </button>
                      <button onClick={m?.onFStartRename} title="Rename folder" data-rowbtn="" style={{ border: "none", background: "transparent", color: "#a2a4b4", fontSize: "12px", width: "22px", height: "22px", borderRadius: "6px", cursor: "pointer", flexShrink: "0" }} className="scp4">
                        ✎
                      </button>
                      <button onClick={m?.onFDelete} title="Delete folder" data-rowbtn="" style={{ border: "none", background: "transparent", color: "#a2a4b4", fontSize: "14px", width: "22px", height: "22px", borderRadius: "6px", cursor: "pointer", flexShrink: "0" }} className="scp5">
                        ×
                      </button>
                    </div>
                  ) : null}
                  {m?.isZone ? (
                    <div onDragOver={m?.onZOver} onDrop={m?.onZDrop} style={css(`padding:6px 10px;border-radius:9px;font-size:12px;color:#7e8091;${str(m?.zDyn)}`)}>
                      {iv(m?.zoneText)}
                    </div>
                  ) : null}
                  {m?.isMap ? (
                    <div onClick={m?.onOpen} draggable={m?.draggable} onDragStart={m?.onDragStart} onDragOver={m?.onDragOver} onDrop={m?.onDrop} onDragEnd={m?.onDragEnd} style={css(`display:flex;align-items:center;gap:8px;padding:8px 6px 8px 11px;border-radius:9px;cursor:pointer;background:#eaf3ee;border:1px solid #c9dfd2;border-color:#c9dfd2;margin-top:5px;${str(m?.dyn)}`)} className="vn-maprow scp1">
                      <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" }}>
                        {m?.notRenaming ? (
                          <div onDoubleClick={m?.onStartRename} title={m?.title} style={css(`font-size:14.5px;color:#2a2724;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${str(m?.titleDyn)}`)}>
                            {iv(m?.title)}
                          </div>
                        ) : null}
                        {m?.renaming ? (
                          <input ref={m?.renameRef} value={val(m?.renameValue)} onChange={m?.onRenameChange} onBlur={m?.onRenameDone} onKeyDown={m?.onRenameKey} onClick={v.stop} style={{ width: "100%", boxSizing: "border-box", border: "1px solid #dcdee6", background: "#fcfcfd", borderRadius: "6px", padding: "3px 6px", fontSize: "14px", color: "#2a2724" }} />
                        ) : null}
                        <div style={{ fontSize: "11.5px", color: "#5e6072" }}>
                          {iv(m?.meta)}
                        </div>
                      </div>
                      <button onClick={m?.onStartRename} title="Rename map" data-rowbtn="" style={{ border: "none", background: "transparent", color: "#a2a4b4", fontSize: "13px", width: "24px", height: "24px", borderRadius: "6px", cursor: "pointer", flexShrink: "0" }} className="scp4">
                        ✎
                      </button>
                      <button onClick={m?.onDelete} title="Delete map" data-rowbtn="" style={{ border: "none", background: "transparent", color: "#a2a4b4", fontSize: "15px", width: "24px", height: "24px", borderRadius: "6px", cursor: "pointer", flexShrink: "0" }} className="scp5">
                        ×
                      </button>
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>
          </>
        ) : null}
        <div style={{ padding: "12px 14px", borderTop: "1px solid #dcdee6", display: "flex", flexDirection: "column", gap: "8px" }}>
          {v.recovering ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "12px", color: "#5e6072" }}>
                Choose a new password
              </div>
              <input value={val(v.newPw)} onChange={v.onNewPw} type="password" autoComplete="new-password" placeholder="New password" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", color: "#2a2724" }} />
              <button onClick={v.setNewPassword} style={{ border: "none", background: "#2f6f5e", color: "#fcfcfd", fontSize: "12px", fontWeight: "600", padding: "8px 0", borderRadius: "8px", cursor: "pointer" }}>
                Save password
              </button>
            </div>
          ) : null}
          {v.signedIn ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={css(`width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${str(v.syncDot)}`)} />
              <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "12px", color: "#2a2724", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {iv(v.syncEmail)}
                </div>
                <div style={{ fontSize: "11px", color: "#7e8091" }}>
                  {iv(v.syncStatusLabel)}
                </div>
              </div>
              <button onClick={v.signOut} style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#5e6072", fontSize: "11px", padding: "4px 8px", borderRadius: "7px", cursor: "pointer" }}>
                Sign out
              </button>
            </div>
          ) : null}
          {v.signedOut ? (
            <>
              {v.loginClosed ? (
                <button onClick={v.openLogin} style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2f6f5e", fontSize: "13px", fontWeight: "600", padding: "8px 0", borderRadius: "9px", cursor: "pointer" }}>
                  Sign in to sync
                </button>
              ) : null}
              {v.loginOpen ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ fontSize: "12px", color: "#5e6072", lineHeight: "1.45" }}>
                    {iv(v.loginIntro)}
                  </div>
                  <input value={val(v.loginEmail)} onChange={v.onLoginEmail} placeholder="Email" type="email" autoComplete="email" style={{ border: "1px solid #dcdee6", background: "#fcfcfd", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", color: "#2a2724" }} />
                  <input value={val(v.loginPw)} onChange={v.onLoginPw} onKeyDown={v.onLoginKey} placeholder="Password" type="password" autoComplete={v.pwAutocomplete} style={{ border: "1px solid #dcdee6", background: "#fcfcfd", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", color: "#2a2724" }} />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={v.loginPrimary} style={{ flex: "1", border: "none", background: "#2f6f5e", color: "#fcfcfd", fontSize: "12px", fontWeight: "600", padding: "8px 0", borderRadius: "8px", cursor: "pointer" }}>
                      {iv(v.loginBtn)}
                    </button>
                    <button onClick={v.closeLogin} style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#5e6072", fontSize: "12px", padding: "0 10px", borderRadius: "8px", cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "6px" }}>
                    <button onClick={v.toggleSignup} style={{ border: "none", background: "transparent", color: "#2f6f5e", fontSize: "12px", padding: "0", cursor: "pointer", textAlign: "left" }}>
                      {iv(v.switchLabel)}
                    </button>
                    <button onClick={v.forgotPw} style={{ border: "none", background: "transparent", color: "#6a6c7e", fontSize: "12px", padding: "0", cursor: "pointer" }}>
                      Forgot password?
                    </button>
                  </div>
                  {v.hasLoginMsg ? (
                    <div style={{ fontSize: "12px", color: "#5e6072", lineHeight: "1.45" }}>
                      {iv(v.loginMsg)}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        <div style={{ padding: "0 18px 10px", display: "flex" }}>
          <button onClick={v.toggleTheme} title="Switch between light and dark mode" style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #dcdee6", background: "#fcfcfd", color: "#5e6072", fontSize: "12px", padding: "6px 10px", borderRadius: "8px", cursor: "pointer" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid #5e6072", background: "linear-gradient(90deg,#5e6072 50%,transparent 50%)" }} />
            <span>
              {iv(v.themeLabel)}
            </span>
          </button>
        </div>
        <div style={{ padding: "0 18px 14px", fontSize: "11px", color: "#7e8091", lineHeight: "1.5" }}>
          Double-click or ✎ to rename. Drag maps onto a folder to file them; drag folders to reorder.
        </div>
      </div>
    </>
  );
}
