import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  ROLES,
  ACTIONS,
  RESOURCES,
  isRoleAtLeast,
  getPermittedActions
} from '../../backend/src/modules/core/auth/permissions';

describe('RBAC Permissions Matrix', () => {
  describe('hasPermission', () => {
    it('owner should have full access to all resources', () => {
      expect(hasPermission(ROLES.OWNER, RESOURCES.CLIENTS, ACTIONS.CREATE)).toBe(true);
      expect(hasPermission(ROLES.OWNER, RESOURCES.CLIENTS, ACTIONS.READ)).toBe(true);
      expect(hasPermission(ROLES.OWNER, RESOURCES.CLIENTS, ACTIONS.UPDATE)).toBe(true);
      expect(hasPermission(ROLES.OWNER, RESOURCES.CLIENTS, ACTIONS.DELETE)).toBe(true);
      expect(hasPermission(ROLES.OWNER, RESOURCES.INVOICES, ACTIONS.DELETE)).toBe(true);
      expect(hasPermission(ROLES.OWNER, RESOURCES.SETTINGS, ACTIONS.DELETE)).toBe(true);
    });

    it('admin should have full access to most resources', () => {
      expect(hasPermission(ROLES.ADMIN, RESOURCES.CLIENTS, ACTIONS.CREATE)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, RESOURCES.INVOICES, ACTIONS.DELETE)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, RESOURCES.EMPLOYEES, ACTIONS.CREATE)).toBe(true);
    });

    it('manager should have limited delete access', () => {
      expect(hasPermission(ROLES.MANAGER, RESOURCES.CLIENTS, ACTIONS.DELETE)).toBe(true);
      expect(hasPermission(ROLES.MANAGER, RESOURCES.SETTINGS, ACTIONS.DELETE)).toBe(false);
    });

    it('sales should have CRM access but not finance delete', () => {
      expect(hasPermission(ROLES.SALES, RESOURCES.CLIENTS, ACTIONS.CREATE)).toBe(true);
      expect(hasPermission(ROLES.SALES, RESOURCES.CLIENTS, ACTIONS.UPDATE)).toBe(true);
      expect(hasPermission(ROLES.SALES, RESOURCES.CLIENTS, ACTIONS.DELETE)).toBe(false);
      expect(hasPermission(ROLES.SALES, RESOURCES.QUOTES, ACTIONS.CREATE)).toBe(true);
      expect(hasPermission(ROLES.SALES, RESOURCES.INVOICES, ACTIONS.DELETE)).toBe(false);
    });

    it('scheduler should have scheduling access', () => {
      expect(hasPermission(ROLES.SCHEDULER, RESOURCES.SCHEDULING, ACTIONS.CREATE)).toBe(true);
      expect(hasPermission(ROLES.SCHEDULER, RESOURCES.JOBS, ACTIONS.CREATE)).toBe(true);
      expect(hasPermission(ROLES.SCHEDULER, RESOURCES.CLIENTS, ACTIONS.READ)).toBe(true);
      expect(hasPermission(ROLES.SCHEDULER, RESOURCES.CLIENTS, ACTIONS.DELETE)).toBe(false);
    });

    it('crew should have limited read/update access', () => {
      expect(hasPermission(ROLES.CREW, RESOURCES.JOBS, ACTIONS.READ)).toBe(true);
      expect(hasPermission(ROLES.CREW, RESOURCES.JOBS, ACTIONS.UPDATE)).toBe(true);
      expect(hasPermission(ROLES.CREW, RESOURCES.JOBS, ACTIONS.CREATE)).toBe(false);
      expect(hasPermission(ROLES.CREW, RESOURCES.INVOICES, ACTIONS.READ)).toBe(false);
    });

    it('client should have no access to internal resources', () => {
      expect(hasPermission(ROLES.CLIENT, RESOURCES.CLIENTS, ACTIONS.READ)).toBe(false);
      expect(hasPermission(ROLES.CLIENT, RESOURCES.INVOICES, ACTIONS.READ)).toBe(false);
      expect(hasPermission(ROLES.CLIENT, RESOURCES.EMPLOYEES, ACTIONS.READ)).toBe(false);
    });

    it('should return false for unknown resources', () => {
      expect(hasPermission(ROLES.OWNER, 'unknown_resource', ACTIONS.READ)).toBe(false);
    });

    it('should return false for unknown roles', () => {
      expect(hasPermission('unknown_role', RESOURCES.CLIENTS, ACTIONS.READ)).toBe(false);
    });
  });

  describe('isRoleAtLeast', () => {
    it('owner should be at least any role', () => {
      expect(isRoleAtLeast(ROLES.OWNER, ROLES.OWNER)).toBe(true);
      expect(isRoleAtLeast(ROLES.OWNER, ROLES.ADMIN)).toBe(true);
      expect(isRoleAtLeast(ROLES.OWNER, ROLES.MANAGER)).toBe(true);
      expect(isRoleAtLeast(ROLES.OWNER, ROLES.CREW)).toBe(true);
    });

    it('admin should be at least manager or below', () => {
      expect(isRoleAtLeast(ROLES.ADMIN, ROLES.OWNER)).toBe(false);
      expect(isRoleAtLeast(ROLES.ADMIN, ROLES.ADMIN)).toBe(true);
      expect(isRoleAtLeast(ROLES.ADMIN, ROLES.MANAGER)).toBe(true);
    });

    it('crew should not be at least manager', () => {
      expect(isRoleAtLeast(ROLES.CREW, ROLES.MANAGER)).toBe(false);
      expect(isRoleAtLeast(ROLES.CREW, ROLES.CREW)).toBe(true);
    });
  });

  describe('getPermittedActions', () => {
    it('should return all actions for owner on clients', () => {
      const actions = getPermittedActions(ROLES.OWNER, RESOURCES.CLIENTS);
      expect(actions).toContain(ACTIONS.CREATE);
      expect(actions).toContain(ACTIONS.READ);
      expect(actions).toContain(ACTIONS.UPDATE);
      expect(actions).toContain(ACTIONS.DELETE);
      expect(actions).toContain(ACTIONS.LIST);
    });

    it('should return limited actions for crew on jobs', () => {
      const actions = getPermittedActions(ROLES.CREW, RESOURCES.JOBS);
      expect(actions).toContain(ACTIONS.READ);
      expect(actions).toContain(ACTIONS.UPDATE);
      expect(actions).not.toContain(ACTIONS.CREATE);
      expect(actions).not.toContain(ACTIONS.DELETE);
    });

    it('should return empty array for client on employees', () => {
      const actions = getPermittedActions(ROLES.CLIENT, RESOURCES.EMPLOYEES);
      expect(actions).toEqual([]);
    });
  });
});

