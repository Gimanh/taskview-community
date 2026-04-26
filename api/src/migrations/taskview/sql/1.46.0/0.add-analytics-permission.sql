insert into tv_auth.permissions (name, description, permission_group, description_locales)
values (
    'analytics_can_view',
    'User can view analytics for this goal',
    2,
    '{"en": "View analytics. User can view analytics dashboards and KPIs for this project.", "ru": "Просмотр аналитики. Пользователь может просматривать дашборды и KPI этого проекта."}'::jsonb
)
on conflict (name) do nothing;
