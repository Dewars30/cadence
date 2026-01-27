import "./App.css";
import { useEffect } from "react";
import { CadenceCanvas } from "./components/CadenceCanvas";
import { NodeInspector } from "./components/NodeInspector";
import { useCadenceStore } from "./state/useCadenceStore";

function App() {
  const init = useCadenceStore((s) => s.init);
  const initializing = useCadenceStore((s) => s.initializing);
  const error = useCadenceStore((s) => s.error);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="cadence-app">
      <header className="cadence-header">
        <div className="cadence-header__title">Cadence MVP</div>
        <div className="cadence-header__status">
          {initializing ? "Initializing…" : error ? "Error" : "Ready"}
        </div>
      </header>
      {error ? (
        <div className="cadence-error">{error}</div>
      ) : (
        <div className="cadence-main">
          <CadenceCanvas />
          <NodeInspector />
        </div>
      )}
    </div>
  );
}

export default App;
