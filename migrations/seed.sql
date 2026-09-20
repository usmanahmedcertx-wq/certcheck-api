-- Idempotent on purpose: Act 1 corrupts production data and asks you to
-- restore it by running this file again.
DELETE FROM requirement;
DELETE FROM audit;
DELETE FROM org;
DELETE FROM flag;

INSERT INTO org (id, name) VALUES
  (1, 'Northwind Manufacturing'),
  (2, 'Acme Rail');

INSERT INTO audit (id, org_id, title) VALUES
  (1, 1, 'ISO 27001:2022 surveillance'),
  (2, 1, 'ISO 9001:2015 recertification'),
  (3, 2, 'ISO 27001:2022 stage 1');

INSERT INTO requirement (audit_id, clause, text, status, note) VALUES
  (1, 'A.5.1',  'Policies for information security',            'compliant',     'Approved 2026-03-11'),
  (1, 'A.5.7',  'Threat intelligence',                          'non_compliant', 'No feed in place'),
  (1, 'A.5.15', 'Access control',                               'compliant',     NULL),
  (1, 'A.8.2',  'Privileged access rights',                     'unknown',       NULL),
  (1, 'A.8.8',  'Management of technical vulnerabilities',      'non_compliant', 'Scanner not scheduled'),
  (1, 'A.8.16', 'Monitoring activities',                        'unknown',       NULL),
  (1, 'A.5.23', 'Information security for use of cloud services','not_applicable','No cloud in scope'),
  (1, 'A.6.3',  'Information security awareness and training',  'compliant',     'Annual, last June'),
  (2, '4.1',    'Understanding the organization and its context','compliant',    NULL),
  (2, '7.1.5',  'Monitoring and measuring resources',           'unknown',       NULL),
  (2, '8.5.1',  'Control of production and service provision',  'compliant',     NULL),
  (2, '9.2',    'Internal audit',                               'non_compliant', 'Overdue by 4 months'),
  (3, 'A.5.1',  'Policies for information security',            'unknown',       NULL),
  (3, 'A.5.9',  'Inventory of information and other assets',    'unknown',       NULL),
  (3, 'A.8.1',  'User endpoint devices',                        'unknown',       NULL);

INSERT INTO flag (key, enabled, org_ids) VALUES
  ('ORG_AUDIT_CODES', 0, NULL),
  ('CSV_EXPORT',      0, NULL);
