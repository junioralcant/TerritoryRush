import { Provider } from '../activities.types';
import { ProviderActivityGateway } from './provider-activity-gateway.port';

export const PROVIDER_GATEWAY_REGISTRY = Symbol('PROVIDER_GATEWAY_REGISTRY');

/**
 * Resolves the activity gateway for a provider. Built from each provider's
 * gateway so the ingestion worker stays provider-agnostic — adding Garmin needs
 * no pipeline change, only a new entry.
 */
export type ProviderGatewayRegistry = Map<Provider, ProviderActivityGateway>;
