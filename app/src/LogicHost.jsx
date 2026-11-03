// Runs a DCLogic class the way the old dc-runtime did (support.js
// StreamableComponent): the logic keeps its own synchronously updated state,
// lifecycle errors are logged instead of unmounting the page, and the template
// renders from {...props, ...logic.renderVals()}.
import React from 'react';

export default class LogicHost extends React.Component {
  constructor(props) {
    super(props);
    this.state = { __v: 0, __err: null };
    const { logic: Logic, template, ...userProps } = props;
    try { this.logic = new Logic(userProps); }
    catch (e) { console.error(e); this.ctorError = String((e && e.message) || e); this.logic = null; }
    if (this.logic) this.logic.__host = this;
  }
  static getDerivedStateFromError(e) { return { __err: e instanceof Error && e.message ? e.message : String(e) }; }
  componentDidCatch(e, info) { console.error('[Visual Notebook] render error:', e, (info && info.componentStack) || ''); }
  userProps() { const { logic, template, ...rest } = this.props; return rest; }
  __setLogicState(update, cb) {
    const prev = this.logic.state;
    const patch = typeof update === 'function' ? update(prev) : update;
    this.logic.state = { ...prev, ...patch };
    this.setState((s) => ({ __v: s.__v + 1 }), cb);
  }
  componentDidMount() { try { this.logic && this.logic.componentDidMount(); } catch (e) { console.error(e); } }
  componentDidUpdate(prevProps) {
    if (!this.logic) return;
    this.logic.props = this.userProps();
    try { this.logic.componentDidUpdate(prevProps); } catch (e) { console.error(e); }
  }
  componentWillUnmount() { try { this.logic && this.logic.componentWillUnmount(); } catch (e) { console.error(e); } }
  render() {
    const Template = this.props.template;
    const userProps = this.userProps();
    if (this.state.__err || !this.logic) {
      return <div className="sc-host sc-has-error"><div className="sc-logic-error">Visual Notebook: {this.state.__err || this.ctorError}</div></div>;
    }
    this.logic.props = userProps;
    let vals = userProps, renderErr = null;
    try { vals = { ...userProps, ...(this.logic.renderVals() || {}) }; }
    catch (e) { console.error(e); renderErr = 'Visual Notebook.renderVals(): ' + (e instanceof Error && e.message ? e.message : String(e)); }
    return (
      <div className={'sc-host' + (renderErr ? ' sc-has-error' : '')}>
        {renderErr && <div className="sc-logic-error">{renderErr}</div>}
        <Template v={vals} />
      </div>
    );
  }
}
