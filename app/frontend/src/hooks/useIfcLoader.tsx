import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";

export const useIfcLoader = (
  containerRef: RefObject<HTMLDivElement | null>,
  ifcApi: string
): { loadIfc: () => Promise<void> } => {
  const componentsRef = useRef<OBC.Components | null>(null);
  const statsRef = useRef<Stats | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const components = new OBC.Components();
        componentsRef.current = components;

        const container = containerRef.current;
        if (!container) {
          return;
        }

        container.innerHTML = "";
        await components.init();

        const worlds = components.get(OBC.Worlds);
        const world = worlds.create();

        const scene = new OBC.SimpleScene(components);
        scene.setup();
        scene.three.background = null;

        const camera = new OBC.OrthoPerspectiveCamera(components);
        const renderer = new OBC.SimpleRenderer(components, container);

        world.scene = scene;
        world.renderer = renderer;
        world.camera = camera;

        await camera.controls.setLookAt(78, 20, -2.2, 26, -4, 25);

        components.get(OBC.Grids).create(world);

        const ifcLoader = components.get(OBC.IfcLoader);
        await ifcLoader.setup({
          autoSetWasm: false,
          wasm: {
            path: "https://unpkg.com/web-ifc@0.0.69/",
            absolute: true,
          },
        });

        const fragments = components.get(OBC.FragmentsManager);

        try {
          const workerBlob = await (
            await fetch(
              "https://thatopen.github.io/engine_fragment/resources/worker.mjs"
            )
          ).blob();

          const workerUrl = URL.createObjectURL(
            new File([workerBlob], "worker.mjs", { type: "text/javascript" })
          );

          fragments.init(workerUrl);
        } catch {}

        camera.controls.addEventListener("rest", () => {
          fragments.core.update(true);
        });

        fragments.list.onItemSet.add(({ value: model }) => {
          model.useCamera(camera.three);
          scene.three.add(model.object);
          fragments.core.update(true);
        });

        BUI.Manager.init();
        const loadIfcHandler = () => loadIfc();

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

        const stats = new Stats();
        statsRef.current = stats;
        stats.showPanel(2);
        stats.dom.style.position = "absolute";
        stats.dom.style.top = "10px";
        stats.dom.style.left = "10px";
        stats.dom.style.zIndex = "1000";
        container.appendChild(stats.dom);

        renderer.onBeforeUpdate.add(() => {
          stats.begin();
        });
        renderer.onAfterUpdate.add(() => {
          stats.end();
        });
      } catch {}
    };

    init();

    return () => {
      if (panelRef.current && panelRef.current.parentNode) {
        panelRef.current.parentNode.removeChild(panelRef.current);
      }
      if (statsRef.current && statsRef.current.dom.parentNode) {
        statsRef.current.dom.parentNode.removeChild(statsRef.current.dom);
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
      return;
    }

    try {
      const ifcLoader = componentsRef.current.get(OBC.IfcLoader);
      const resp = await fetch(ifcApi);
      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const arrayBuffer = await resp.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      await ifcLoader.load(buffer, false, "model", {
        processData: {
          progressCallback: () => {},
        },
      });
    } catch {}
  };

  return { loadIfc };
};
