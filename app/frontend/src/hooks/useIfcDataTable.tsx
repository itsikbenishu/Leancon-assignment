import { useCallback, useRef } from "react";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as BUI from "@thatopen/ui";
import * as THREE from "three";
import type { ElementQuantityTableData, ElementData } from "../types/ifcTypes";

export const useIfcDataTable = (
  components: OBC.Components | null,
  world: OBC.World | null
) => {
  const highlighterRef = useRef<OBF.Highlighter | null>(null);
  const exampleLevels = ["Level 1", "Level 2", "Level 3"];

  const initializeHighlighter = useCallback(() => {
    if (!components || !world || highlighterRef.current)
      return highlighterRef.current;

    const highlighter = components.get(OBF.Highlighter) as OBF.Highlighter;

    highlighter.setup({
      world,
      selectMaterialDefinition: {
        color: new THREE.Color("#bcf124"),
        opacity: 1,
        transparent: false,
        renderedFaces: 0,
      },
    });

    highlighterRef.current = highlighter;
    return highlighter;
  }, [components, world]);

  const getElementTypesData = useCallback(async (): Promise<ElementData[]> => {
    return [
      {
        ElementType: "Wall",
        UnitOfMeasure: "m²",
        TotalAmountInProject: 100,
        TotalAmountInLevel: { "Level 1": 20, "Level 2": 30, "Level 3": 50 },
      },
      {
        ElementType: "Column",
        UnitOfMeasure: "m",
        TotalAmountInProject: 50,
        TotalAmountInLevel: { "Level 1": 15, "Level 2": 20, "Level 3": 15 },
      },
      {
        ElementType: "Slab",
        UnitOfMeasure: "m³",
        TotalAmountInProject: 75,
        TotalAmountInLevel: { "Level 1": 25, "Level 2": 25, "Level 3": 25 },
      },
    ];
  }, []);

  const getElementsOfType = useCallback(
    async (type: string): Promise<string[]> => {
      console.log(`Getting elements of type: ${type}`);
      return ["frag_1", "frag_2"];
    },
    []
  );

  const getElementsInLevel = useCallback(
    async (level: string): Promise<string[]> => {
      console.log(`Getting elements in level: ${level}`);
      return ["frag_3", "frag_4"];
    },
    []
  );

  const createElementQuantityTable = useCallback(() => {
    const highlighter = highlighterRef.current;
    if (!highlighter) {
      console.warn("Highlighter not initialized");
      return null;
    }

    const onCreated = (e?: Element) => {
      if (!e) return;
      const table = e as BUI.Table<ElementQuantityTableData>;

      table.loadFunction = async () => {
        const rawData = await getElementTypesData();
        const data: BUI.TableGroupData<ElementQuantityTableData>[] = [];

        for (const item of rawData) {
          const flatRow: ElementQuantityTableData = {
            ElementType: item.ElementType,
            UnitOfMeasure: item.UnitOfMeasure,
            TotalAmountInProject: item.TotalAmountInProject,
          };
          for (const level of exampleLevels) {
            flatRow[level.replace(" ", "")] =
              item.TotalAmountInLevel[level] || 0;
          }
          data.push({ data: flatRow });
        }

        return data;
      };

      table.addEventListener("row-click", async (event: any) => {
        const row = event.detail.row as ElementQuantityTableData;
        const elementType = row.ElementType;
        const ids = await getElementsOfType(elementType);
        const idSet = new Set(ids.map(Number));
        highlighter.highlightByID("default", { default: idSet });
      });

      table.addEventListener("column-header-click", async (event: any) => {
        const column = event.detail.column;
        if (exampleLevels.includes(column.name)) {
          const ids = await getElementsInLevel(column.name);
          const idSet = new Set(ids.map(Number));
          highlighter.highlightByID("default", { default: idSet });
        }
      });

      table.loadData(true);
    };

    const elementQuantityTable = BUI.Component.create<
      BUI.Table<ElementQuantityTableData>
    >(() => BUI.html`<bim-table ${BUI.ref(onCreated)}></bim-table>`);

    elementQuantityTable.style.maxHeight = "25rem";
    elementQuantityTable.style.width = "100%";
    elementQuantityTable.style.overflowY = "auto";
    elementQuantityTable.columns = [
      "ElementType",
      "UnitOfMeasure",
      "TotalAmountInProject",
      "Level1",
      "Level2",
      "Level3",
    ];
    elementQuantityTable.noIndentation = true;

    return elementQuantityTable;
  }, [getElementTypesData, getElementsOfType, getElementsInLevel]);

  const createQuantitiesPanel = useCallback(() => {
    const highlighter = highlighterRef.current;
    const elementQuantityTable = createElementQuantityTable();

    if (!elementQuantityTable || !highlighter) {
      console.warn("Cannot create quantities panel - missing dependencies");
      return null;
    }

    const onResetHighlight = async ({ target }: { target: BUI.Button }) => {
      target.loading = true;
      highlighter.clear("default");
      target.loading = false;
    };

    const panel = BUI.Component.create<BUI.PanelSection>(() => {
      return BUI.html`
        <bim-panel active label="Element Quantity Table" 
                   style="position: absolute; bottom: 10px; width: 95%; left: 50%; transform: translateX(-50%); z-index: 1000;">
          <bim-panel-section label="General">
            <bim-button label="Reset Highlight" @click=${onResetHighlight}></bim-button>
          </bim-panel-section>
          <bim-panel-section label="Quantities">
            ${elementQuantityTable}
          </bim-panel-section>
        </bim-panel>
      `;
    });

    return panel;
  }, [createElementQuantityTable]);

  return {
    createQuantitiesPanel,
    initializeHighlighter,
    getElementTypesData,
    getElementsOfType,
    getElementsInLevel,
    highlighter: highlighterRef.current,
  };
};
