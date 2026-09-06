INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES (
    'billing_can_manage',
    'Manage invoices, clients and seller companies of the organization',
    6,
    '{
        "en": "Manage billing. Create and edit invoices, clients and seller companies of the organization.",
        "ru": "Управление биллингом. Создавать и редактировать инвойсы, клиентов и компании-продавцы организации.",
        "de": "Abrechnung verwalten. Rechnungen, Kunden und Firmen der Organisation erstellen und bearbeiten.",
        "es": "Gestionar facturación. Crear y editar facturas, clientes y empresas de la organización.",
        "pt-BR": "Gerenciar faturamento. Criar e editar faturas, clientes e empresas da organização."
    }'::jsonb
)
ON CONFLICT (name) DO NOTHING;
