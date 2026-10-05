import { Database } from '../../modules/db';
import { $logger } from '../../modules/logget';

let tablesEnsured = false;

export async function ensureEnterpriseTables(): Promise<void> {
    if (tablesEnsured) return;

    const sql = `
    CREATE TABLE IF NOT EXISTS tasks.project_stagegates (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        goal_id integer NOT NULL REFERENCES tasks.goals(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        description varchar(2000) DEFAULT '',
        order_index integer NOT NULL DEFAULT 0,
        status varchar(50) NOT NULL DEFAULT 'not_started',
        gate_date timestamp,
        approved_at timestamp,
        approved_by integer REFERENCES tv_auth.users(id) ON DELETE SET NULL,
        rejection_reason varchar(2000),
        exit_criteria jsonb DEFAULT '[]'::jsonb,
        created_date timestamp DEFAULT NOW(),
        updated_date timestamp DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks.stagegate_approvals (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        stagegate_id integer NOT NULL REFERENCES tasks.project_stagegates(id) ON DELETE CASCADE,
        approver_id integer NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
        status varchar(50) NOT NULL DEFAULT 'pending',
        comments varchar(2000) DEFAULT '',
        decided_at timestamp,
        created_date timestamp DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks.stagegate_tasks (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        stagegate_id integer NOT NULL REFERENCES tasks.project_stagegates(id) ON DELETE CASCADE,
        task_id integer NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
        is_mandatory_exit_criterion boolean NOT NULL DEFAULT false,
        created_date timestamp DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks.strategic_objectives (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        organization_id integer NOT NULL REFERENCES tv_auth.organizations(id) ON DELETE CASCADE,
        title varchar(255) NOT NULL,
        description varchar(2000) DEFAULT '',
        target_year integer NOT NULL DEFAULT 2026,
        status varchar(50) NOT NULL DEFAULT 'on_track',
        owner_id integer REFERENCES tv_auth.users(id) ON DELETE SET NULL,
        target_date timestamp,
        weight integer NOT NULL DEFAULT 1,
        created_date timestamp DEFAULT NOW(),
        updated_date timestamp DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks.strategic_initiatives (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        objective_id integer NOT NULL REFERENCES tasks.strategic_objectives(id) ON DELETE CASCADE,
        organization_id integer NOT NULL REFERENCES tv_auth.organizations(id) ON DELETE CASCADE,
        title varchar(255) NOT NULL,
        description varchar(2000) DEFAULT '',
        lead_id integer REFERENCES tv_auth.users(id) ON DELETE SET NULL,
        start_date timestamp,
        target_date timestamp,
        status varchar(50) NOT NULL DEFAULT 'planning',
        budget double precision DEFAULT 0,
        created_date timestamp DEFAULT NOW(),
        updated_date timestamp DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks.initiative_projects (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        initiative_id integer NOT NULL REFERENCES tasks.strategic_initiatives(id) ON DELETE CASCADE,
        goal_id integer NOT NULL REFERENCES tasks.goals(id) ON DELETE CASCADE,
        created_date timestamp DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks.strategic_kpis (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        organization_id integer NOT NULL REFERENCES tv_auth.organizations(id) ON DELETE CASCADE,
        objective_id integer REFERENCES tasks.strategic_objectives(id) ON DELETE SET NULL,
        initiative_id integer REFERENCES tasks.strategic_initiatives(id) ON DELETE SET NULL,
        goal_id integer REFERENCES tasks.goals(id) ON DELETE SET NULL,
        title varchar(255) NOT NULL,
        description varchar(2000) DEFAULT '',
        target_value double precision NOT NULL DEFAULT 100,
        current_value double precision NOT NULL DEFAULT 0,
        unit varchar(50) NOT NULL DEFAULT '%',
        cadence varchar(50) NOT NULL DEFAULT 'quarterly',
        status varchar(50) NOT NULL DEFAULT 'green',
        history jsonb DEFAULT '[]'::jsonb,
        updated_date timestamp DEFAULT NOW(),
        created_date timestamp DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks.annual_planning_cycles (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        organization_id integer NOT NULL REFERENCES tv_auth.organizations(id) ON DELETE CASCADE,
        year integer NOT NULL,
        title varchar(255) NOT NULL,
        status varchar(50) NOT NULL DEFAULT 'intake_open',
        start_date timestamp,
        submission_deadline timestamp,
        total_capital_budget double precision DEFAULT 0,
        total_operating_budget double precision DEFAULT 0,
        created_date timestamp DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks.planning_proposals (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        cycle_id integer NOT NULL REFERENCES tasks.annual_planning_cycles(id) ON DELETE CASCADE,
        organization_id integer NOT NULL REFERENCES tv_auth.organizations(id) ON DELETE CASCADE,
        initiative_id integer REFERENCES tasks.strategic_initiatives(id) ON DELETE SET NULL,
        title varchar(255) NOT NULL,
        description varchar(2000) DEFAULT '',
        business_case varchar(4000) DEFAULT '',
        strategic_alignment_score integer NOT NULL DEFAULT 5,
        financial_score integer NOT NULL DEFAULT 5,
        risk_score integer NOT NULL DEFAULT 3,
        priority_score double precision DEFAULT 50,
        estimated_cost double precision DEFAULT 0,
        requested_budget double precision DEFAULT 0,
        sponsor_user_id integer REFERENCES tv_auth.users(id) ON DELETE SET NULL,
        status varchar(50) NOT NULL DEFAULT 'draft',
        converted_goal_id integer REFERENCES tasks.goals(id) ON DELETE SET NULL,
        created_date timestamp DEFAULT NOW(),
        updated_date timestamp DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks.erp_configurations (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        organization_id integer NOT NULL REFERENCES tv_auth.organizations(id) ON DELETE CASCADE,
        erp_system varchar(50) NOT NULL DEFAULT 'sap',
        api_url varchar(1000) DEFAULT '',
        api_key varchar(500) DEFAULT '',
        webhook_secret varchar(255) DEFAULT '',
        sync_frequency varchar(50) DEFAULT 'daily',
        is_enabled boolean NOT NULL DEFAULT true,
        last_sync_at timestamp,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_date timestamp DEFAULT NOW(),
        updated_date timestamp DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks.erp_budgets (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        goal_id integer NOT NULL REFERENCES tasks.goals(id) ON DELETE CASCADE,
        organization_id integer NOT NULL REFERENCES tv_auth.organizations(id) ON DELETE CASCADE,
        erp_cost_center varchar(100) NOT NULL DEFAULT 'CC-MAIN',
        erp_wbs_element varchar(100) NOT NULL DEFAULT 'WBS-001',
        fiscal_year integer NOT NULL DEFAULT 2026,
        allocated_budget double precision NOT NULL DEFAULT 0,
        committed_spend double precision NOT NULL DEFAULT 0,
        actual_spend double precision NOT NULL DEFAULT 0,
        currency varchar(10) NOT NULL DEFAULT 'USD',
        last_synced_at timestamp DEFAULT NOW(),
        updated_date timestamp DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks.erp_transactions (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        erp_budget_id integer NOT NULL REFERENCES tasks.erp_budgets(id) ON DELETE CASCADE,
        transaction_date timestamp NOT NULL DEFAULT NOW(),
        reference_doc varchar(100) NOT NULL,
        vendor varchar(255) DEFAULT '',
        amount double precision NOT NULL,
        transaction_type varchar(50) NOT NULL DEFAULT 'actual',
        description varchar(1000) DEFAULT '',
        created_date timestamp DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks.progress_report_cadences (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        organization_id integer NOT NULL REFERENCES tv_auth.organizations(id) ON DELETE CASCADE,
        goal_id integer NOT NULL REFERENCES tasks.goals(id) ON DELETE CASCADE,
        frequency varchar(50) NOT NULL DEFAULT 'weekly',
        day_of_week integer NOT NULL DEFAULT 5,
        hour_utc integer NOT NULL DEFAULT 14,
        reminder_channel varchar(50) NOT NULL DEFAULT 'in_app',
        is_active boolean NOT NULL DEFAULT true,
        last_reminder_sent_at timestamp,
        created_date timestamp DEFAULT NOW(),
        updated_date timestamp DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks.project_progress_reports (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        goal_id integer NOT NULL REFERENCES tasks.goals(id) ON DELETE CASCADE,
        reported_by integer NOT NULL REFERENCES tv_auth.users(id) ON DELETE CASCADE,
        report_date timestamp NOT NULL DEFAULT NOW(),
        overall_health varchar(50) NOT NULL DEFAULT 'green',
        stagegate_health varchar(50) NOT NULL DEFAULT 'green',
        budget_health varchar(50) NOT NULL DEFAULT 'green',
        schedule_health varchar(50) NOT NULL DEFAULT 'green',
        executive_summary varchar(4000) NOT NULL,
        key_accomplishments varchar(4000) DEFAULT '',
        next_period_plans varchar(4000) DEFAULT '',
        blockers_risks varchar(4000) DEFAULT '',
        created_date timestamp DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks.project_risks (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        organization_id integer NOT NULL REFERENCES tv_auth.organizations(id) ON DELETE CASCADE,
        goal_id integer REFERENCES tasks.goals(id) ON DELETE CASCADE,
        title varchar(255) NOT NULL,
        description varchar(2000) DEFAULT '',
        category varchar(50) NOT NULL DEFAULT 'operational',
        probability integer NOT NULL DEFAULT 3,
        impact integer NOT NULL DEFAULT 3,
        severity_score integer NOT NULL DEFAULT 9,
        status varchar(50) NOT NULL DEFAULT 'identified',
        response_strategy varchar(50) NOT NULL DEFAULT 'mitigate',
        mitigation_plan varchar(4000) DEFAULT '',
        contingency_plan varchar(4000) DEFAULT '',
        owner_user_id integer REFERENCES tv_auth.users(id) ON DELETE SET NULL,
        review_date timestamp,
        created_date timestamp DEFAULT NOW(),
        updated_date timestamp DEFAULT NOW()
    );
    `;

    try {
        const db = Database.getInstance();
        await db.query(sql);
        tablesEnsured = true;
        $logger.info('[Enterprise] Enterprise SPM and PPM tables ensured in database');
    } catch (err: any) {
        $logger.error('[Enterprise] Error ensuring enterprise tables:', err?.message || err);
    }
}
