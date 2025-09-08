export interface ContextComponent {
  id: number;
  [key: string]: any;
}

export interface CheckedComponent {
  id: number;
  category: string;
  value: string;
}

import { buildContextComponents, formatCtxCompCategoryName, getFirstNonIdAttribute } from '../../../../shared/utils/utils';

/**
 * Estructura para mapear dimensiones y factores
 */
 interface DimensionsMap {
  [dimensionName: string]: {
    semantic: string;
    factors: {
      [factorName: string]: string; // factorName: semantic
    };
  };
}

export const dimensionsAndFactors: DimensionsMap = {
  "Accuracy": {
    "semantic": "Indicates the degree to which data is accurate. Refers to how well data correctly represents real-world objects or events.",
    "factors": {
      "Semantic Accuracy": "Indicates the degree to which data correctly represents real-world entities or states.",
      "Syntactic Accuracy": "Indicates the degree to which data conforms to expected structural formats, patterns, or data types.",
      "Precision": "Refers to the level of detail in which data is captured or expressed."
    }
  },
  "Completeness": {
    "semantic": "Refers to the availability of all necessary data, ensuring that no important data is missing for analysis or decision-making.",
    "factors": {
      "Density": "Describes the proportion of actual data entries compared to the total number of expected entries.",
      "Coverage": "Indicates the extent to which the data covers the required scope, domain, or entities."
    }
  },
  "Consistency": {
    "semantic": "Indicates the satisfaction of semantic rules defined on the data.",
    "factors": {
      "Domain Integrity": "Indicates whether individual attribute values comply with defined constraints, rules, or value domains.",
      "Intra-relationship Integrity": "Indicates whether values across multiple attributes within the same record or table satisfy logical rules or dependencies.",
      "Inter-relationship Integrity": "Indicates whether data relationships across different tables or entities satisfy expected referential and semantic rules."
    }
  },
  "Uniqueness": {
    "semantic": "Indicates the degree to which a real-world entity is represented only once in the information system, without duplication or contradiction.",
    "factors": {
      "No-duplication": "Indicates the absence of duplicate records within the dataset.",
      "No-contradiction": "Ensures that logically related records do not contain conflicting or contradictory information."
    }
  },
  "Freshness": {
    "semantic": "Refers to the temporal validity of the data, indicating how current, timely, or stable the data is with respect to its use and the real world.",
    "factors": {
      "Currency": "Indicates how up-to-date the data is with respect to the real-world entities or source systems it represents.",
      "Timeliness": "Indicates whether data is available in time to support its intended use.",
      "Volatility": "Describes the frequency or rate at which the data changes over time."
    }
  }
};

/**
 * Elimina factores y dimensiones que ya existen en el DQ Model actual
 * para evitar sugerir duplicados
 */
export const removeExistingFactorsFromSuggestions = (
  dimensionsInDQModel: Array<{
    dimension_name?: string;
    dimension?: { dimension_name: string };
    factors?: Array<{ factor_name: string }>;
  }>,
  availableDimensions: DimensionsMap
): DimensionsMap => {
  // Trabajamos sobre una copia para no modificar el original
  const filteredDimensions = JSON.parse(JSON.stringify(availableDimensions));
  const dimensionsToRemove: string[] = [];

  dimensionsInDQModel.forEach(dqModelDimension => {
    const dimensionName = dqModelDimension.dimension_name || 
                         dqModelDimension.dimension?.dimension_name;
    
    if (!dimensionName || !filteredDimensions[dimensionName]) return;

    const existingFactors = dqModelDimension.factors || [];

    // Eliminar factores que ya existen en el modelo
    existingFactors.forEach(factor => {
      delete filteredDimensions[dimensionName].factors[factor.factor_name];
    });

    // Marcar dimensiones vacías para remover
    if (Object.keys(filteredDimensions[dimensionName].factors).length === 0) {
      dimensionsToRemove.push(dimensionName);
    }
  });

  // Eliminar dimensiones sin factores
  dimensionsToRemove.forEach(dimName => {
    delete filteredDimensions[dimName];
  });

  return filteredDimensions;
};

