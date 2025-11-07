/**
 * Format a file entity ID
 * @param filePath Relative file path
 * @returns Entity ID (e.g., "src/app.ts")
 */
export function formatFileId(filePath: string): string {
  return filePath;
}

/**
 * Format a class entity ID
 * @param filePath Relative file path
 * @param className Class name
 * @returns Entity ID (e.g., "src/app.ts::AppModule")
 */
export function formatClassId(filePath: string, className: string): string {
  return `${filePath}::${className}`;
}

/**
 * Format a method entity ID
 * @param filePath Relative file path
 * @param className Class name
 * @param methodName Method name
 * @returns Entity ID (e.g., "src/app.ts::AppModule::configure")
 */
export function formatMethodId(
  filePath: string,
  className: string,
  methodName: string
): string {
  return `${filePath}::${className}::${methodName}`;
}

/**
 * Format a function entity ID
 * @param filePath Relative file path
 * @param functionName Function name
 * @returns Entity ID (e.g., "src/utils/helper.ts::formatDate")
 */
export function formatFunctionId(
  filePath: string,
  functionName: string
): string {
  return `${filePath}::${functionName}`;
}

/**
 * Format an interface entity ID
 * @param filePath Relative file path
 * @param interfaceName Interface name
 * @returns Entity ID (e.g., "src/types.ts::IUser")
 */
export function formatInterfaceId(
  filePath: string,
  interfaceName: string
): string {
  return `${filePath}::${interfaceName}`;
}

/**
 * Parse an entity ID into its components
 * @param entityId Entity ID string
 * @returns Parsed components
 */
export function parseEntityId(entityId: string): {
  filePath: string;
  className?: string;
  memberName?: string;
} {
  const parts = entityId.split('::');

  if (parts.length === 1) {
    // File only
    return { filePath: parts[0] };
  } else if (parts.length === 2) {
    // File and class/function/interface
    return {
      filePath: parts[0],
      className: parts[1]
    };
  } else if (parts.length === 3) {
    // File, class, and method
    return {
      filePath: parts[0],
      className: parts[1],
      memberName: parts[2]
    };
  }

  throw new Error(`Invalid entity ID format: ${entityId}`);
}
