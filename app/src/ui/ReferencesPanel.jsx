// All references in the map, each with the boxes that cite it.
import { Fragment } from 'react';
import { css, iv, list, str } from './dc.js';

export default function ReferencesPanel({ v }) {
  return (
    <>
      {" "}
      <div data-pop="refs" style={css(`position:absolute;right:20px;top:80px;bottom:20px;z-index:8;width:min(400px,calc(100% - 24px));display:flex;flex-direction:column;background:#fcfcfd;border:1px solid #dcdee6;border-radius:14px;box-shadow:0 12px 36px rgba(42,39,36,.14);overflow:hidden;${str(v.refsDyn)}`)}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 14px 10px 18px", borderBottom: "1px solid #ebecf2" }}>
          <div style={{ flex: "1", minWidth: "0" }}>
            {" "}
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#2a2724" }}>
              References
            </div>
            {" "}
            <div style={{ fontSize: "12px", color: "#6a6c7e" }}>
              {iv(v.refCountLabel)}
            </div>
            {" "}
          </div>
          <button onClick={v.copyRefs} style={{ border: "1px solid #dcdee6", background: "#fcfcfd", color: "#2a2724", fontSize: "12px", padding: "0 10px", height: "32px", borderRadius: "8px", cursor: "pointer" }} className="scp9">
            {iv(v.copyRefsLabel)}
          </button>
          <button onClick={v.closeRefs} title="Close" style={{ border: "none", background: "transparent", color: "#6a6c7e", fontSize: "18px", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer" }} className="scp9">
            ×
          </button>
        </div>
        <div style={{ flex: "1", overflowY: "auto", padding: "4px 18px 14px" }}>
          {" "}
          {v.refEmpty ? (
            <>
              {" "}
              <div style={{ fontSize: "13px", color: "#6a6c7e", fontStyle: "italic", padding: "14px 0" }}>
                No references in this map yet.
              </div>
              {" "}
            </>
          ) : null}
          {" "}
          {list(v.refList).map((r, $i) => (
            <Fragment key={$i}>
              {" "}
              <div style={{ display: "grid", gridTemplateColumns: "26px minmax(0,1fr)", gap: "4px 6px", padding: "10px 0", borderBottom: "1px solid #ebecf2" }}>
                <div style={{ fontSize: "12px", color: "#6a6c7e", fontVariantNumeric: "tabular-nums", paddingTop: "2px" }}>
                  {iv(r?.num)}
                  {"."}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "0" }}>
                  {r?.hasHref ? (
                    <a href={r?.href} target="_blank" rel="noopener" style={{ fontSize: "14px", lineHeight: "1.45", overflowWrap: "anywhere", textDecoration: "none" }}>
                      {iv(r?.text)}
                    </a>
                  ) : null}
                  {r?.noHref ? (
                    <div style={{ fontSize: "14px", lineHeight: "1.45", color: "#2a2724", overflowWrap: "anywhere" }}>
                      {iv(r?.text)}
                    </div>
                  ) : null}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {list(r?.boxes).map((b, $i) => (
                      <Fragment key={$i}>
                        <button onClick={b?.onGo} title="Show this box" style={{ border: "1px solid #dcdee6", background: "#f1f2f6", color: "#5e6072", fontSize: "11px", padding: "2px 8px", borderRadius: "999px", cursor: "pointer", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="scpa">
                          {iv(b?.label)}
                        </button>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
              {" "}
            </Fragment>
          ))}
          {" "}
        </div>
      </div>
      {" "}
    </>
  );
}
