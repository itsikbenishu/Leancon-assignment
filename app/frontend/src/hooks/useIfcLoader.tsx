import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import Stats from "stats.js";

export const useIfcLoader = (
  containerRef: RefObject<HTMLDivElement | null>,
  ifcApi: string
): { loadIfc: () => Promise<void> } => {
  const componentsRef = useRef<OBC.Components | null>(null);

  useEffect(() => {
    const init = async () => {
      const components = new OBC.Components();
      componentsRef.current = components;

      const container = containerRef.current;
      if (!container) return;

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

      components.init();

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

      const workerBlob = await (
        await fetch(
          "https://thatopen.github.io/engine_fragment/resources/worker.mjs"
        )
      ).blob();
      const workerUrl = URL.createObjectURL(
        new File([workerBlob], "worker.mjs", { type: "text/javascript" })
      );

      fragments.init(workerUrl);

      camera.controls.addEventListener("rest", () => {
        fragments.core.update(true);
      });

      fragments.list.onItemSet.add(({ value: model }) => {
        model.useCamera(camera.three);
        scene.three.add(model.object);
        fragments.core.update(true);
      });

      // UI Panel
      BUI.Manager.init();
      const [panelElement] = BUI.Component.create(() => {
        const loadBtn = BUI.html`<bim-button label="Load IFC" @click=${loadIfc}></bim-button>`;
        return BUI.html`<bim-panel active label="IFC Loader">
          <bim-panel-section>${loadBtn}</bim-panel-section>
        </bim-panel>`;
      }, {});

      console.log("panel is:", panelElement);

      document.body.append(panelElement);

      // Stats
      const stats = new Stats();
      stats.showPanel(2);
      document.body.append(stats.dom);

      renderer.onBeforeUpdate.add(() => stats.begin());
      renderer.onAfterUpdate.add(() => stats.end());
    };

    init();
  }, [containerRef]);

  const loadIfc = async () => {
    if (!componentsRef.current) return;

    const ifcLoader = componentsRef.current.get(OBC.IfcLoader);
    const resp = await fetch(ifcApi);
    const arrayBuffer = await resp.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    await ifcLoader.load(buffer, false, "model", {
      processData: {
        progressCallback: (p: number) => console.log("loading:", p),
      },
    });
  };

  return { loadIfc };
};
