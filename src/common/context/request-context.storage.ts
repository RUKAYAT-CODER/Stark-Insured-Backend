import { AsyncLocalStorage } from 'async_hooks';

/**
 * Este almacén permite que el Correlation ID sea accesible 
 * en cualquier parte del hilo de ejecución.
 */
export const requestContext = new AsyncLocalStorage<Map<string, any>>();