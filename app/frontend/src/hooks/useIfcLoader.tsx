import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";

export const useIfcLoader = (
  containerRef: RefObject<HTMLDivElement | null>,
  ifcApi: string
): { loadIfc: () => Promise<void> } => {
  const componentsRef = useRef<OBC.Components | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const height = entry.contentRect.height;

      console.log("ResizeObserver triggered, container height:", height);

      if (height > 0) {
        observer.disconnect();
        console.log("Initializing components...");

        const init = async () => {
          try {
            console.log("Starting components initialization...");
            const components = new OBC.Components();
            componentsRef.current = components;

            container.innerHTML = "";
            await components.init();

            const worlds = components.get(OBC.Worlds);
            const world = worlds.create();

            const scene = new OBC.SimpleScene(components);
            scene.setup();
            scene.three.background = null;

            const camera = new OBC.OrthoPerspectiveCamera(components);
            const renderer = new OBC.SimpleRenderer(components, container);
            renderer.resize();

            world.scene = scene;
            world.renderer = renderer;
            world.camera = camera;

            await camera.controls.setLookAt(78, 20, -2.2, 26, -4, 25);

            components.get(OBC.Grids).create(world);

            const ifcLoader = components.get(OBC.IfcLoader);
            console.log("IFC Loader retrieved:", ifcLoader);

            await ifcLoader.setup({
              autoSetWasm: false,
              wasm: {
                path: "/wasm/",
                absolute: false,
              },
            });

            const fragments = components.get(OBC.FragmentsManager);

            try {
              console.log("Fetching worker.mjs...");
              const workerBlob = await (
                await fetch(
                  "https://thatopen.github.io/engine_fragment/resources/worker.mjs"
                )
              ).blob();
              console.log("Worker.mjs fetched, creating URL...");

              const workerUrl = URL.createObjectURL(
                new File([workerBlob], "worker.mjs", {
                  type: "text/javascript",
                })
              );

              fragments.init(workerUrl);
              console.log("Worker initialized successfully");
            } catch (err) {
              console.error("Failed to load worker.mjs:", err);
            }

            camera.controls.addEventListener("rest", () => {
              fragments.core.update(true);
            });

            fragments.list.onItemSet.add(({ value: model }) => {
              model.useCamera(camera.three);
              scene.three.add(model.object);
              fragments.core.update(true);
            });

            BUI.Manager.init();

            const loadIfcHandler = () => {
              console.log("Load IFC button clicked");
              loadIfc();
            };

            const [panel] = BUI.Component.create<BUI.Panel, {}>((_) => {
              return BUI.html`
                <bim-panel active label="IFC Loader" style="position: absolute; top: 10px; right: 10px; z-index: 1000;">
                  <bim-panel-section>
                    <bim-button label="Load IFC" @click=${loadIfcHandler}></bim-button>
                  </bim-panel-section>
                </bim-panel>
              `;
            }, {});

            panelRef.current = panel;
            container.appendChild(panel);
            console.log("Panel appended");
          } catch (error) {
            console.error("Error initializing components:", error);
          }
        };

        init();
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (panelRef.current && panelRef.current.parentNode) {
        panelRef.current.parentNode.removeChild(panelRef.current);
      }
      if (componentsRef.current) {
        try {
          componentsRef.current.dispose();
        } catch {}
      }
    };
  }, [containerRef]);

  const loadIfc = async () => {
    if (!componentsRef.current) {
      console.warn("Components not initialized yet");
      return;
    }

    try {
      console.log("Starting IFC load from:", ifcApi);
      const ifcLoader = componentsRef.current.get(OBC.IfcLoader);
      console.log("IFC Loader available:", ifcLoader);

      const resp = await fetch(ifcApi);
      console.log("Fetch response received", resp);

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const arrayBuffer = await resp.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      console.log("Buffer loaded, starting IFC loader...");
      console.log(
        "Preparing to load IFC buffer, buffer length:",
        buffer.length
      );

      // טוען את המודל
      await ifcLoader.load(buffer, false, "model", {
        processData: {
          progressCallback: (progress) => {
            console.log(`IFC loading progress: ${progress}%`);
          },
        },
      });

      console.log("IFC load() promise resolved successfully");
      console.log("IFC load completed");
    } catch (err) {
      console.error("Error loading IFC:", err);
    }
  };

  return { loadIfc };
};
