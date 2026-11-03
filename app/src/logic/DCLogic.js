// Base class with the same contract the old dc-runtime gave the logic class
// (support.js StreamableLogic): this.state is updated synchronously by
// setState and the host component re-renders afterwards.
export class DCLogic {
  constructor(props) {
    this.props = props || {};
    this.state = {};
    this.__host = undefined; // installed by LogicHost after construction
  }
  setState(update, cb) { this.__host && this.__host.__setLogicState(update, cb); }
  forceUpdate() { this.__host && this.__host.forceUpdate(); }
  componentDidMount() {}
  componentDidUpdate(_prevProps) {}
  componentWillUnmount() {}
  renderVals() { return {}; }
}
