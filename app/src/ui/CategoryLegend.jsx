// Category legend (top right); category names can be edited here.
import { Fragment } from 'react';
import { css, iv, list, val, str } from './dc.js';

export default function CategoryLegend({ v }) {
  return (
    <>
      {" "}
      <div style={css(`position:absolute;right:20px;top:20px;background:#fcfcfd;border:1px solid #dcdee6;border-radius:12px;padding:6px 8px;box-shadow:0 2px 10px rgba(42,39,36,.06);display:flex;flex-direction:column;gap:6px;width:170px;${str(v.legendDyn)}`)}>
        <button onClick={v.toggleLegend} style={{ border: "none", background: "transparent", display: "flex", alignItems: "center", gap: "8px", padding: "4px", fontSize: "12px", color: "#5e6072", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
          <span style={{ display: "flex", gap: "3px" }}>
            {iv(v.legendDots)}
          </span>
          <span style={{ flex: "1" }}>
            Categories
          </span>
          <span style={{ fontSize: "10px" }}>
            {iv(v.legendArrow)}
          </span>
        </button>
        {v.legendOpen ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "0 4px 4px" }}>
            {list(v.legend).map((c, $i) => (
              <Fragment key={$i}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={css(`width:10px;height:10px;border-radius:3px;flex-shrink:0;background:${str(c?.color)}`)} />
                  <input value={val(c?.name)} onChange={c?.onRename} title="Rename category" style={{ flex: "1", minWidth: "0", border: "none", background: "transparent", fontSize: "13px", color: "#2a2724", padding: "2px 0" }} />
                </div>
              </Fragment>
            ))}
          </div>
        ) : null}
      </div>
      {" "}
    </>
  );
}
