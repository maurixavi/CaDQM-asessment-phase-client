// src/app/shared/utils/utils.ts

// src/app/utils/utils.ts

export function buildContextComponents(selectedComponents: { id: number; category: string; value: string }[]): any {
  const contextComponents = {
    applicationDomain: selectedComponents
      .filter((comp) => comp.category === "applicationDomain")
      .map((comp) => comp.id),
    businessRule: selectedComponents
      .filter((comp) => comp.category === "businessRule")
      .map((comp) => comp.id),
    dataFiltering: selectedComponents
      .filter((comp) => comp.category === "dataFiltering")
      .map((comp) => comp.id),
    dqMetadata: selectedComponents
      .filter((comp) => comp.category === "dqMetadata")
      .map((comp) => comp.id),
    dqRequirement: selectedComponents
      .filter((comp) => comp.category === "dqRequirement")
      .map((comp) => comp.id),
    otherData: selectedComponents
      .filter((comp) => comp.category === "otherData")
      .map((comp) => comp.id),
    otherMetadata: selectedComponents
      .filter((comp) => comp.category === "otherMetadata")
      .map((comp) => comp.id),
    systemRequirement: selectedComponents
      .filter((comp) => comp.category === "systemRequirement")
      .map((comp) => comp.id),
    taskAtHand: selectedComponents
      .filter((comp) => comp.category === "taskAtHand")
      .map((comp) => comp.id),
    userType: selectedComponents
      .filter((comp) => comp.category === "userType")
      .map((comp) => comp.id),
  };

  return contextComponents;
}

// Función para obtener las categorías de componentes de contexto
export function getContextComponentCategories(contextComponents: any): string[] {
  if (Array.isArray(contextComponents)) {
    const categories = new Set<string>();
    contextComponents.forEach((component) => categories.add(component.category));
    return Array.from(categories);
  } else {
    return Object.keys(contextComponents).filter(category => contextComponents[category].length > 0);
  }
}

// Función para formatear nombres de categorías
export function formatCategoryName(category: string): string {
  return category
    .replace(/([A-Z])/g, ' $1') // Separar camelCase
    .replace(/_/g, ' ') // Separar snake_case
    .trim() // Eliminar espacios al inicio y al final
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalizar cada palabra
    .join(' ');
}

// Método para formatear el nombre de la categoría
export function formatCtxCompCategoryName(category: string): string {
  // Reemplazar camelCase o snake_case con espacios
  const formatted = category
    .replace(/([A-Z])/g, ' $1') // Separar camelCase
    .replace(/_/g, ' ') // Separar snake_case
    .trim(); // Eliminar espacios al inicio y al final

  // Capitalizar la primera letra de cada palabra
  return formatted
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Función para obtener el primer atributo no 'id' de un objeto
export function getFirstNonIdAttribute(item: any): string {
  const keys = Object.keys(item);
  const firstNonIdKey = keys.find((key) => key !== 'id');
  return firstNonIdKey ? item[firstNonIdKey] : '';
}



export function formatAppliedTo(appliedTo: any): string {
  if (!appliedTo) return 'Not specified';
  
  // Si es un array de objetos
  if (Array.isArray(appliedTo)) {
    // Agrupar por table_name
    const tablesMap = new Map<string, string[]>();
    
    appliedTo.forEach(item => {
      if (!tablesMap.has(item.table_name)) {
        tablesMap.set(item.table_name, []);
      }
      tablesMap.get(item.table_name)?.push(item.column_name);
    });
    
    // Construir el string formateado
    let result = '';
    tablesMap.forEach((columns, tableName) => {
      result += `Table: ${tableName}\nColumns: ${columns.join(', ')}\n\n`;
    });
    
    return result.trim();
  }
  
  // Si es un solo objeto
  else if (typeof appliedTo === 'object') {
    return `Table: ${appliedTo.table_name}\nColumn: ${appliedTo.column_name}`;
  }
  
  // Si ya es un string
  return appliedTo;
}

export function getAppliedToDisplay(appliedTo: any): {tableName: string, columns: string[]}[] {
  if (!appliedTo) return [];
  
  if (Array.isArray(appliedTo)) {
    const tablesMap = new Map<string, string[]>();
    
    appliedTo.forEach(item => {
      if (!tablesMap.has(item.table_name)) {
        tablesMap.set(item.table_name, []);
      }
      tablesMap.get(item.table_name)?.push(item.column_name);
    });
    
    return Array.from(tablesMap.entries()).map(([tableName, columns]) => ({
      tableName,
      columns
    }));
  }
  
  return [{
    tableName: appliedTo.table_name,
    columns: [appliedTo.column_name]
  }];
}