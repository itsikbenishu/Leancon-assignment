import { useEffect, useRef, useState, useCallback } from "react";
import type { RefObject } from "react";
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import * as FRAGS from "@thatopen/fragments";
import * as THREE from "three";
import { useIfcDataTable } from "./useIfcDataTable";

export const useIfcLoader = (
  containerRef: RefObject<HTMLDivElement | null>,
  ifcApi: string
): { loadIfc: () => Promise<void> } => {
  const componentsRef = useRef<OBC.Components | null>(null);
  const worldRef = useRef<OBC.World | null>(null);
  const loaderPanelRef = useRef<HTMLElement | null>(null);
  const quantitiesPanelRef = useRef<HTMLElement | null>(null);
  const fragmentsRef = useRef<FRAGS.FragmentsModels | null>(null);
  const [fragmentBytesRef, setFragmentBytesRef] = useState<ArrayBuffer | null>(
    null
  );

  const [componentsInitialized, setComponentsInitialized] = useState(false);

  const dataTableHook = useIfcDataTable(
    componentsInitialized ? componentsRef.current : null,
    componentsInitialized ? worldRef.current : null
  );

  const createQuantitiesPanel = useCallback(() => {
    if (!componentsInitialized || !dataTableHook) return;
    dataTableHook.initializeHighlighter();
    const quantitiesPanel = dataTableHook.createQuantitiesPanel();
    if (quantitiesPanel && containerRef.current) {
      quantitiesPanelRef.current = quantitiesPanel;
      containerRef.current.appendChild(quantitiesPanel);
    }
  }, [componentsInitialized, dataTableHook, containerRef]);

  useEffect(() => {
    if (componentsInitialized) {
      const timer = setTimeout(() => createQuantitiesPanel(), 200);
      return () => clearTimeout(timer);
    }
  }, [componentsInitialized, createQuantitiesPanel]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const height = entries[0].contentRect.height;
      if (height > 0) {
        observer.disconnect();

        const init = async () => {
          try {
            const components = new OBC.Components();
            componentsRef.current = components;
            container.innerHTML = "";
            await components.init();

            const worlds = components.get(OBC.Worlds);
            const world = worlds.create<
              OBC.SimpleScene,
              OBC.SimpleCamera,
              OBC.SimpleRenderer
            >();
            worldRef.current = world;

            world.scene = new OBC.SimpleScene(components);
            world.scene.setup();
            world.scene.three.background = null;

            world.renderer = new OBC.SimpleRenderer(components, container);
            world.camera = new OBC.SimpleCamera(components);
            // world.camera.controls.setLookAt(74, 16, 0.2, 30, -4, 27);
            components.get(OBC.Grids).create(world);

            const githubUrl =
              "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
            const fetchedUrl = await fetch(githubUrl);
            const workerBlob = await fetchedUrl.blob();
            const workerFile = new File([workerBlob], "worker.mjs", {
              type: "text/javascript",
            });
            const workerUrl = URL.createObjectURL(workerFile);

            const fragments = new FRAGS.FragmentsModels(workerUrl);
            fragmentsRef.current = fragments;

            world.camera.controls.addEventListener("rest", () => {
              fragments.update(true);
            });

            BUI.Manager.init();

            const [loaderPanel] = BUI.Component.create<BUI.Panel, {}>((_) => {
              return BUI.html`
                <bim-panel 
                  active 
                  label="IFC Loader" 
                  style="position: absolute; top: 10px; right: 10px; z-index: 1000;">
                  <bim-panel-section>
                    <bim-button label="Load IFC" @click=${loadIfc}></bim-button>
                  </bim-panel-section>
                </bim-panel>
              `;
            }, {});

            loaderPanelRef.current = loaderPanel;
            container.appendChild(loaderPanel);

            setComponentsInitialized(true);
          } catch (err) {
            console.error("Error during initialization:", err);
          }
        };

        init();
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      loaderPanelRef.current?.remove();
      quantitiesPanelRef.current?.remove();
      componentsRef.current?.dispose();
    };
  }, [containerRef]);

  const loadIfc = async () => {
    if (!componentsRef.current || !worldRef.current || !fragmentsRef.current)
      return;

    try {
      const serializer = new FRAGS.IfcImporter();
      serializer.wasm = {
        absolute: true,
        path: "https://unpkg.com/web-ifc@0.0.70/",
      };
      const response = await fetch(ifcApi);
      if (!response.ok) throw new Error("Failed to fetch IFC file");

      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      const fragmentBytes = await serializer
        .process({
          bytes,
          progressCallback: (progress, data) =>
            console.log(`Progress: ${progress}`, JSON.stringify(data, null, 2)),
        })
        .catch((err) => {
          console.error("Error in serializer.process:", err, err.stack);
          throw err;
        });

      setFragmentBytesRef(fragmentBytes);

      const model = await fragmentsRef.current.load(fragmentBytes, {
        modelId: "example",
      });

      model.useCamera(worldRef.current.camera.three as THREE.PerspectiveCamera);
      worldRef.current.scene.three.add(model.object);
      await fragmentsRef.current.update(true);

      console.log("IFC model loaded and added to scene.");
    } catch (err: Error | any) {
      console.error("Failed to load IFC:", err, err.stack);
    }
  };
  return { loadIfc };
};
