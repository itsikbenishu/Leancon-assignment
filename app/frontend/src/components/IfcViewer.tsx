import { useRef } from "react";
import { useIfcLoader } from "../hooks/useIfcLoader";

export default function IfcViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // const ifcApi = "/api/basic_structure/download";
  // const ifcApi =
  //   "https://thatopen.github.io/engine_fragment/resources/ifc/school_str.ifc";
  const ifcApi = "/api/system_model/download";

  useIfcLoader(containerRef, ifcApi);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vh",
        height: "100vh",
        backgroundColor: "#1e1e1e",
        position: "relative",
      }}
    />
  );
}
