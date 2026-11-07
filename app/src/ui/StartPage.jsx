// Start page: all maps as cards, grouped by folder, with search and "+ New map".
// Shown when the site is opened. Recently opened maps come first.
export default function StartPage({ v }) {
  const st = v.start;
  return (
    <div className="vn-start">
      <div className="vn-start-inner">
        <header className="vn-start-head">
          <div>
            <h1>Your maps</h1>
            <p>{st.count === 1 ? '1 map' : st.count + ' maps'} · open one, or start a new map</p>
          </div>
          <input className="vn-start-search" type="search" value={st.query} onChange={v.startQuery} placeholder="Search maps" aria-label="Search maps" />
        </header>
        {st.recent.length ? (
          <section className="vn-start-recent">
            <h2>Recently opened</h2>
            <div className="vn-start-grid">
              {st.recent.map(m => (
                <button key={'r' + m.id} type="button" className={'vn-start-card' + (m.current ? ' current' : '')} onClick={() => v.startOpenMap(m.id)} title={m.title}>
                  <span className="vn-start-title">{m.title}</span>
                  <span className="vn-start-meta">{(m.boxes === 1 ? '1 box' : m.boxes + ' boxes') + ' · ' + m.meta}</span>
                  {m.current ? <span className="vn-start-badge">Last opened</span> : null}
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {!st.query.trim() ? <h2 className="vn-start-all">All maps</h2> : null}
        {!st.query.trim() ? (
          <div className="vn-start-grid vn-start-top">
            <button type="button" className="vn-start-card vn-start-new" onClick={v.startNewMap}>
              <span className="vn-start-plus">+</span>
              <span className="vn-start-title">New map</span>
            </button>
          </div>
        ) : null}
        {st.groups.map(g => (
          <section key={g.id || 'loose'} className="vn-start-group">
            {g.name ? <h2>{g.id ? <span className="vn-start-folder" aria-hidden="true" /> : null}{g.name}<span className="vn-start-count">{g.maps.length}</span></h2> : null}
            <div className="vn-start-grid">
              {g.maps.map(m => (
                <button key={m.id} type="button" className={'vn-start-card' + (m.current ? ' current' : '')} onClick={() => v.startOpenMap(m.id)} title={m.title}>
                  <span className="vn-start-title">{m.title}</span>
                  <span className="vn-start-meta">{(m.boxes === 1 ? '1 box' : m.boxes + ' boxes') + (m.meta ? ' · ' + m.meta : '')}</span>
                  {m.current ? <span className="vn-start-badge">Last opened</span> : null}
                </button>
              ))}
            </div>
          </section>
        ))}
        {st.empty && st.query.trim() ? <p className="vn-start-none">No maps match “{st.query.trim()}”.</p> : null}
      </div>
    </div>
  );
}
