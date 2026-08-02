export default `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8" />
    <meta name="format-detection" content="telephone=no" />
    <meta name="color-scheme" content="only" />
    <title>Приглашение в проект</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f7fa;">
        <tr>
            <td align="center" style="padding: 40px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);">
                    <tr>
                        <td style="padding: 40px 32px 24px; text-align: center;">
                            <div style="font-size: 18px; font-weight: 600; color: #000000; letter-spacing: 0.5px;">TaskView</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 32px 16px; text-align: center;">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #18181b;">Вас пригласили в проект</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 32px 28px; text-align: center;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #71717a;"><span style="font-weight: 600; color: #18181b;">{inviter}</span> приглашает вас присоединиться к проекту<br /><span style="font-weight: 600; color: #18181b;">{project}</span></p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 0 32px 28px;">
                            <a href="{link}" style="display: inline-block; padding: 12px 32px; background-color: #16a34a; border-radius: 8px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">Открыть проект</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 32px 32px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #a1a1aa;">Если кнопка не работает, скопируйте эту ссылку в браузер:<br /><a href="{link}" style="color: #16a34a; word-break: break-all;">{link}</a></p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 32px 40px; text-align: center; border-top: 1px solid #f4f4f5;">
                            <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #a1a1aa;">Вы получили это письмо, потому что вас пригласили в проект в TaskView. Если вы не ожидали приглашения, просто проигнорируйте это письмо.</p>
                        </td>
                    </tr>
                </table>
                <p style="margin: 24px 0 0; font-size: 12px; color: #a1a1aa; text-align: center;">© TaskView</p>
            </td>
        </tr>
    </table>
</body>
</html>`
