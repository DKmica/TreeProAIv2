-- ============================================================================
-- TreePro AI - Form Templates Seed Data
-- Migration: 006_seed_form_templates.sql
-- Description: Seed common form templates for job operations
-- Created: 2024-11-09
-- ============================================================================

-- Pre-Job Safety Checklist
INSERT INTO form_templates (
  name, 
  description, 
  form_type, 
  fields,
  require_signature,
  is_active
) VALUES (
  'Pre-Job Safety Checklist',
  'Mandatory safety checklist to be completed before starting any tree work',
  'safety',
  '[
    {
      "id": "ppe_check",
      "type": "checkbox",
      "label": "All crew members wearing proper PPE (helmet, gloves, safety glasses, boots)",
      "required": true
    },
    {
      "id": "equipment_inspection",
      "type": "checkbox",
      "label": "All equipment inspected and in safe working condition",
      "required": true
    },
    {
      "id": "drop_zone",
      "type": "checkbox",
      "label": "Drop zone clearly marked and secured",
      "required": true
    },
    {
      "id": "traffic_control",
      "type": "checkbox",
      "label": "Traffic control measures in place (if applicable)",
      "required": false
    },
    {
      "id": "power_lines",
      "type": "select",
      "label": "Power line proximity status",
      "required": true,
      "options": ["No power lines nearby", "Power lines present - keeping safe distance", "Power company notified"]
    },
    {
      "id": "weather_conditions",
      "type": "select",
      "label": "Weather conditions",
      "required": true,
      "options": ["Clear and safe", "Marginal - monitoring", "Unsafe - work postponed"]
    },
    {
      "id": "emergency_plan",
      "type": "checkbox",
      "label": "Emergency action plan reviewed with crew",
      "required": true
    },
    {
      "id": "first_aid_kit",
      "type": "checkbox",
      "label": "First aid kit accessible on site",
      "required": true
    },
    {
      "id": "additional_hazards",
      "type": "textarea",
      "label": "Additional hazards identified",
      "required": false
    },
    {
      "id": "crew_leader_name",
      "type": "text",
      "label": "Crew Leader Name",
      "required": true
    },
    {
      "id": "checklist_date",
      "type": "date",
      "label": "Date",
      "required": true
    }
  ]'::jsonb,
  true,
  true
) ON CONFLICT DO NOTHING;

-- Tree Removal Inspection Form
INSERT INTO form_templates (
  name,
  description,
  form_type,
  fields,
  require_signature,
  require_photos,
  min_photos,
  is_active
) VALUES (
  'Tree Removal Inspection',
  'Detailed inspection form for tree removal assessment and documentation',
  'inspection',
  '[
    {
      "id": "tree_species",
      "type": "text",
      "label": "Tree Species",
      "required": true
    },
    {
      "id": "tree_height",
      "type": "number",
      "label": "Estimated Height (feet)",
      "required": true
    },
    {
      "id": "trunk_diameter",
      "type": "number",
      "label": "Trunk Diameter (inches)",
      "required": true
    },
    {
      "id": "tree_health",
      "type": "select",
      "label": "Tree Health Assessment",
      "required": true,
      "options": ["Healthy", "Declining", "Dead", "Hazardous"]
    },
    {
      "id": "decay_present",
      "type": "checkbox",
      "label": "Signs of decay or rot present",
      "required": false
    },
    {
      "id": "structural_defects",
      "type": "textarea",
      "label": "Structural defects noted",
      "required": false
    },
    {
      "id": "obstacles",
      "type": "textarea",
      "label": "Nearby obstacles (buildings, fences, utilities)",
      "required": true
    },
    {
      "id": "access_notes",
      "type": "textarea",
      "label": "Site access notes",
      "required": false
    },
    {
      "id": "recommended_equipment",
      "type": "textarea",
      "label": "Recommended equipment for removal",
      "required": true
    },
    {
      "id": "crew_size",
      "type": "number",
      "label": "Recommended crew size",
      "required": true
    },
    {
      "id": "estimated_duration",
      "type": "number",
      "label": "Estimated duration (hours)",
      "required": true
    },
    {
      "id": "special_precautions",
      "type": "textarea",
      "label": "Special precautions required",
      "required": false
    },
    {
      "id": "inspector_name",
      "type": "text",
      "label": "Inspector Name",
      "required": true
    },
    {
      "id": "inspection_date",
      "type": "date",
      "label": "Inspection Date",
      "required": true
    }
  ]'::jsonb,
  true,
  true,
  3,
  true
) ON CONFLICT DO NOTHING;

