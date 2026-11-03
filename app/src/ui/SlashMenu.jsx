// The "/" menu for linking to another box, shown while typing in a notes editor
// (box dialog or notebook view).
import { Fragment } from 'react';
import { css, iv, list, str } from './dc.js';

export default function SlashMenu({ v }) {
  return (
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
  );
}
