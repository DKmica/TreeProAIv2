import { randomUUID } from 'crypto';

export const v4 = () => (typeof randomUUID === 'function' ? randomUUID() : 'mock-uuid');

export default { v4 };