-- Equipment Check Form
INSERT INTO form_templates (
  name,
  description,
  form_type,
  fields,
  require_signature,
  is_active
) VALUES (
  'Equipment Check',
  'Daily equipment inspection and maintenance check',
  'equipment',
  '[
    {
      "id": "equipment_type",
      "type": "select",
      "label": "Equipment Type",
      "required": true,
      "options": ["Chainsaw", "Chipper", "Bucket Truck", "Stump Grinder", "Climbing Gear", "Other"]
    },
    {
      "id": "equipment_id",
      "type": "text",
      "label": "Equipment ID/Serial Number",
      "required": true
    },
    {
      "id": "visual_inspection",
      "type": "checkbox",
      "label": "Visual inspection completed - no visible damage",
      "required": true
    },
    {
      "id": "fluid_levels",
      "type": "checkbox",
      "label": "Fluid levels checked and adequate",
      "required": true
    },
    {
      "id": "safety_features",
      "type": "checkbox",
      "label": "All safety features functional",
      "required": true
    },
    {
      "id": "blade_chain_condition",
      "type": "select",
      "label": "Blade/Chain condition",
      "required": true,
      "options": ["Good - sharp", "Acceptable", "Needs sharpening", "Needs replacement"]
    },
    {
      "id": "operational_test",
      "type": "checkbox",
      "label": "Operational test passed",
      "required": true
    },
    {
      "id": "maintenance_needed",
      "type": "checkbox",
      "label": "Maintenance required",
      "required": false
    },
    {
      "id": "maintenance_notes",
      "type": "textarea",
      "label": "Maintenance notes/issues identified",
      "required": false
    },
    {
      "id": "hour_meter_reading",
      "type": "number",
      "label": "Hour meter reading",
      "required": false
    },
    {
      "id": "inspector_name",
      "type": "text",
      "label": "Inspector Name",
      "required": true
    },
    {
      "id": "inspection_date",
      "type": "date",
      "label": "Inspection Date",
      "required": true
    }
  ]'::jsonb,
  true,
  true
) ON CONFLICT DO NOTHING;

-- Customer Approval Form
INSERT INTO form_templates (
  name,
  description,
  form_type,
  fields,
  require_signature,
  require_photos,
  min_photos,
  is_active
) VALUES (
  'Customer Approval Form',
  'Customer sign-off and approval documentation for completed work',
  'approval',
  '[
    {
      "id": "customer_name",
      "type": "text",
      "label": "Customer Name",
      "required": true
    },
    {
      "id": "work_completed",
      "type": "textarea",
      "label": "Work completed description",
      "required": true
    },
    {
      "id": "customer_satisfaction",
      "type": "select",
      "label": "Customer satisfaction level",
      "required": true,
      "options": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"]
    },
    {
      "id": "work_quality",
      "type": "checkbox",
      "label": "Work completed to customer satisfaction",
      "required": true
    },
    {
      "id": "cleanup_complete",
      "type": "checkbox",
      "label": "Site cleanup completed",
      "required": true
    },
    {
      "id": "debris_removed",
      "type": "checkbox",
      "label": "All debris removed from property",
      "required": true
    },
    {
      "id": "property_condition",
      "type": "checkbox",
      "label": "Property left in good condition",
      "required": true
    },
    {
      "id": "additional_work_requested",
      "type": "textarea",
      "label": "Additional work requested by customer",
      "required": false
    },
    {
      "id": "customer_comments",
      "type": "textarea",
      "label": "Customer comments or concerns",
      "required": false
    },
    {
      "id": "crew_leader_name",
      "type": "text",
      "label": "Crew Leader Name",
      "required": true
    },
    {
      "id": "completion_date",
      "type": "date",
      "label": "Completion Date",
      "required": true
    }
  ]'::jsonb,
  true,
  true,
  2,
  true
) ON CONFLICT DO NOTHING;

-- Job Completion Checklist
INSERT INTO form_templates (
  name,
  description,
  form_type,
  fields,
  require_signature,
  require_photos,
  is_active
) VALUES (
  'Job Completion Checklist',
  'Internal checklist for job wrap-up and quality assurance',
  'completion',
  '[
    {
      "id": "all_work_completed",
      "type": "checkbox",
      "label": "All work items from quote completed",
      "required": true
    },
    {
      "id": "stumps_ground",
      "type": "checkbox",
      "label": "Stumps ground (if applicable)",
      "required": false
    },
    {
      "id": "wood_hauled",
      "type": "checkbox",
      "label": "Wood hauled away or stacked as requested",
      "required": true
    },
    {
      "id": "debris_removed",
      "type": "checkbox",
      "label": "All debris and branches removed",
      "required": true
    },
    {
      "id": "site_raked",
      "type": "checkbox",
      "label": "Work area raked and cleaned",
      "required": true
    },
    {
      "id": "equipment_removed",
      "type": "checkbox",
      "label": "All equipment removed from site",
      "required": true
    },
    {
      "id": "no_property_damage",
      "type": "checkbox",
      "label": "No damage to customer property",
      "required": true
    },
    {
      "id": "damage_notes",
      "type": "textarea",
      "label": "Property damage notes (if any)",
      "required": false
    },
    {
      "id": "safety_incidents",
      "type": "checkbox",
      "label": "Any safety incidents occurred",
      "required": false
    },
    {
      "id": "incident_details",
      "type": "textarea",
      "label": "Safety incident details",
      "required": false
    },
    {
      "id": "additional_services_sold",
      "type": "textarea",
      "label": "Additional services sold on site",
      "required": false
    },
    {
      "id": "crew_leader_name",
      "type": "text",
      "label": "Crew Leader Name",
      "required": true
    },
    {
      "id": "completion_date",
      "type": "date",
      "label": "Completion Date",
      "required": true
    }
  ]'::jsonb,
  true,
  true,
  true
) ON CONFLICT DO NOTHING;

-- Log successful seed
DO $$
BEGIN
  RAISE NOTICE 'Successfully seeded 5 form templates';
END $$;