/**
 * Convierte problemas a un formato {id: descripción} 
 */
export const convertProblemsToMap = (problems: Array<{
  dq_problem_id: number;
  description: string;
}>): Record<number, string> => {
  return problems.reduce((acc, problem) => {
    acc[problem.dq_problem_id] = problem.description;
    return acc;
  }, {} as Record<number, string>);
};

/**
 * Normaliza componentes de contexto para el payload
 */
export const abbreviateContextComponents = (contextComponents: any): any => {
  const abbreviated: any = {};

  // Mapeo de categorías completas a abreviadas
  const categoryMap: Record<string, string> = {
    applicationDomain: 'appDomain',
    businessRule: 'bizRule',
    dataFiltering: 'dataFilter',
    dqMetadata: 'dqMeta',
    dqRequirement: 'dqReq',
    otherData: 'otherData',
    otherMetadata: 'otherMeta',
    systemRequirement: 'sysReq',
    taskAtHand: 'task',
    userType: 'userType'
  };

  Object.entries(contextComponents).forEach(([category, components]) => {
    if (!components || !Array.isArray(components)) return;

    const abbrCategory = categoryMap[category];
    if (!abbrCategory) return;

    abbreviated[abbrCategory] = components.map((comp: any) => {
      switch (category) {
        case 'applicationDomain':
          return { n: comp.name, id: comp.id };

        case 'businessRule':
          return { s: comp.statement, id: comp.id, sem: comp.semantic };

        case 'dataFiltering':
          return {
            s: comp.statement,
            id: comp.id,
            desc: comp.description,
            task: comp.taskAtHandId
          };

        case 'dqMetadata':
          return {
            p: comp.path,
            id: comp.id,
            desc: comp.description,
            meas: comp.measuredMetrics
          };

        case 'dqRequirement':
          return {
            s: comp.statement,
            id: comp.id,
            desc: comp.description,
            dataFilterIds: comp.dataFilterIds,
            userTypeId: comp.userTypeId
          };

        case 'otherData':
          return {
            p: comp.path,
            id: comp.id,
            desc: comp.description,
            own: comp.owner
          };

        case 'otherMetadata':
          return {
            p: comp.path,
            id: comp.id,
            desc: comp.description,
            auth: comp.author,
            lastUpd: comp.lastUpdated
          };

        case 'systemRequirement':
          return {
            s: comp.statement,
            id: comp.id,
            desc: comp.description
          };

        case 'taskAtHand':
          return {
            n: comp.name,
            id: comp.id,
            purp: comp.purpose
          };

        case 'userType':
          return {
            n: comp.name,
            id: comp.id,
            char: comp.characteristics
          };

        default:
          return { id: comp.id, ...comp };
      }
    });
  });

  return abbreviated;
};

export const renameContextComponentCategories = (contextComponents: any): any => {
  const keyMap: { [key: string]: string } = {
    appDomain: 'applicationDomain',
    bizRule: 'businessRule',
    dataFilter: 'dataFiltering',
    dqMeta: 'dqMetadata',
    dqReq: 'dqRequirement',
    otherData: 'otherData',
    otherMeta: 'otherMetadata',
    sysReq: 'systemRequirement',
    task: 'taskAtHand',
    userType: 'userType'
  };

  const renamed: any = {};

  for (const shortKey in contextComponents) {
    const fullKey = keyMap[shortKey] || shortKey;
    renamed[fullKey] = contextComponents[shortKey];
  }

  return renamed;
}


