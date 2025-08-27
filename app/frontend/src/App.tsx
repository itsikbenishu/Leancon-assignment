import { useState } from "react";
import "./App.css";
import IfcViewer from "./components/IfcViewer";

function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const greet = async () => {
    const res = await fetch(`http://localhost:8000/greet?name=${name}`);
    const data = await res.json();
    setMessage(data.message);
  };

  return (
    <>
      <IfcViewer />
      {/* <div style={{ textAlign: "center", marginTop: "2em" }}>
        <h1>שלום לך!</h1>
        <input
          type="text"
          placeholder="הכנס שם"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={greet}>שלח</button>
        <p>{message}</p>
      </div> */}
    </>
  );
}

export default App;
