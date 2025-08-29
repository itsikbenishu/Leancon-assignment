// טיפוס של שורות הטבלה
export type ElementQuantityTableData = {
  ElementType: string;
  UnitOfMeasure: string;
  TotalAmountInProject: number;
  [key: string]: string | number;
};

// טיפוס לנתוני אלמנט
export type ElementData = {
  ElementType: string;
  UnitOfMeasure: string;
  TotalAmountInProject: number;
  TotalAmountInLevel: { [level: string]: number };
};