export const expandContextComponents = (abbreviated: any): any => {
  const expanded: any = {};

  const keyMap: Record<string, string> = {
    appDomain: 'applicationDomain',
    bizRule: 'businessRule',
    dataFilter: 'dataFiltering',
    dqMeta: 'dqMetadata',
    dqReq: 'dqRequirement',
    otherData: 'otherData',
    otherMeta: 'otherMetadata',
    sysReq: 'systemRequirement',
    task: 'taskAtHand',
    userType: 'userType'
  };

  Object.entries(abbreviated).forEach(([shortKey, components]) => {
    if (!Array.isArray(components)) return;

    const fullKey = keyMap[shortKey];
    if (!fullKey) return;

    expanded[fullKey] = components.map((item: any) => {
      switch (shortKey) {
        case 'appDomain':
          return {
            id: item.id,
            name: item.n
          };

        case 'bizRule':
          return {
            id: item.id,
            statement: item.s,
            semantic: item.sem
          };

        case 'dataFilter':
          return {
            id: item.id,
            statement: item.s,
            description: item.desc,
            taskAtHandId: item.task
          };

        case 'dqMeta':
          return {
            id: item.id,
            path: item.p,
            description: item.desc,
            measuredMetrics: item.meas
          };

        case 'dqReq':
          return {
            id: item.id,
            statement: item.s,
            description: item.desc,
            dataFilterIds: item.dataFilterIds,
            userTypeId: item.userTypeId
          };

        case 'otherData':
          return {
            id: item.id,
            path: item.p,
            description: item.desc,
            owner: item.own
          };

        case 'otherMeta':
          return {
            id: item.id,
            path: item.p,
            description: item.desc,
            author: item.auth,
            lastUpdated: item.lastUpd
          };

        case 'sysReq':
          return {
            id: item.id,
            statement: item.s,
            description: item.desc
          };

        case 'task':
          return {
            id: item.id,
            name: item.n,
            purpose: item.purp
          };

        case 'userType':
          return {
            id: item.id,
            name: item.n,
            characteristics: item.char
          };

        default:
          return item; // Si no está mapeado, devolver el objeto tal cual
      }
    });
  });

  return expanded;
};


/**
 * Prepara el payload completo para la solicitud de sugerencias
 *//*
export const prepareSuggestionPayload = (
  contextComponents: any,
  problems: any[],
  dimensionsAndFactors: DimensionsMap
) => {
  return {
    dimensions_and_factors: removeExistingFactorsFromSuggestions(
      dimensionsInDQModel,
      dimensionsAndFactors
    ),
    dq_problems: convertProblemsToMap(problems),
    context_components: convertContextComponents(contextComponents)
  };
};*/

/**
 * Filtra sugerencias según configuración del usuario
 */
export const applySuggestionFilters = (
  dimensions: DimensionsMap,
  filters: {
    excludeAccuracy?: boolean;
    excludeCompleteness?: boolean;
    excludeConsistency?: boolean;
    excludeUniqueness?: boolean;
    excludeFreshness?: boolean;
  }
): DimensionsMap => {
  const filtered = {...dimensions};

  const dimensionsToExclude = [
    filters.excludeAccuracy && 'Accuracy',
    filters.excludeCompleteness && 'Completeness',
    filters.excludeConsistency && 'Consistency',
    filters.excludeUniqueness && 'Uniqueness',
    filters.excludeFreshness && 'Freshness'
  ].filter(Boolean);

  dimensionsToExclude.forEach(dimName => {
    delete filtered[dimName as string];
  });

  return filtered;
};


/**
 * Dada la lista de componentes disponibles y un objeto que mapea categoría a IDs de componentes,
 * devuelve los componentes marcados (checked) con su info básica.
 */
 export const getCheckedCtxComponentsFromSuggestion = (
  supportedByContext: Record<string, number[]>,
  allContextComponents: Record<string, ContextComponent[]>
): CheckedComponent[] => {
  const checkedComponents: CheckedComponent[] = [];

  for (const category in supportedByContext) {
    const ids: number[] = supportedByContext[category];
    const componentsInCategory = allContextComponents[category];
    if (!componentsInCategory) continue;

    ids.forEach(id => {
      const component = componentsInCategory.find(comp => comp.id === id);
      if (component) {
        checkedComponents.push({
          id: component.id,
          category,
          value: getFirstNonIdAttribute(component)
        });
      }
    });
  }

  return checkedComponents;
};

export const getCheckedDQProblemsFromSuggestion = (
  supportedProblemIds: number[],
  availableProblems: any[]
): any[] => {
  return supportedProblemIds
    .map(problemId => availableProblems.find(p => p.dq_problem_id === problemId))
    .filter(Boolean); // Filtra los undefined por si algún ID no matchea
};