describe('RBAC Role Constants', () => {
  it('should have all expected roles defined', () => {
    expect(ROLES.OWNER).toBe('owner');
    expect(ROLES.ADMIN).toBe('admin');
    expect(ROLES.MANAGER).toBe('manager');
    expect(ROLES.SALES).toBe('sales');
    expect(ROLES.SCHEDULER).toBe('scheduler');
    expect(ROLES.CREW).toBe('crew');
    expect(ROLES.CLIENT).toBe('client');
  });

  it('should have all expected actions defined', () => {
    expect(ACTIONS.CREATE).toBe('create');
    expect(ACTIONS.READ).toBe('read');
    expect(ACTIONS.UPDATE).toBe('update');
    expect(ACTIONS.DELETE).toBe('delete');
    expect(ACTIONS.LIST).toBe('list');
  });

  it('should have all expected resources defined', () => {
    expect(RESOURCES.CLIENTS).toBe('clients');
    expect(RESOURCES.PROPERTIES).toBe('properties');
    expect(RESOURCES.CONTACTS).toBe('contacts');
    expect(RESOURCES.LEADS).toBe('leads');
    expect(RESOURCES.QUOTES).toBe('quotes');
    expect(RESOURCES.JOBS).toBe('jobs');
    expect(RESOURCES.INVOICES).toBe('invoices');
    expect(RESOURCES.EMPLOYEES).toBe('employees');
    expect(RESOURCES.EQUIPMENT).toBe('equipment');
    expect(RESOURCES.SCHEDULING).toBe('scheduling');
    expect(RESOURCES.ANALYTICS).toBe('analytics');
    expect(RESOURCES.AI).toBe('ai');
    expect(RESOURCES.SETTINGS).toBe('settings');
  });
});
